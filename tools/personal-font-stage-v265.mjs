// Explicitly approved phase-one local staging only. No network, git add,
// commit, push, deployment or activation marker changes. Run on the Personal branch.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,lstatSync,mkdtempSync,readFileSync,realpathSync,renameSync,rmSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const branch='personal/v2.0.65-settings-v2';
const revision='5026800714d07231937d92eb4cceabf06e05d74e';
const lxRevision='f4cc16fa07f7d115135d203065e711d43c3076d3';
const review={
 notosansmyanmar:['a7af8e405d24076f2930c0840523110b3236560b','c94c47416f38b8ddec9f3fbc9e0241998d7823dc','MMH Personal Myanmar A',[]],
 notoserifmyanmar:['86adf96a587b326f5961b9550d54029608bdc760','94d1bf7b52481343e2983fb7751e8b7abe1ea07b','MMH Personal Myanmar B',[]],
 padauk:['a6882fbb2177bec0271a0b10821a33100efe1fc7','57410e8e9eb58b0cce938440696cf36e2daf8fcf','MMH Personal Myanmar C',['Padauk','Namkio','Deemawso']],
 tharlon:['d3840f3ccd173b3da87e0ed476d33027ad880490','6ef7b18ea7f5b430f10160034ecdcd0295335954','MMH Personal Myanmar D',['Yunghkio','Arimo','TharLon']],
 notosanssc:['fb0637bafbcd804fe32152370a1225990745b4bc','1c9f43281b8f216c5461fe9ac729afbade7724e4','MMH Personal Chinese A',['Source']],
 notoserifsc:['eab063faf229160a52d3760f5555150e4eb9e5bf','94d1bf7b52481343e2983fb7751e8b7abe1ea07b','MMH Personal Chinese B',[]],
 zcoolqingkehuangyou:['982a3b80143268592f573feb196791fbc2330e17','bd3df5cf6f237a4afaea70106f8243da07cd8cd8','MMH Personal Chinese C',[]],
 lxgwwenkai:['7f8f031dc5c6c5ba1913d93c36d4667c1e311cea','bb1634cb03ee7202d5c66bf2754705493bd73e1e','MMH Personal Chinese D',['霞鹜','霞鶩','落霞孤鹜','落霞孤鶩','LXGW']]
};
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
const sha=b=>createHash('sha256').update(b).digest('hex');
export function checkApprovedSources(m){
 need(Array.isArray(m.candidates)&&m.candidates.length===8,'eight approved sources required');
 const seen=new Set();
 for(const c of m.candidates){
  const n=c.candidate;
  need(Object.hasOwn(review,n)&&!seen.has(n),'unapproved or duplicate candidate');seen.add(n);
  const [source,license,family,reserved]=review[n],lx=n==='lxgwwenkai';
  need(c.source_git_blob===source&&c.license_git_blob===license&&c.family===family&&c.license_id==='OFL-1.1','reviewed identity mismatch: '+n);
  need(c.source_repository===(lx?'lxgw/LxgwWenKai':'google/fonts')&&c.source_revision===(lx?lxRevision:revision),'reviewed revision mismatch: '+n);
  need(JSON.stringify(c.reserved_source_names)===JSON.stringify(reserved),'reserved-name metadata mismatch: '+n);
 }
 return true;
}
function main(){
 const [mode,input,digest]=process.argv.slice(2);
 need(process.argv.length===5&&['--plan','--stage-approved-eight'].includes(mode)&&input&&/^[a-f0-9]{64}$/.test(digest||''),'usage: --plan|--stage-approved-eight <bundle> <reviewed-manifest-sha256>');
 const root=realpathSync(join(dirname(fileURLToPath(import.meta.url)),'..'));
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
 need(git('rev-parse','--show-toplevel')===root&&git('branch','--show-current')===branch,'Personal development checkout required');
 const source=realpathSync(input);
 need(source!==root&&!source.startsWith(root+sep),'external isolated bundle required');
 const manifest=readFileSync(join(source,'bundle.json'));
 need(sha(manifest)===digest,'reviewed manifest digest mismatch');
 checkApprovedSources(JSON.parse(manifest));
 const verify=path=>JSON.parse(execFileSync(process.execPath,[join(root,'tools/personal-font-verify-v265.mjs'),path,digest],{encoding:'utf8',timeout:30000}));
 const summary=verify(source);
 const assets=join(root,'assets'),target=join(assets,'personal-fonts-v265');
 need(lstatSync(assets).isDirectory()&&!lstatSync(assets).isSymbolicLink(),'regular assets directory required');
 need(!existsSync(target),'font target already exists');
 if(mode==='--plan'){console.log(JSON.stringify({...summary,target,action:'plan only; nothing installed'}));return}
 need(!git('status','--porcelain'),'clean development checkout required');
 const temp=mkdtempSync(join(assets,'.personal-font-stage-'));
 try{
  const staged=join(temp,'bundle');
  cpSync(source,staged,{recursive:true,errorOnExist:true,force:false});
  verify(staged);
  need(!existsSync(target),'font target appeared during staging');
  renameSync(staged,target);
  console.log(JSON.stringify({...summary,target,action:'staged in local working tree; no commit, push or activation'}));
 }finally{rmSync(temp,{recursive:true,force:true})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error(e.message);process.exitCode=1}
}
