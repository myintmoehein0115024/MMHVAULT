
/* MMHVAULT v4.7.0 — stable header interactions + robust bilingual content engine */
document.addEventListener('DOMContentLoaded',()=>{
  const h=document.querySelector('.site-header'), b=document.querySelector('.menu-toggle');
  if(b&&h)b.onclick=()=>{h.classList.toggle('menu-open');b.setAttribute('aria-expanded',h.classList.contains('menu-open'))};
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(x=>io.observe(x));
  if(h){
    const update=()=>h.classList.toggle('is-scrolled',window.scrollY>18);
    update(); window.addEventListener('scroll',update,{passive:true});
    const menu=h.querySelector('.menu-toggle'),links=h.querySelector('.links');
    if(menu&&links){
      links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{h.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}));
      document.addEventListener('click',e=>{if(h.classList.contains('menu-open')&&!h.contains(e.target)){h.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}});
    }
  }
});

/* Premium pointer glow for cards, where supported. */
document.querySelectorAll('.future-cell,.future-principle,.future-trust-panel,.future-command').forEach(c=>{
  c.addEventListener('pointermove',e=>{
    if(matchMedia('(pointer:coarse)').matches)return;
    const r=c.getBoundingClientRect();
    c.style.setProperty('--mx',((e.clientX-r.left)/r.width).toFixed(3));
    c.style.setProperty('--my',((e.clientY-r.top)/r.height).toFixed(3));
  });
});

(()=>{
  const T={
    'Home':'首页','Features':'功能','Security':'安全','Experience':'体验','About':'关于','Login':'登录',
    'PERSONAL WEALTH INTELLIGENCE · VERSION 4.3.0':'个人财富智能 · 版本 4.3.0',
    'SECURE TODAY · BRIGHTER TOMORROW':'今天守护安全 · 明天更加明亮',
    'PRODUCT ARCHITECTURE · VERSION 4.3.0':'产品架构 · 版本 4.3.0',
    'PRIVATE BY DESIGN · SECURITY':'以隐私为核心 · 安全',
    'THE WEALTH OPERATING LOOP':'财富运行闭环',
    'ABOUT MMHVAULT':'关于 MMHVAULT'
  };

  const buttons=[...document.querySelectorAll('.landing-lang button[data-lang]')];
  const saved=localStorage.getItem('mmhvault-language');
  let current=(saved==='zh'||saved==='en')?saved:'en';

  const translate=()=>{
    const zh=current==='zh';

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const value=zh ? el.getAttribute('data-zh') : el.getAttribute('data-i18n');
      if(value!==null) el.textContent=value;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      const value=zh ? el.getAttribute('data-zh-html') : el.getAttribute('data-i18n-html');
      if(value!==null) el.innerHTML=value;
    });

    // Keep legacy/stable header and any old mapped text bilingual.
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const skip=new Set();
    let n;
    while(n=walker.nextNode()){
      const p=n.parentElement;
      if(!p || p.closest('[data-i18n],[data-i18n-html],script,style,.landing-lang')) continue;
      const raw=n.nodeValue, key=raw.trim();
      if(!key || !T[key]) continue;
      const lead=(raw.match(/^\s*/)||[''])[0], trail=(raw.match(/\s*$/)||[''])[0];
      n.nodeValue=lead+(zh?T[key]:key)+trail;
    }

    document.querySelectorAll('[placeholder],[aria-label],[alt]').forEach(el=>{
      ['placeholder','aria-label','alt'].forEach(a=>{
        const v=el.getAttribute(a);
        if(v && T[v]) el.setAttribute(a,zh?T[v]:v);
      });
    });

    document.documentElement.lang=zh?'zh-CN':'en';
    const page=(location.pathname.split('/').pop()||'index').replace('.html','');
    const titles={
      index:['MMHVAULT · Personal Wealth Intelligence','MMHVAULT · 个人财富智能'],
      features:['MMHVAULT · Features','MMHVAULT · 功能'],
      security:['MMHVAULT · Security','MMHVAULT · 安全'],
      experience:['MMHVAULT · Experience','MMHVAULT · 体验'],
      about:['MMHVAULT · About','MMHVAULT · 关于']
    };
    document.title=(titles[page]||titles.index)[zh?1:0];

    buttons.forEach(b=>{
      const active=b.dataset.lang===current;
      b.classList.toggle('is-active',active);
      b.setAttribute('aria-pressed',String(active));
    });
  };

  buttons.forEach(b=>b.addEventListener('click',()=>{
    current=b.dataset.lang;
    localStorage.setItem('mmhvault-language',current);
    translate();
  }));
  translate();
})();
