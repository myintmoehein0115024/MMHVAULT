document.addEventListener("DOMContentLoaded",()=>{const h=document.querySelector(".site-header"),b=document.querySelector(".menu-toggle");if(b&&h)b.onclick=()=>{h.classList.toggle("menu-open");b.setAttribute("aria-expanded",h.classList.contains("menu-open"))};const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".reveal").forEach(x=>io.observe(x));});
/* v4.4.0 Global Landing Polish */
document.querySelectorAll('.feature-card,.security-card,.showcase-card').forEach(c=>{c.addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x);c.style.setProperty('--my',y);});});

/* v4.4.1 Responsive QA: shared header state + safe mobile navigation. */
document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-header');
  if(!header)return;
  const updateHeader=()=>header.classList.toggle('is-scrolled',window.scrollY>18);
  updateHeader();
  window.addEventListener('scroll',updateHeader,{passive:true});

  const menu=header.querySelector('.menu-toggle');
  const links=header.querySelector('.links');
  if(menu&&links){
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      header.classList.remove('menu-open');
      menu.setAttribute('aria-expanded','false');
    }));
    document.addEventListener('click',e=>{
      if(!header.classList.contains('menu-open'))return;
      if(!header.contains(e.target)){
        header.classList.remove('menu-open');
        menu.setAttribute('aria-expanded','false');
      }
    });
  }
});

