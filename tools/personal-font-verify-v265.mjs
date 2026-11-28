// Read-only offline verification of an already assembled Personal font candidate.
// The manifest digest MUST come from the reviewed build, not the candidate directory.
// Verification does not install files, activate fonts, approve licensing or deploy.
import {createHash} from 'node:crypto';
import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const names=['lxgwwenkai','notosansmyanmar','notosanssc','notoserifmyanmar','notoserifsc','padauk','tharlon','zcoolqingkehuangyou'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function need(ok,message){if(!ok)throw new Error(message)}
function exactKeys(actual,expected,message){need(JSON.stringify([...actual].sort())===JSON.stringify([...expected].sort()),message)}
function dir(path){const st=lstatSync(path);need(st.isDirectory()&&!st.isSymbolicLink(),'not a regular directory: '+path)}
function read(path,limit){const st=lstatSync(path);need(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=limit,'invalid file: '+path);return readFileSync(path)}
function verified(path,hash,limit){need(/^[a-f0-9]{64}$/.test(hash),'invalid expected digest');const b=read(path,limit);need(sha(b)===hash,'digest mismatch: '+path);return b}
export function verifyBundle(root,expectedDigest){
 root=resolve(root);dir(root);
 exactKeys(readdirSync(root),['bundle.json','fonts.css','FONT-NOTICES.txt',...names],'unexpected root entries');
 const raw=verified(join(root,'bundle.json'),expectedDigest,2*1024*1024);
 const m=JSON.parse(raw);
 need(m.status==='isolated QA only; not approved for distribution','unexpected bundle status');
 need(m.stylesheet==='fonts.css'&&m.notices==='FONT-NOTICES.txt','invalid root paths');
 const css=verified(join(root,m.stylesheet),m.stylesheet_sha256,2*1024*1024).toString('utf8');
 verified(join(root,m.notices),m.notices_sha256,1024*1024);
 need(Array.isArray(m.candidates),'missing candidates');
 exactKeys(m.candidates.map(x=>x.candidate),names,'unexpected candidates');
 const expectedUrls=[],parts=[];let bytes=0,count=0;
 for(const c of m.candidates){
  const n=c.candidate,p=join(root,n);dir(p);
  need(c.license===n+'/OFL.txt'&&c.manifest===n+'/manifest.json'&&c.license_id==='OFL-1.1','invalid candidate metadata: '+n);
  const license=read(join(p,'OFL.txt'),65536);
  need(gitBlob(license)===c.license_git_blob,'license mismatch: '+n);
  const detail=JSON.parse(verified(join(p,'manifest.json'),c.manifest_sha256,4*1024*1024));
  need(detail.family===c.family&&detail.source_git_blob===c.source_git_blob&&detail.license_git_blob===c.license_git_blob,'manifest identity mismatch: '+n);
  need(Array.isArray(c.files)&&c.files.length>0&&c.files.length<=128,'invalid file count: '+n);
  const expected=detail.groups?detail.groups.map(g=>({file:g.file,sha256:g.sha256,bytes:g.bytes})):[{file:'font.woff2',sha256:detail.output_sha256,bytes:detail.output_bytes}];
  need(c.files.length===expected.length,'manifest file count mismatch: '+n);
  const local=[];
  for(const [i,f] of c.files.entries()){
   need(f.file===expected[i].file&&f.sha256===expected[i].sha256&&f.bytes===expected[i].bytes,'manifest file mismatch: '+n);
   need(f.file===(detail.groups?'part-'+i+'.woff2':'font.woff2'),'unexpected font filename: '+n);
   const b=verified(join(p,f.file),f.sha256,4*1024*1024);
   need(b.length===f.bytes&&b.subarray(0,4).toString()==='wOF2','invalid WOFF2: '+n);
   local.push(f.file);expectedUrls.push(n+'/'+f.file);bytes+=b.length;count++;
  }
  exactKeys(readdirSync(p),['OFL.txt','manifest.json','font.css',...local],'unexpected candidate entries: '+n);
  const localCSS=read(join(p,'font.css'),2*1024*1024).toString('utf8');
  need(JSON.stringify([...localCSS.matchAll(/src:url\("\.\/([^"]+)"\)/g)].map(x=>x[1]))===JSON.stringify(local),'local CSS mismatch: '+n);
  parts.push(localCSS.replaceAll('src:url("./','src:url("./'+n+'/'));
 }
 need(css===parts.join('\n'),'assembled CSS differs from candidate CSS');
 need(JSON.stringify([...css.matchAll(/src:url\("\.\/([^"]+)"\)/g)].map(x=>x[1]))===JSON.stringify(expectedUrls),'assembled CSS paths mismatch');
 return {status:'verified offline; not approved for distribution',manifest_sha256:expectedDigest,families:names.length,files:count,font_bytes:bytes};
}

if(process.argv.length===4){
 try{console.log(JSON.stringify(verifyBundle(process.argv[2],process.argv[3])))}catch(e){console.error(e.message);process.exitCode=1}
}else if(process.argv[1]?.endsWith('personal-font-verify-v265.mjs')){
 console.error('Usage: node personal-font-verify-v265.mjs <bundle-directory> <reviewed-manifest-sha256>');process.exitCode=1;
}
