/* MMHVAULT Landing L1.0 — public presentation only.
   No auth integration, no third-party network requests, no session/token access.
   Storage is limited to the landing page's display language preference. */
(() => {
  'use strict';
  const strings = {
    en: {
      skip: 'Skip to content',
      navHome: 'Home', navFeatures: 'Features', navAbout: 'About', navSecurity: 'Security',
      signIn: 'Sign In', getStarted: 'Get Started',
      heroEyebrow: 'YOUR MONEY. YOUR DIRECTION.',
      heroTitle: 'A smarter, more <em>intentional</em> financial life.',
      heroLead: 'Make sense of your accounts, spending, investments and future plans — all within one considered personal workspace.',
      heroChinese: '让财务更清晰，让未来更有方向。',
      exploreFeatures: 'Explore Features', heroFoot: 'Built for clarity, not complexity.',
      concept: 'CONCEPT UI', goodMorning: 'GOOD MORNING', demoOverview: 'Your financial overview',
      demoBalance: 'TOTAL BALANCE', demoCashflow: '+ $2,720.00 net cash flow this month',
      demoIncome: 'INCOME', demoExpenses: 'EXPENSES', demoTrend: 'Cash flow trend', demoMonthly: 'MONTHLY',
      demoDisclaimer: 'Illustrative interface · All amounts are fictional example data',
      bandFirst: 'UNDERSTAND TODAY', bandSecond: 'PLAN TOMORROW', bandThird: 'MOVE WITH PURPOSE',
      featuresEyebrow: 'ONE PERSONAL WORKSPACE', featuresTitle: 'Everything in view.<br>Nothing out of reach.',
      featuresLead: 'From daily transactions to the bigger picture, explore the tools that help you make more informed financial decisions.',
      featureDashboard: 'A considered snapshot of balances, activity and your overall financial position.',
      featureTransactions: 'Keep your income and expenses organized with clear, searchable records.',
      featureAccounts: 'Bring your different accounts and currencies into a single, orderly view.',
      featureInvest: 'Follow your holdings and allocations in a more balanced portfolio view.',
      featureAnalyze: 'Turn financial history into useful trends, reports and context.',
      comingSoon: 'COMING SOON',
      featureLife: 'A future home for schedules, habits, goals and a more intentional everyday life.',
      featureNote: 'Interface visuals are illustrative concepts, not live account screenshots. All amounts are invented for demonstration.',
      whyEyebrow: 'THE MMHVAULT APPROACH', whyTitle: 'Clarity is a<br><em>quiet advantage.</em>',
      whyLead: 'Money management feels better when information has room to breathe. MMHVAULT is designed to put the details in their place — and your goals back at the center.',
      benefit1Title: 'Personal Finance Clarity', benefit1Desc: 'See the important numbers without unnecessary noise.',
      benefit2Title: 'All-in-One Workspace', benefit2Desc: 'Bring related money decisions into one experience.',
      benefit3Title: 'Private Financial Management', benefit3Desc: 'A personal space built around your own financial records.',
      benefit4Title: 'Long-Term Perspective', benefit4Desc: 'Look beyond the next transaction toward bigger goals.',
      benefit5Title: 'Multi-Device Experience', benefit5Desc: 'A responsive experience across phone, tablet and desktop.',
      benefit6Title: 'English & Chinese', benefit6Desc: 'Explore the workspace in the language that suits you.',
      securityEyebrow: 'DESIGNED WITH PRIVACY IN MIND', securityTitle: 'Your finances deserve a considered space.',
      securityLead: 'MMHVAULT uses account-based sign-in and user-scoped access controls for personal finance records. Sign-in and recovery happen in the existing secure access flow — never on this public landing page.',
      securityPoint1: 'Account-based access', securityPoint2: 'Private workspace boundaries', securityPoint3: 'No banking credentials requested',
      securityLearn: 'Read security information',
      closingEyebrow: 'MAKE ROOM FOR WHAT MATTERS', closingTitle: 'A clearer picture.<br><em>A more deliberate future.</em>',
      closingLead: 'The next chapter of your financial life starts with understanding where you stand.',
      closingCta: 'Enter MMHVAULT', closingNote: 'Sign in or create an account using the existing access page.',
      footerLine: 'Personal finance & wealth, with intention.', footerDisclaimer: 'A personal finance tool, not a bank, broker or financial adviser.',
      privacy: 'Privacy Policy', terms: 'Terms', rights: 'All rights reserved.',
      madeFor: 'DESIGNED FOR A MORE INTENTIONAL FINANCIAL LIFE'
    },
    zh: {
      skip: '跳转到主要内容',
      navHome: '首页', navFeatures: '产品功能', navAbout: '关于我们', navSecurity: '安全与隐私',
      signIn: '登录', getStarted: '开始使用',
      heroEyebrow: '掌握财务 · 把握方向',
      heroTitle: '让财务更清晰，<em>让未来更有方向。</em>',
      heroLead: '在一个有序、舒适的个人空间里，管理账户、收支、投资及未来财务计划，了解每一笔资金背后的意义。',
      heroChinese: 'A Smarter, More Intentional Financial Life.',
      exploreFeatures: '了解功能', heroFoot: '为清晰而设计，告别不必要的复杂。',
      concept: '概念界面', goodMorning: '早上好', demoOverview: '您的财务概览',
      demoBalance: '总余额', demoCashflow: '本月净现金流 + $2,720.00',
      demoIncome: '收入', demoExpenses: '支出', demoTrend: '现金流趋势', demoMonthly: '月度',
      demoDisclaimer: '概念界面展示 · 所有金额均为虚构示例数据',
      bandFirst: '了解当下', bandSecond: '规划未来', bandThird: '从容前行',
      featuresEyebrow: '一站式个人财务空间', featuresTitle: '重要财务信息，<br>尽在掌握。',
      featuresLead: '从每天的收支记录到长期的财务规划，发现帮助您更清楚了解自身财务状况的工具。',
      featureDashboard: '在简洁有序的总览中查看资产余额、财务活动与整体情况。',
      featureTransactions: '清晰记录收入与支出，方便整理、搜索和回顾。',
      featureAccounts: '把不同账户与多种货币整理到统一的管理视图中。',
      featureInvest: '在直观的投资视图中了解持仓与资产配置。',
      featureAnalyze: '通过图表、趋势与报告，更好地理解财务记录。',
      comingSoon: '即将推出',
      featureLife: '为未来的日程、习惯与个人目标打造更有条理的生活管理空间。',
      featureNote: '所有界面均为概念示意，并非真实账户截图；展示金额均为虚构数据。',
      whyEyebrow: 'MMHVAULT 的设计理念', whyTitle: '清晰有序，<br><em>让生活更加从容。</em>',
      whyLead: '财务管理不应该让人感到疲惫。MMHVAULT 注重信息的组织与体验，让复杂细节各归其位，让长期目标重新成为焦点。',
      benefit1Title: '清晰的个人财务视图', benefit1Desc: '重要数据一目了然，减少多余信息干扰。',
      benefit2Title: '一站式管理空间', benefit2Desc: '将彼此关联的财务事项整合到一起。',
      benefit3Title: '私人财务管理', benefit3Desc: '围绕您的个人财务记录打造专属空间。',
      benefit4Title: '关注长期财务规划', benefit4Desc: '不仅记录眼前的消费，更关注长远目标。',
      benefit5Title: '多设备适配体验', benefit5Desc: '为手机、平板与桌面设备优化展示。',
      benefit6Title: '中英双语界面', benefit6Desc: '使用更熟悉的语言探索自己的财务空间。',
      securityEyebrow: '重视隐私与账户边界', securityTitle: '个人财务，值得更细致地对待。',
      securityLead: 'MMHVAULT 使用账户登录与按用户划分的数据访问控制。登录及账户恢复均在现有专用安全入口完成，本公开介绍页不会收集任何密码或恢复密钥。',
      securityPoint1: '账户身份验证', securityPoint2: '个人数据访问边界', securityPoint3: '不索取银行凭据',
      securityLearn: '了解安全说明',
      closingEyebrow: '把注意力留给真正重要的事', closingTitle: '看清财务现状，<br><em>从容规划未来。</em>',
      closingLead: '更明确的未来，始于对当下财务状况的理解。',
      closingCta: '进入 MMHVAULT', closingNote: '请通过现有登录页面登录，或创建新账户。',
      footerLine: '让财务管理更有方向。', footerDisclaimer: '个人财务管理工具，不属于银行、券商或持牌财务顾问服务。',
      privacy: '隐私政策', terms: '使用条款', rights: '保留所有权利。',
      madeFor: '让每一步财务规划都更有方向'
    }
  };
  const htmlKeys = new Set(['heroTitle', 'featuresTitle', 'whyTitle', 'closingTitle']);
  const storageKey = 'mmhvault.landing.language';
  const siteHeader = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const languageButtons = [...document.querySelectorAll('[data-lang]')];
  const localeElements = [...document.querySelectorAll('[data-i18n]')];
  let currentLang = 'en';

  function applyLanguage(lang) {
    currentLang = lang === 'zh' ? 'zh' : 'en';
    const dict = strings[currentLang];
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    localeElements.forEach(node => {
      const key = node.getAttribute('data-i18n');
      const value = dict[key];
      if (typeof value !== 'string') return;
      if (htmlKeys.has(key)) node.innerHTML = value; // only hardcoded local, trusted translations
      else node.textContent = value;
    });
    languageButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === currentLang));
    });
    toggle.setAttribute('aria-label', currentLang === 'zh' ? '打开导航菜单' : 'Open navigation menu');
    document.querySelector('#primary-nav').setAttribute('aria-label', currentLang === 'zh' ? '主导航' : 'Primary navigation');
    document.title = currentLang === 'zh'
      ? 'MMHVAULT — 个人财务与财富管理 | 让未来更有方向'
      : 'MMHVAULT — Personal Finance & Wealth | Make Money Clearer';
    const desc = document.querySelector('meta[name="description"]');
    if (desc && currentLang === 'zh') desc.setAttribute('content', 'MMHVAULT 个人财务管理平台：管理账户、收支、投资及财务分析，在更清晰的个人空间里规划未来。');
    if (desc && currentLang === 'en') desc.setAttribute('content', 'Meet MMHVAULT, a personal finance workspace for accounts, transactions, investments, financial analysis and intentional planning. Explore a calmer way to understand your money.');
    try { window.localStorage.setItem(storageKey, currentLang); } catch (_) {}
  }
  function closeMenu() {
    siteHeader.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  languageButtons.forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
  toggle.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  document.querySelectorAll('#primary-nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => {
    if (!siteHeader.contains(event.target)) closeMenu();
  });
  const media = window.matchMedia('(min-width: 841px)');
  if (typeof media.addEventListener === 'function') media.addEventListener('change', closeMenu);
  let saved = 'en';
  try { if (window.localStorage.getItem(storageKey) === 'zh') saved = 'zh'; } catch (_) {}
  applyLanguage(saved);
})();