/* v4.6.2 — Landing language switcher: match the Login pill exactly. Login page itself is intentionally untouched. */
(()=>{
  const translations={
    'Home':'首页','Features':'功能','Security':'安全','Experience':'体验','About':'关于','Login':'登录',
    'SECURE TODAY · BRIGHTER TOMORROW':'今天守护安全 · 明天更加明亮','Your wealth.':'你的财富。','One intelligent':'一个智能的','system.':'系统。',
    'A private financial command layer that transforms scattered money, assets and investments into one clear, connected picture — designed for the way your real life actually moves.':'一个私密的财务指挥中心，将分散的资金、资产与投资整合成清晰、连贯的全景视图，为真实生活中的每一次变化而设计。','Access MMHVAULT →':'进入 MMHVAULT →','Watch the system':'查看系统',
    'Every movement':'每一次变化','Your position':'你的财务位置','Assets & growth':'资产与增长','Your private vault':'你的私人金库','ONE SYSTEM · FIVE DIMENSIONS':'一个系统 · 五个维度',
    "Everything your financial life needs. Nothing it doesn't.":'满足财务生活所需的一切，不多不少。','Built as an intelligent ecosystem rather than a collection of dashboards. Each experience has a purpose, a visual language and a place inside your wider financial picture.':'它不是一组彼此分离的仪表盘，而是一个智能生态系统。每个体验都有自己的目的、视觉语言，并属于你完整财务全景的一部分。',
    '01 · TRACK':'01 · 追踪','02 · UNDERSTAND':'02 · 理解','03 · DECIDE':'03 · 决策','Capture the movement.':'记录每一次变化。','Transactions, transfers and everyday changes stay connected without turning your financial life into noise.':'交易、转账和日常变化始终保持连接，而不会让你的财务生活变得嘈杂。','See the signal behind the numbers.':'看见数字背后的信号。','Turn activity into perspective with a clearer view of cash, assets, momentum and your real position.':'把财务活动转化为清晰的视角，更准确地了解现金、资产、趋势和真实位置。','Move with more confidence.':'更有把握地行动。','Keep investments beside everyday finances so every next decision starts with context, not guesswork.':'让投资与日常财务放在一起，让每一次决策都建立在完整信息之上，而不是猜测。',
    'THE MMHVAULT APP':'MMHVAULT 应用','Your financial world, finally connected.':'你的财务世界，终于连接在一起。','From overview to transactions and investments, the product experience is designed as one premium workspace — calm, visual and intentionally connected.':'从总览到交易与投资，整个产品体验被设计成一个高级工作空间——平静、直观，并且有意识地保持连接。','Explore capabilities →':'探索功能 →','READY TO GET STARTED?':'准备开始了吗？','Take control of your financial future.':'掌控你的财务未来。','One private workspace. A clearer system. A brighter tomorrow.':'一个私密工作空间。一个更清晰的系统。一个更明亮的明天。','Enter MMHVAULT →':'进入 MMHVAULT →','Private · Intelligent · Built Around You':'私密 · 智能 · 围绕你而建',
    'PRODUCT CAPABILITIES · VERSION 4.3.0':'产品能力 · 版本 4.3.0','Everything your private wealth system needs.':'你的私人财富系统所需的一切。','MMHVAULT combines the essential layers of personal finance into a single intelligent workspace — from everyday movement to long-term assets.':'MMHVAULT 将个人财务的重要层面整合进一个智能工作空间——从日常变化到长期资产。','One connected command center.':'一个连接一体的指挥中心。','See cash flow, assets and growth without jumping between disconnected tools.':'无需在彼此割裂的工具之间切换，就能看见现金流、资产与增长。','Movement with context.':'看见变化背后的脉络。','Track what changed and why it matters.':'追踪发生了什么，以及它为什么重要。','01 · CASH FLOW':'01 · 现金流','See money in motion.':'看见资金流动。','Bring income, expenses and transfers into a clearer operating picture.':'将收入、支出和转账汇入更清晰的财务运行视图。','02 · INVESTMENTS':'02 · 投资','Keep growth visible.':'让增长清晰可见。','Assets belong beside your everyday financial reality, not somewhere else.':'资产应该与你的日常财务现实放在一起，而不是被分散在其他地方。','03 · INTELLIGENCE':'03 · 智能洞察','Turn data into direction.':'让数据指引方向。','Visual signals help you understand your position before making the next move.':'视觉化信号帮助你在下一步行动之前了解自己的财务位置。','DESIGNED AROUND CLARITY':'围绕清晰而设计','A premium system that feels calm under complexity.':'一个在复杂之中依然保持从容的高级系统。','Every interface is designed to reduce friction and make your financial picture easier to read, compare and understand.':'每个界面都旨在减少操作阻力，让你的财务全景更容易阅读、比较和理解。',
    'PRIVATE BY DESIGN · SECURITY':'以隐私为核心 · 安全','Your wealth deserves privacy.':'你的财富值得被保护。','Financial information is deeply personal. MMHVAULT is designed around controlled access, a private workspace and a calmer relationship with your own data.':'财务信息高度私密。MMHVAULT 围绕受控访问、私人工作空间以及更从容的数据管理体验而设计。','YOUR PRIVATE VAULT':'你的私人金库',"Security shouldn't feel like a feature. It should feel built in.":'安全不应该只是一个功能，而应该从一开始就融入系统。','From secure access to a more intentional workspace, the product experience keeps your information close to you and easy to control.':'从安全访问到更有秩序的工作空间，产品体验让你的信息始终掌握在自己手中，并且易于控制。','PRIVATE':'私密','Your workspace':'你的工作空间','SECURE':'安全','Controlled access':'受控访问','CONNECTED':'连接','One system':'一个系统','CONTROL IS CLARITY':'掌控就是清晰','Your financial life. Your private intelligence layer.':'你的财务生活。你的私人智能层。','MMHVAULT keeps the focus on ownership: a single place to understand what you have, what is changing and where you want to go next.':'MMHVAULT 始终以掌控权为核心：在一个地方了解你拥有的一切、正在发生的变化，以及下一步想去哪里。',
    'HOW MMHVAULT WORKS':'MMHVAULT 如何运作','Track. Understand. Decide. Grow.':'追踪。理解。决策。成长。','A focused journey that turns everyday financial activity into a clearer system for seeing your position and building what comes next.':'一条专注的路径，将日常财务活动转化为更清晰的系统，帮助你看见自己的位置并构建下一步。','01 · Track':'01 · 追踪','02 · Understand':'02 · 理解','03 · DECIDE':'03 · 决策','Make the next move clearer.':'让下一步更清晰。','Use your own financial picture as the starting point for smarter decisions.':'以自己的完整财务全景为起点，做出更明智的决策。','04 · GROW':'04 · 成长','Build around the future.':'围绕未来构建。','Keep progress visible and let the system evolve with your financial life.':'让进步清晰可见，让系统随着你的财务生活一起成长。','Clarity is compounding.':'清晰也会复利。','When your financial world becomes easier to understand, every next step becomes easier to own.':'当你的财务世界更容易理解，每一个下一步也会更容易掌控。','A LIVING SYSTEM':'一个持续成长的系统','More than numbers. A clearer relationship with your money.':'不只是数字。与你的财富建立更清晰的关系。','MMHVAULT is built to make the financial layer of life feel connected, visual and useful — not overwhelming.':'MMHVAULT 让生活中的财务层变得连接、直观且有用，而不是令人不知所措。','Start your journey →':'开始你的旅程 →',
    'ABOUT MMHVAULT':'关于 MMHVAULT','More than wealth. A brighter tomorrow.':'不只是财富。一个更明亮的明天。','MMHVAULT began with a simple belief: managing your money should help you understand your life — not just stare at more numbers.':'MMHVAULT 始于一个简单的信念：管理财富应该帮助你理解自己的生活，而不只是盯着更多数字。','OUR STORY':'我们的故事','Progress starts with clarity.':'进步始于清晰。','Financial information is everywhere, but perspective is rare. MMHVAULT brings the things that matter into one private system designed to help you understand where you are and decide where to go next.':'财务信息无处不在，但真正的视角很稀缺。MMHVAULT 将重要信息汇聚到一个私密系统中，帮助你理解自己在哪里，并决定下一步去哪里。','Version 4.3.0 is a stronger foundation for a product that keeps evolving around real financial lives.':'Version 4.3.0 为一个持续围绕真实财务生活成长的产品奠定了更坚实的基础。','01 · CLARITY':'01 · 清晰','Over complexity.':'拒绝复杂。','Keep the important things visible and the experience intentionally calm.':'让重要信息清晰可见，让体验始终保持从容。','02 · OWNERSHIP':'02 · 掌控','Your world, your control.':'你的世界，你的掌控。','A private workspace built around your financial reality and your decisions.':'一个围绕你的财务现实与决策而建立的私人工作空间。','03 · PROGRESS':'03 · 进步','Over perfection.':'拒绝完美主义。','The system is here to help you see where you are and keep moving forward.':'这个系统帮助你看清当前位置，并持续向前。','THE MMHVAULT PRINCIPLE':'MMHVAULT 的原则','Financial clarity changes everything.':'财务清晰，改变一切。','Build a clearer picture today. Give tomorrow a better starting point.':'今天建立更清晰的全景，为明天提供更好的起点。'
  };

  const buttons=[...document.querySelectorAll('.landing-lang button[data-lang]')];
  if(!buttons.length)return;
  const textNodes=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode()){
    if(node.parentElement.closest('.landing-lang,script,style'))continue;
    const key=node.nodeValue.trim();
    if(key)textNodes.push({node,key});
  }
  const setLanguage=(lang,save=true)=>{
    const zh=lang==='zh';
    textNodes.forEach(item=>{
      const value=zh?(translations[item.key]||item.key):item.key;
      item.node.nodeValue=item.node.nodeValue.replace(item.node.nodeValue.trim(),value);
    });
    document.documentElement.lang=zh?'zh-CN':'en';
    const page=(location.pathname.split('/').pop()||'index').replace('.html','');
    const titles={index:['MMHVAULT · Personal Wealth Intelligence','MMHVAULT · 个人财富智能'],features:['MMHVAULT · Features','MMHVAULT · 功能'],security:['MMHVAULT · Security','MMHVAULT · 安全'],experience:['MMHVAULT · Experience','MMHVAULT · 体验'],about:['MMHVAULT · About','MMHVAULT · 关于']};
    document.title=(titles[page]||titles.index)[zh?1:0];
    buttons.forEach(btn=>{const active=btn.dataset.lang===lang;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
    if(save)localStorage.setItem('mmhvault-language',lang);
  };
  buttons.forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.lang)));
  const saved=localStorage.getItem('mmhvault-language');
  setLanguage(saved==='zh'||saved==='en'?saved:'en',false);
})();
