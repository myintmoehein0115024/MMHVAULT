document.addEventListener("DOMContentLoaded",()=>{const h=document.querySelector(".site-header"),b=document.querySelector(".menu-toggle");if(b&&h)b.onclick=()=>{h.classList.toggle("menu-open");b.setAttribute("aria-expanded",h.classList.contains("menu-open"))};const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".reveal").forEach(x=>io.observe(x));});

/* v4.4.0 Global Landing Polish */
document.querySelectorAll('.feature-card,.security-card,.showcase-card').forEach(c=>{c.addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x);c.style.setProperty('--my',y);});});

/* v4.4.1 Responsive QA: shared header state + safe mobile navigation. */
document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-header');
  if(!header)return;
  const updateHeader=()=>header.classList.toggle('is-scrolled',window.scrollY>18);
  updateHeader(); window.addEventListener('scroll',updateHeader,{passive:true});
  const menu=header.querySelector('.menu-toggle'),links=header.querySelector('.links');
  if(menu&&links){
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}));
    document.addEventListener('click',e=>{if(header.classList.contains('menu-open')&&!header.contains(e.target)){header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}});
  }
});

/* MMHVAULT Landing v4.5.2 — bilingual language system polish.
   Keeps the existing page markup and images untouched. */
(function(){
  const I18N={
    "Home":"首页","Features":"功能","Security":"安全","Experience":"体验","About":"关于","Login":"登录",
    "SECURE ACCESS · VERSION 4.0":"安全访问 · VERSION 4.0","Welcome Back":"欢迎回来","Create Your Vault":"创建你的 Vault","Access your private MMHVAULT workspace":"进入你的私密 MMHVAULT 工作空间","Start your private wealth workspace":"开始你的私人财富工作空间","🔒 Sign In":"🔒 登录","✦ Sign Up":"✦ 注册","Email address":"邮箱地址","Email":"邮箱","Menu":"菜单","PERSONAL WEALTH INTELLIGENCE · VERSION 4.0":"个人财富智能 · VERSION 4.0","Secure Access · Version 4.0":"安全访问 · VERSION 4.0","Password":"密码","Full name":"姓名","Create password":"创建密码","Your name":"你的姓名","I agree to the terms":"我同意相关条款","Login":"登录","Show":"显示","Hide":"隐藏","Remember me":"记住我","Forgot password?":"忘记密码？","Show":"显示","Hide":"隐藏","Remember me":"记住我","Forgot password?":"忘记密码？","Sign In →":"登录 →","Sign In &nbsp; →":"登录 &nbsp; →","or continue with":"或使用以下方式继续","Continue with Google":"使用 Google 继续","Don't have an account?":"还没有账户？","Sign Up":"注册","Full name":"姓名","Your name":"你的姓名","Create password":"创建密码","Create a password":"创建密码","I agree to the terms":"我同意相关条款","Create Account &nbsp; →":"创建账户 &nbsp; →","Already have an account?":"已经有账户？","SECURE ACCESS":"安全访问","Sending reset email…":"正在发送重置邮件…","Password reset email sent. Please check your inbox.":"密码重置邮件已发送，请检查收件箱。","Enter your email first, then try again.":"请先输入邮箱，再重试。","Authentication service is unavailable.":"身份验证服务不可用。","Authentication service is unavailable. Please refresh.":"身份验证服务不可用，请刷新页面。","Opening Google sign-in…":"正在打开 Google 登录…","Signing in…":"正在登录…","Creating your account…":"正在创建账户…","Incorrect email or password.":"邮箱或密码错误。","Please agree to the terms.":"请同意相关条款。","Account created. Please check your email to confirm your account.":"账户已创建，请检查邮箱完成确认。" ,
    "SECURE TODAY · BRIGHTER TOMORROW":"今天更安全 · 明天更明亮",
    "Your wealth.":"你的财富。","One intelligent":"一个智能的","system.":"系统。",
    "A private financial command layer that transforms scattered money, assets and investments into one clear, connected picture — designed for the way your real life actually moves.":"一个私密的财务指挥中心，将分散的资金、资产与投资整合成清晰、连贯的全景视图，为真实生活中的每一次变化而设计。",
    "Access MMHVAULT →":"进入 MMHVAULT →","Watch the system":"查看系统",
    "TRACK":"追踪","Every movement":"每一次变化","UNDERSTAND":"理解","Your position":"你的财务位置","INVEST":"投资","Assets & growth":"资产与增长","SECURE":"安全","Your private vault":"你的私人金库",
    "ONE SYSTEM · FIVE DIMENSIONS":"一个系统 · 五个维度","Everything your financial life needs. Nothing it doesn't.":"你的财务生活所需的一切，仅此而已。",
    "Built as an intelligent ecosystem rather than a collection of dashboards. Each experience has a purpose, a visual language and a place inside your wider financial picture.":"它不是一堆彼此割裂的仪表盘，而是一套智能生态。每一种体验都有明确目的、统一视觉语言，并服务于你的整体财务全景。",
    "01 · TRACK":"01 · 追踪","Capture the movement.":"捕捉资金变化。","Transactions, transfers and everyday changes stay connected without turning your financial life into noise.":"交易、转账与日常变化保持连接，同时避免让你的财务生活变得杂乱。",
    "02 · UNDERSTAND":"02 · 理解","See the signal behind the numbers.":"看见数字背后的信号。","Turn activity into perspective with a clearer view of cash, assets, momentum and your real position.":"把日常活动转化为洞察，更清晰地看见现金、资产、趋势与真实财务位置。",
    "03 · DECIDE":"03 · 决策","Move with more confidence.":"更有把握地行动。","Keep investments beside everyday finances so every next decision starts with context, not guesswork.":"让投资与日常财务保持在一起，让每一次下一步决策都有完整背景，而不是靠猜测。",
    "THE MMHVAULT APP":"MMHVAULT APP","Your financial world, finally connected.":"你的财务世界，终于真正连接起来。","From overview to transactions and investments, the product experience is designed as one premium workspace — calm, visual and intentionally connected.":"从总览到交易与投资，整个产品体验被设计成一个高级工作空间——平静、直观，并且有意识地保持连接。","Explore capabilities →":"探索功能 →",
    "READY TO GET STARTED?":"准备开始了吗？","Take control of your financial future.":"掌控你的财务未来。","One private workspace. A clearer system. A brighter tomorrow.":"一个私密工作空间。一套更清晰的系统。一个更明亮的明天。","Enter MMHVAULT →":"进入 MMHVAULT →",
    "Private · Intelligent · Built Around You":"私密 · 智能 · 为你而生",
    "PRODUCT CAPABILITIES · VERSION 4.3.0":"产品能力 · VERSION 4.3.0","Everything your private wealth system needs.":"你的私人财富系统所需要的一切。","MMHVAULT combines the essential layers of personal finance into a single intelligent workspace — from everyday movement to long-term assets.":"MMHVAULT 将个人财务的核心层面整合进一个智能工作空间——从日常资金变化到长期资产管理。","One connected command center.":"一个连接一切的指挥中心。","See cash flow, assets and growth without jumping between disconnected tools.":"无需在彼此割裂的工具之间切换，即可看见现金流、资产与增长。","Movement with context.":"带着背景理解变化。","Track what changed and why it matters.":"追踪发生了什么，以及它为什么重要。",
    "01 · CASH FLOW":"01 · CASH FLOW","See money in motion.":"看见资金流动。","Bring income, expenses and transfers into a clearer operating picture.":"把收入、支出与转账整合成更清晰的财务运行全景。","02 · INVESTMENTS":"02 · INVESTMENTS","Keep growth visible.":"让增长保持可见。","Assets belong beside your everyday financial reality, not somewhere else.":"资产应该与你的日常财务现实放在一起，而不是被分散到别处。","03 · INTELLIGENCE":"03 · INTELLIGENCE","Turn data into direction.":"让数据指引方向。","Visual signals help you understand your position before making the next move.":"直观的信号帮助你在下一步行动前理解自己的财务位置。",
    "DESIGNED AROUND CLARITY":"围绕清晰而设计","A premium system that feels calm under complexity.":"一套在复杂之中依然保持平静的高级系统。","Every interface is designed to reduce friction and make your financial picture easier to read, compare and understand.":"每一个界面都旨在减少摩擦，让你的财务全景更容易阅读、比较与理解。",
    "PRIVATE BY DESIGN · SECURITY":"以隐私为设计核心 · SECURITY","Your wealth deserves privacy.":"你的财富值得被保护。","Financial information is deeply personal. MMHVAULT is designed around controlled access, a private workspace and a calmer relationship with your own data.":"财务信息高度私密。MMHVAULT 围绕受控访问、私密工作空间以及更从容的数据管理体验而设计。","YOUR PRIVATE VAULT":"你的私人金库","Security shouldn't feel like a feature. It should feel built in.":"安全不应该像一个额外功能，而应该从一开始就融入系统。","From secure access to a more intentional workspace, the product experience keeps your information close to you and easy to control.":"从安全访问到更有秩序的工作空间，产品体验让你的信息始终掌握在自己手中，并且易于控制。","Your workspace":"你的工作空间","Controlled access":"受控访问","One system":"一个系统","CONTROL IS CLARITY":"掌控就是清晰","Your financial life. Your private intelligence layer.":"你的财务生活。你的私人智能层。","MMHVAULT keeps the focus on ownership: a single place to understand what you have, what is changing and where you want to go next.":"MMHVAULT 始终强调所有权：在一个地方看清你拥有的一切、正在发生的变化，以及下一步想去哪里。",
    "HOW MMHVAULT WORKS":"MMHVAULT 如何运作","Track. Understand. Decide. Grow.":"追踪。理解。决策。增长。","A focused journey that turns everyday financial activity into a clearer system for seeing your position and building what comes next.":"一条专注的路径，将日常财务活动转化为更清晰的系统，让你看见当前位置，并构建下一步。","01 · Track":"01 · 追踪","Capture what is moving across your financial world.":"捕捉财务世界中正在发生的变化。","02 · Understand":"02 · 理解","See the picture behind the activity.":"看见活动背后的全貌。","Make the next move clearer.":"让下一步更清晰。","Use your own financial picture as the starting point for smarter decisions.":"以自己的财务全景为起点，做出更明智的决定。","04 · GROW":"04 · 增长","Build around the future.":"围绕未来构建。","Keep progress visible and let the system evolve with your financial life.":"让进步保持可见，让系统与你的财务生活一起成长。","Clarity is compounding.":"清晰会产生复利。","When your financial world becomes easier to understand, every next step becomes easier to own.":"当你的财务世界变得更容易理解，每一个下一步也会更容易掌控。",
    "A LIVING SYSTEM":"一个持续成长的系统","More than numbers. A clearer relationship with your money.":"不只是数字。与你的财富建立更清晰的关系。","MMHVAULT is built to make the financial layer of life feel connected, visual and useful — not overwhelming.":"MMHVAULT 让生活中的财务层变得连接、直观且真正有用，而不是令人不知所措。","Start your journey →":"开始你的旅程 →",
    "ABOUT MMHVAULT":"关于 MMHVAULT","More than wealth. A brighter tomorrow.":"不只是财富。更明亮的明天。","MMHVAULT began with a simple belief: managing your money should help you understand your life — not just stare at more numbers.":"MMHVAULT 始于一个简单的信念：管理金钱应该帮助你理解自己的生活，而不只是盯着更多数字。","OUR STORY":"我们的故事","Progress starts with clarity.":"进步始于清晰。","Financial information is everywhere, but perspective is rare. MMHVAULT brings the things that matter into one private system designed to help you understand where you are and decide where to go next.":"财务信息无处不在，但真正的视角很稀缺。MMHVAULT 将重要信息汇聚到一个私密系统中，帮助你理解自己在哪里，并决定下一步去哪里。","Version 4.3.0 is a stronger foundation for a product that keeps evolving around real financial lives.":"Version 4.3.0 为一个持续围绕真实财务生活成长的产品奠定了更坚实的基础。","01 · CLARITY":"01 · CLARITY","Over complexity.":"超越复杂。","Keep the important things visible and the experience intentionally calm.":"让重要信息始终可见，并让体验保持克制与平静。","02 · OWNERSHIP":"02 · OWNERSHIP","Your world, your control.":"你的世界，由你掌控。","A private workspace built around your financial reality and your decisions.":"围绕你的财务现实与决定打造的私密工作空间。","03 · PROGRESS":"03 · PROGRESS","Over perfection.":"超越完美。","The system is here to help you see where you are and keep moving forward.":"这个系统帮助你看清当前位置，并持续向前。","THE MMHVAULT PRINCIPLE":"MMHVAULT 原则","Financial clarity changes everything.":"财务清晰度改变一切。","Build a clearer picture today. Give tomorrow a better starting point.":"今天建立更清晰的全景，为明天提供更好的起点。",
    "© 2026 MMHVAULT · Version 4.3.0":"© 2026 MMHVAULT · 版本 4.3.0",
    "MMHVAULT PERSONAL WEALTH INTELLIGENCE · VERSION 4.3.0":"MMHVAULT 个人财富智能 · VERSION 4.3.0"
  };
  const ATTRS=['title','aria-label','placeholder','alt'];
  function current(){return localStorage.getItem('mmhvault-landing-lang')==='zh'?'zh':'en'}
  function remember(node,raw){if(node.__mmhOriginal===undefined)node.__mmhOriginal=raw}
  function replaceNode(node,zh){
    const raw=node.nodeValue,trim=raw.replace(/\s+/g,' ').trim();
    if(!trim)return;
    if(zh){const val=I18N[trim];if(val){remember(node,trim);node.nodeValue=raw.replace(trim,val)}}
    else if(node.__mmhOriginal){node.nodeValue=raw.replace(trim,node.__mmhOriginal)}
  }
  function walk(root,zh){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
    while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)||p.closest('.mmh-lang-switcher'))return;replaceNode(n,zh)})
  }
  function attrs(zh){
    document.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(el=>{
      if(el.closest('.mmh-lang-switcher'))return;
      ATTRS.forEach(a=>{if(!el.hasAttribute(a))return;const value=el.getAttribute(a);el.__mmhAttrs=el.__mmhAttrs||{};el.__mmhAttrs[a]=el.__mmhAttrs[a]||value;const next=zh?I18N[value]:el.__mmhAttrs[a];if(next)el.setAttribute(a,next)})
    });
  }
  function apply(){
    const zh=current()==='zh';
    document.documentElement.lang=zh?'zh-CN':'en';
    document.documentElement.classList.toggle('lang-zh',zh);
    if(!document.body)return;
    walk(document.body,zh); attrs(zh);
    const titles={'MMHVAULT · Personal Wealth Intelligence':'MMHVAULT · 个人财富智能','MMHVAULT · Features':'MMHVAULT · 功能','MMHVAULT · Security':'MMHVAULT · 安全','MMHVAULT · Experience':'MMHVAULT · 体验','MMHVAULT · About':'MMHVAULT · 关于'};
    if(!document.__mmhTitle)document.__mmhTitle=document.title;
    if(location.pathname.endsWith('/login.html')){
      document.title=zh?'MMHVAULT — 安全访问 · VERSION 4.0':document.__mmhTitle;
    }else{
      document.title=zh?(titles[document.__mmhTitle]||document.__mmhTitle):document.__mmhTitle;
    }
    document.querySelectorAll('.mmh-lang-switcher button').forEach(b=>{const active=b.dataset.lang===(zh?'zh':'en');b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false')});
  }
  function addSwitcher(){
    const h=document.querySelector('.site-header, .shell > header');if(!h||h.querySelector('.mmh-lang-switcher'))return;
    const box=document.createElement('div');box.className='mmh-lang-switcher';box.setAttribute('role','group');box.setAttribute('aria-label','Language / 语言');
    if(h.classList.contains('shell')||h.parentElement?.classList.contains('shell')){
      if(!document.getElementById('mmh-login-lang-style')){const st=document.createElement('style');st.id='mmh-login-lang-style';st.textContent='.shell>header .mmh-lang-switcher{display:inline-flex;align-items:center;gap:3px;margin-left:18px;padding:3px;border:1px solid rgba(212,169,77,.22);border-radius:999px;background:rgba(7,15,28,.56);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);order:3}.shell>header .mmh-lang-switcher button{appearance:none;border:0;background:transparent;color:rgba(226,232,240,.66);font:700 10px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:7px 9px;border-radius:999px;cursor:pointer}.shell>header .mmh-lang-switcher button.active{color:#111827;background:linear-gradient(135deg,#f4d37c,#c6922d)}@media(max-width:820px){.shell>header .mmh-lang-switcher{order:2;margin-left:auto;margin-right:8px}.shell>header .toplogin{order:4}}@media(max-width:520px){.shell>header .mmh-lang-switcher button{min-width:34px;padding:7px 7px}}';document.head.appendChild(st)}
    }
    box.innerHTML='<button type="button" data-lang="en" aria-label="English">EN</button><button type="button" data-lang="zh" aria-label="中文">中文</button>';
    box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('mmhvault-landing-lang',b.dataset.lang);apply();window.dispatchEvent(new CustomEvent('mmhvault-language-changed'))}));
    const login=h.querySelector('.header-login, .toplogin'); if(login)login.parentNode.insertBefore(box,login); else h.appendChild(box);
  }
  window.applyMMHVAULTLanguage=apply;window.addEventListener('mmhvault-language-changed',apply);function init(){addSwitcher();apply()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* v4.5.5 — Landing + Login bilingual polish, responsive header, reliable mobile navigation. */
(function(){
  const style=document.createElement('style');
  style.id='mmh-v455-style';
  style.textContent=`
    /* Login desktop: keep navigation centered and actions grouped at the far right. */
    .shell>header{display:flex;align-items:center;gap:0}
    .shell>header nav{margin-left:auto}
    .shell>header .toplogin{order:2;margin-left:28px;flex:0 0 auto}
    .shell>header .mmh-lang-switcher{order:3;margin-left:10px;margin-right:0;flex:0 0 auto}
    .shell>header .menu-toggle{order:4;flex:0 0 auto}
    @media(max-width:900px){
      .shell>header{position:relative}
      .shell>header .brand{order:1;flex:0 0 auto}
      .shell>header nav{order:5}
      .shell>header .mmh-lang-switcher{order:2;margin-left:auto;margin-right:8px}
      .shell>header .menu-toggle{order:3;display:inline-flex;flex:0 0 auto}
      .shell>header .toplogin{order:4;display:none}
      .shell>header nav{display:none}
      .shell>header.menu-open nav{display:flex;position:absolute;top:calc(100% + 10px);right:0;left:0;z-index:50;flex-direction:column;gap:0;padding:10px;border:1px solid rgba(212,169,77,.18);border-radius:18px;background:rgba(6,17,29,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .shell>header.menu-open nav a{padding:13px 14px}
    }
    @media(max-width:520px){
      .shell>header .mmh-lang-switcher{margin-right:7px}
      .shell>header .mmh-lang-switcher button{min-width:34px;padding:7px 7px}
      .shell>header .menu-toggle{width:54px;height:54px;border-radius:17px}
    }
    /* Keep the language control outside the mobile menu and visually grouped with the hamburger. */
    .site-header .mmh-lang-switcher{flex:0 0 auto}
  `;
  document.head.appendChild(style);

  function closeMenu(header,btn){
    header.classList.remove('menu-open');
    if(btn)btn.setAttribute('aria-expanded','false');
  }
  function bindLoginMenu(){
    const header=document.querySelector('.shell>header');
    if(!header)return;
    let btn=header.querySelector('.menu-toggle');
    if(!btn){
      btn=document.createElement('button');
      btn.className='menu-toggle';
      btn.type='button';
      btn.setAttribute('aria-label','Menu');
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML='<span></span><span></span><span></span>';
      header.appendChild(btn);
    }
    if(btn.__mmhBound)return;
    btn.__mmhBound=true;
    btn.addEventListener('click',()=>{
      const open=header.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded',open?'true':'false');
    });
    const nav=header.querySelector('nav');
    if(nav){
      nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu(header,btn)));
    }
    document.addEventListener('click',e=>{
      if(header.classList.contains('menu-open')&&!header.contains(e.target))closeMenu(header,btn);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(header,btn)});
  }
  function init(){
    if(location.pathname.endsWith('/login.html'))bindLoginMenu();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* v4.5.5 — exact Login translations that are intentionally mapped separately from page prose. */
(function(){
  const loginMap={
    'Sign In':'登录','Sign Up':'注册','🔒 Sign In':'🔒 登录','✦ Sign Up':'✦ 注册',
    'Email':'邮箱','Email address':'邮箱地址','Password':'密码','Full name':'姓名','Your name':'你的姓名',
    'Create password':'创建密码','Create a password':'创建密码','Remember me':'记住我','Forgot password?':'忘记密码?',
    'Show':'显示','Hide':'隐藏','or continue with':'或使用以下方式继续','Continue with Google':'使用 Google 继续',
    "Don't have an account?":"还没有账户？",'Already have an account?':'已经有账户？',
    'Create Account':'创建账户','Home':'首页','Features':'功能','Security':'安全','Experience':'体验','About':'关于','Login':'登录',
    'Private · Intelligent · Built Around You':'私密 · 智能 · 为你而生',
    'PERSONAL WEALTH INTELLIGENCE · VERSION 4.0':'个人财富智能 · VERSION 4.0',
    'SECURE ACCESS · VERSION 4.0':'安全访问 · VERSION 4.0',
    'Welcome Back':'欢迎回来','Create Your Vault':'创建你的 Vault',
    'Access your private MMHVAULT workspace':'进入你的私密 MMHVAULT 工作空间',
    'Start your private wealth workspace':'开始你的私人财富工作空间',
    'I agree to the terms':'我同意相关条款',
    'Sign In  →':'登录  →','Sign In →':'登录 →','Create Account  →':'创建账户  →','Create Account →':'创建账户 →',
    'or continue with':'或使用以下方式继续','Menu':'菜单'
  };
  function translateNode(node,zh){
    if(!node||!node.nodeValue)return;
    const raw=node.nodeValue,trim=raw.replace(/\s+/g,' ').trim();
    if(!trim)return;
    node.__mmhLoginOriginal=node.__mmhLoginOriginal??raw;
    if(zh){
      const v=loginMap[trim];
      if(v)node.nodeValue=raw.replace(trim,v);
    }else if(node.__mmhLoginOriginal!==undefined){
      node.nodeValue=node.__mmhLoginOriginal;
    }
  }
  function applyLoginLanguage(){
    if(!location.pathname.endsWith('/login.html'))return;
    const zh=localStorage.getItem('mmhvault-landing-lang')==='zh';
    document.documentElement.lang=zh?'zh-CN':'en';
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)||p.closest('.mmh-lang-switcher'))return;translateNode(n,zh)});
    document.querySelectorAll('input[placeholder],button[aria-label],a[aria-label],img[alt]').forEach(el=>{
      const attr=el.hasAttribute('placeholder')?'placeholder':el.hasAttribute('aria-label')?'aria-label':'alt';
      if(!attr||el.closest('.mmh-lang-switcher'))return;
      const key='__mmhLoginAttr_'+attr;
      if(el[key]===undefined)el[key]=el.getAttribute(attr);
      const orig=el[key];el.setAttribute(attr,zh?(loginMap[orig]||orig):orig);
    });
    const titleOrig=document.title;
    if(!document.__mmhLoginTitle)document.__mmhLoginTitle=titleOrig;
    document.title=zh?'MMHVAULT — 安全访问 · VERSION 4.0':document.__mmhLoginTitle;
  }
  window.addEventListener('mmhvault-language-changed',applyLoginLanguage);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyLoginLanguage);else applyLoginLanguage();
})();

/* MMHVAULT v4.5.7 — exact header parity + robust Login bilingual UI. */
(function(){
  function zh(){return localStorage.getItem('mmhvault-landing-lang')==='zh'}
  function setText(el,en,cn){if(!el)return;el.textContent=zh()?cn:en}
  function applyLoginUI(){
    if(!location.pathname.endsWith('/login.html'))return;
    document.documentElement.lang=zh()?'zh-CN':'en';
    const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
    setText(q('.shell>header .header-login, .shell>header .toplogin'),'Login','登录');
    qa('.shell>header nav a')[0]&&setText(qa('.shell>header nav a')[0],'Home','首页');
    qa('.shell>header nav a')[1]&&setText(qa('.shell>header nav a')[1],'Features','功能');
    qa('.shell>header nav a')[2]&&setText(qa('.shell>header nav a')[2],'Security','安全');
    qa('.shell>header nav a')[3]&&setText(qa('.shell>header nav a')[3],'Experience','体验');
    qa('.shell>header nav a')[4]&&setText(qa('.shell>header nav a')[4],'About','关于');
    const signup=q('#signup'),signin=q('#signin');
    setText(q('.kicker'),'SECURE ACCESS · VERSION 4.0','安全访问 · VERSION 4.0');
    const title=q('#title'),sub=q('#subtitle');
    if(signup&&signup.classList.contains('active')){setText(title,'Create Your Vault','创建你的 Vault');setText(sub,'Start your private wealth workspace','开始你的私人财富工作空间')}
    else {setText(title,'Welcome Back','欢迎回来');setText(sub,'Access your private MMHVAULT workspace','进入你的私密 MMHVAULT 工作空间')}
    const tabs=qa('.tab'); if(tabs[0])setText(tabs[0],'🔒 Sign In','🔒 登录'); if(tabs[1])setText(tabs[1],'✦ Sign Up','✦ 注册');
    if(signin){
      const labels=qa('#signin label'); if(labels[0])setText(labels[0],'Email','邮箱'); if(labels[1])setText(labels[1],'Password','密码');
      const inputs=qa('#signin input'); if(inputs[0])inputs[0].placeholder=zh()?'邮箱地址':'Email address'; if(inputs[1])inputs[1].placeholder=zh()?'密码':'Password';
      const eye=q('#signin .eye');setText(eye,'Show','显示');
      const remember=q('#signin .remember'); if(remember){const cb=remember.querySelector('input');remember.textContent='';if(cb)remember.appendChild(cb);remember.appendChild(document.createTextNode(zh()?' 记住我':' Remember me'))}
      setText(q('#forgotBtn'),'Forgot password?','忘记密码？');setText(q('#signin .primary'),'Sign In  →','登录  →');setText(q('#signin .divider'),'or continue with','或使用以下方式继续');setText(q('#googleSignIn'),'Continue with Google','使用 Google 继续');
      const sw=q('#signin .switch');if(sw){sw.textContent='';sw.append(document.createTextNode(zh()?'还没有账户？ ':'Don\'t have an account? '));const btn=sw.querySelector('button')||document.createElement('button');btn.type='button';btn.dataset.switch='signup';btn.textContent=zh()?'注册':'Sign Up';sw.append(btn)}
    }
    if(signup){
      const labels=qa('#signup label'); if(labels[0])setText(labels[0],'Full name','姓名'); if(labels[1])setText(labels[1],'Email','邮箱'); if(labels[2])setText(labels[2],'Create password','创建密码');
      const inputs=qa('#signup input'); if(inputs[0])inputs[0].placeholder=zh()?'你的姓名':'Your name'; if(inputs[1])inputs[1].placeholder=zh()?'邮箱地址':'Email address'; if(inputs[2])inputs[2].placeholder=zh()?'创建密码':'Create a password';
      const eye=q('#signup .eye');setText(eye,'Show','显示');
      const terms=q('#terms')?.parentElement;if(terms){const cb=terms.querySelector('input');terms.textContent='';if(cb)terms.appendChild(cb);terms.appendChild(document.createTextNode(zh()?' 我同意相关条款':' I agree to the terms'))}
      setText(q('#signup .primary'),'Create Account  →','创建账户  →');setText(q('#signup .divider'),'or continue with','或使用以下方式继续');setText(q('#googleSignUp'),'Continue with Google','使用 Google 继续');
      const sw=q('#signup .switch');if(sw){sw.textContent='';sw.append(document.createTextNode(zh()?'已经有账户？ ':'Already have an account? '));const btn=sw.querySelector('button')||document.createElement('button');btn.type='button';btn.dataset.switch='signin';btn.textContent=zh()?'登录':'Sign In';sw.append(btn)}
    }
    setText(q('footer span:last-child'),'Private · Intelligent · Built Around You','私密 · 智能 · 为你而生');
    const menu=q('.menu-toggle');if(menu)menu.setAttribute('aria-label',zh()?'菜单':'Menu');
    document.title=zh()?'MMHVAULT — 安全访问 · VERSION 4.0':'MMHVAULT — Secure Access · Version 4.0';
  }
  window.addEventListener('mmhvault-language-changed',applyLoginUI);
  document.addEventListener('DOMContentLoaded',()=>{
    if(!location.pathname.endsWith('/login.html'))return;
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setTimeout(applyLoginUI,0)));
    document.querySelectorAll('[data-switch]').forEach(b=>b.addEventListener('click',()=>setTimeout(applyLoginUI,0)));
    applyLoginUI();
  });
})();
