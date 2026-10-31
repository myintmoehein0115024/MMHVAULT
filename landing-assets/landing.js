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
      benefit6Title: 'English, Chinese & Burmese', benefit6Desc: 'Explore the workspace in English, Chinese or Burmese.',
      securityEyebrow: 'DESIGNED WITH PRIVACY IN MIND', securityTitle: 'Your finances deserve a considered space.',
      securityLead: 'MMHVAULT uses account-based sign-in and user-scoped access controls for personal finance records. Sign-in and recovery happen in the existing secure access flow — never on this public landing page.',
      securityPoint1: 'Account-based access', securityPoint2: 'Private workspace boundaries', securityPoint3: 'No banking credentials requested',
      securityLearn: 'Read security information',
      closingEyebrow: 'MAKE ROOM FOR WHAT MATTERS', closingTitle: 'A clearer picture.<br><em>A more deliberate future.</em>',
      closingLead: 'The next chapter of your financial life starts with understanding where you stand.',
      closingCta: 'Enter MMHVAULT', closingNote: 'Sign in or create an account using the existing access page.',
      footerLine: 'Personal finance & wealth, with intention.', footerDisclaimer: 'A personal finance tool, not a bank, broker or financial adviser.',
      privacy: 'Privacy Policy', terms: 'Terms', rights: 'All rights reserved.',
      madeFor: 'DESIGNED FOR A MORE INTENTIONAL FINANCIAL LIFE',
      phoneAccounts: "My Accounts",
      phoneBalance: "AVAILABLE BALANCE",
      phoneEveryday: "Everyday Account",
      phonePersonal: "USD · Personal",
      phoneSavings: "Savings",
      listIncome: "Income",
      listEveryday: "Everyday",
      listLiving: "Living",
      visualOverview: "OVERVIEW",
      visualAllocation: "ILLUSTRATIVE ALLOCATION",
      visualOutlook: "MONTHLY OUTLOOK"
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
      benefit6Title: '中英缅三语界面', benefit6Desc: '支持中文、英语与缅甸语，使用熟悉的语言探索财务空间。',
      securityEyebrow: '重视隐私与账户边界', securityTitle: '个人财务，值得更细致地对待。',
      securityLead: 'MMHVAULT 使用账户登录与按用户划分的数据访问控制。登录及账户恢复均在现有专用安全入口完成，本公开介绍页不会收集任何密码或恢复密钥。',
      securityPoint1: '账户身份验证', securityPoint2: '个人数据访问边界', securityPoint3: '不索取银行凭据',
      securityLearn: '了解安全说明',
      closingEyebrow: '把注意力留给真正重要的事', closingTitle: '看清财务现状，<br><em>从容规划未来。</em>',
      closingLead: '更明确的未来，始于对当下财务状况的理解。',
      closingCta: '进入 MMHVAULT', closingNote: '请通过现有登录页面登录，或创建新账户。',
      footerLine: '让财务管理更有方向。', footerDisclaimer: '个人财务管理工具，不属于银行、券商或持牌财务顾问服务。',
      privacy: '隐私政策', terms: '使用条款', rights: '保留所有权利。',
      madeFor: '让每一步财务规划都更有方向',
      phoneAccounts: "我的账户",
      phoneBalance: "可用余额",
      phoneEveryday: "日常账户",
      phonePersonal: "USD · 个人账户",
      phoneSavings: "储蓄账户",
      listIncome: "收入",
      listEveryday: "日常消费",
      listLiving: "生活支出",
      visualOverview: "总览",
      visualAllocation: "示例资产配置",
      visualOutlook: "月度趋势"
    },
    my: {
      "skip": "အဓိကအကြောင်းအရာသို့ သွားရန်",
      "navHome": "ပင်မ",
      "navFeatures": "လုပ်ဆောင်ချက်များ",
      "navAbout": "အကြောင်း",
      "navSecurity": "လုံခြုံရေး",
      "signIn": "အကောင့်ဝင်ရန်",
      "getStarted": "စတင်အသုံးပြုရန်",
      "heroEyebrow": "သင့်ငွေကြေး · သင့်ဦးတည်ချက်",
      "heroTitle": "ငွေကြေးကို ပိုမိုရှင်းလင်းစွာ သိမြင်ပြီး <em>အနာဂတ်ကို ရည်ရွယ်ချက်ရှိရှိ စီမံပါ။</em>",
      "heroLead": "သင့်ဘဏ်အကောင့်များ၊ ဝင်ငွေ၊ အသုံးစရိတ်၊ ရင်းနှီးမြှုပ်နှံမှုများနှင့် အနာဂတ်အစီအစဉ်များကို တစ်နေရာတည်းတွင် စနစ်တကျ စီမံနိုင်ပါသည်။",
      "heroChinese": "ငွေကြေးပိုရှင်းလင်းလေ၊ အနာဂတ်အတွက် ဦးတည်ချက် ပိုမိုကောင်းမွန်လေ။",
      "exploreFeatures": "လုပ်ဆောင်ချက်များ ကြည့်ရန်",
      "heroFoot": "ရှင်းလင်းလွယ်ကူမှုကို အဓိကထား၍ ဒီဇိုင်းဆွဲထားသည်။",
      "concept": "နမူနာ UI",
      "goodMorning": "မင်္ဂလာနံနက်ခင်းပါ",
      "demoOverview": "သင့်ငွေကြေးအကျဉ်းချုပ်",
      "demoBalance": "စုစုပေါင်းလက်ကျန်",
      "demoCashflow": "ယခုလ အသားတင် ငွေဝင်ငွေထွက် + $2,720.00",
      "demoIncome": "ဝင်ငွေ",
      "demoExpenses": "အသုံးစရိတ်",
      "demoTrend": "ငွေဝင်ငွေထွက် လမ်းကြောင်း",
      "demoMonthly": "လစဉ်",
      "demoDisclaimer": "နမူနာဒီဇိုင်းသာဖြစ်ပြီး ပြသထားသည့် ငွေပမာဏအားလုံးမှာ စိတ်ကူးယဉ်အချက်အလက်များ ဖြစ်ပါသည်",
      "bandFirst": "ယနေ့ကို နားလည်ပါ",
      "bandSecond": "မနက်ဖြန်အတွက် စီမံပါ",
      "bandThird": "ရည်ရွယ်ချက်ရှိရှိ ရှေ့ဆက်ပါ",
      "featuresEyebrow": "ကိုယ်ပိုင်ငွေကြေးစီမံခန့်ခွဲမှု နေရာတစ်ခုတည်း",
      "featuresTitle": "အရေးကြီးသော ငွေကြေးအချက်အလက်များကို<br>တစ်နေရာတည်းတွင် ကြည့်ရှုပါ။",
      "featuresLead": "နေ့စဉ်ငွေဝင်ငွေထွက်မှ အနာဂတ်ရည်မှန်းချက်များအထိ သင့်ငွေကြေးအခြေအနေကို ပိုမိုနားလည်စေမည့် လုပ်ဆောင်ချက်များကို လေ့လာပါ။",
      "featureDashboard": "လက်ကျန်ငွေ၊ လှုပ်ရှားမှုများနှင့် စုစုပေါင်းငွေကြေးအခြေအနေကို ရှင်းလင်းစွာ ကြည့်ရှုပါ။",
      "featureTransactions": "ဝင်ငွေနှင့် အသုံးစရိတ်များကို စနစ်တကျ မှတ်တမ်းတင်၊ ရှာဖွေပြီး ပြန်လည်စစ်ဆေးနိုင်ပါသည်။",
      "featureAccounts": "မတူညီသော အကောင့်များနှင့် ငွေကြေးအမျိုးအစားများကို တစ်နေရာတည်းတွင် စီမံပါ။",
      "featureInvest": "ရင်းနှီးမြှုပ်နှံမှုများနှင့် ပိုင်ဆိုင်မှုခွဲဝေမှုကို ပိုမိုရှင်းလင်းစွာ ကြည့်ရှုပါ။",
      "featureAnalyze": "ငွေကြေးမှတ်တမ်းများကို ဇယားများ၊ လမ်းကြောင်းများနှင့် အစီရင်ခံစာများဖြင့် နားလည်ပါ။",
      "comingSoon": "မကြာမီ ရရှိနိုင်မည်",
      "featureLife": "အချိန်ဇယား၊ အလေ့အကျင့်များ၊ ရည်မှန်းချက်များနှင့် နေ့စဉ်ဘဝကို ပိုမိုစနစ်တကျ စီမံရန် အနာဂတ်လုပ်ဆောင်ချက်။",
      "featureNote": "ပြသထားသော UI များသည် စိတ်ကူးပုံဖော်ထားသည့် နမူနာများသာဖြစ်ပြီး အကောင့်အစစ်၏ ပုံများမဟုတ်ပါ။ ငွေပမာဏအားလုံးမှာ နမူနာများဖြစ်ပါသည်။",
      "whyEyebrow": "MMHVAULT ၏ အတွေးအခေါ်",
      "whyTitle": "ရှင်းလင်းမှုသည်<br><em>တိတ်ဆိတ်သော အားသာချက်တစ်ခုဖြစ်သည်။</em>",
      "whyLead": "ငွေကြေးစီမံခန့်ခွဲမှုက ရှုပ်ထွေးနေစရာ မလိုပါ။ MMHVAULT သည် အသေးစိတ်အချက်အလက်များကို စနစ်တကျ စုစည်းပြီး သင့်ရည်မှန်းချက်များကို အဓိကထားနိုင်ရန် ဒီဇိုင်းထုတ်ထားပါသည်။",
      "benefit1Title": "ရှင်းလင်းသော ကိုယ်ပိုင်ငွေကြေးမြင်ကွင်း",
      "benefit1Desc": "အရေးကြီးသော ကိန်းဂဏန်းများကို အနှောင့်အယှက်နည်းနည်းဖြင့် မြင်နိုင်ပါသည်။",
      "benefit2Title": "တစ်နေရာတည်းတွင် စီမံခန့်ခွဲခြင်း",
      "benefit2Desc": "ဆက်စပ်သော ငွေကြေးကိစ္စများကို စုစည်းထားပါသည်။",
      "benefit3Title": "ကိုယ်ပိုင်ငွေကြေးလုံခြုံရေးနှင့် စီမံမှု",
      "benefit3Desc": "သင့်ကိုယ်ပိုင် ငွေကြေးမှတ်တမ်းများအတွက် သီးသန့်နေရာတစ်ခု။",
      "benefit4Title": "ရေရှည်အမြင်",
      "benefit4Desc": "နေ့စဉ်အသုံးစရိတ်ထက် ကျော်လွန်ပြီး အနာဂတ်ရည်မှန်းချက်များကို စဉ်းစားနိုင်ပါသည်။",
      "benefit5Title": "စက်မျိုးစုံတွင် အသုံးပြုနိုင်ခြင်း",
      "benefit5Desc": "ဖုန်း၊ တက်ဘလက်နှင့် ကွန်ပျူတာများတွင် လိုက်ဖက်စွာ ဖော်ပြပါသည်။",
      "benefit6Title": "အင်္ဂလိပ်၊ တရုတ်နှင့် မြန်မာ",
      "benefit6Desc": "သင်နှစ်သက်သော ဘာသာစကားဖြင့် အသုံးပြုနိုင်ပါသည်။",
      "securityEyebrow": "ကိုယ်ရေးလုံခြုံမှုကို အလေးထား၍ ဒီဇိုင်းထုတ်ထားသည်",
      "securityTitle": "သင့်ငွေကြေးအချက်အလက်များအတွက် သေချာစီမံထားသော နေရာ။",
      "securityLead": "MMHVAULT သည် အကောင့်အခြေပြု ဝင်ရောက်မှုနှင့် အသုံးပြုသူအလိုက် ခွဲခြားထားသော ဒေတာဝင်ရောက်ခွင့်ကို အသုံးပြုပါသည်။ အကောင့်ဝင်ခြင်းနှင့် ပြန်လည်ရယူခြင်းတို့ကို သီးသန့်ဝင်ရောက်မှုစာမျက်နှာတွင်သာ ဆောင်ရွက်ပါသည်။",
      "securityPoint1": "အကောင့်အခြေပြု ဝင်ရောက်မှု",
      "securityPoint2": "ကိုယ်ပိုင်ဒေတာ ခွဲခြားကန့်သတ်မှု",
      "securityPoint3": "ဘဏ်လျှို့ဝှက်အချက်အလက်များ မတောင်းခံပါ",
      "securityLearn": "လုံခြုံရေးအချက်အလက်များ ဖတ်ရန်",
      "closingEyebrow": "အရေးကြီးသည့်အရာများအတွက် အချိန်ပေးပါ",
      "closingTitle": "ယနေ့ငွေကြေးကို ရှင်းလင်းစွာ သိမြင်ပြီး<br><em>အနာဂတ်ကို ပိုမိုကောင်းမွန်စွာ စီမံပါ။</em>",
      "closingLead": "သင့်လက်ရှိ ငွေကြေးအခြေအနေကို နားလည်ခြင်းက အနာဂတ်အတွက် ပထမခြေလှမ်းဖြစ်သည်။",
      "closingCta": "MMHVAULT သို့ ဝင်ရန်",
      "closingNote": "ရှိပြီးသား အကောင့်ဖြင့် ဝင်ရောက်ပါ၊ သို့မဟုတ် ဝင်ရောက်မှုစာမျက်နှာတွင် အကောင့်အသစ် ဖန်တီးပါ။",
      "footerLine": "ရည်ရွယ်ချက်ရှိသော ကိုယ်ပိုင်ငွေကြေးစီမံခန့်ခွဲမှု။",
      "footerDisclaimer": "ဤဝန်ဆောင်မှုသည် ကိုယ်ပိုင်ငွေကြေးစီမံခန့်ခွဲမှု ကိရိယာဖြစ်ပြီး ဘဏ်၊ ပွဲစား သို့မဟုတ် လိုင်စင်ရ ငွေကြေးအကြံပေးဝန်ဆောင်မှု မဟုတ်ပါ။",
      "privacy": "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
      "terms": "အသုံးပြုမှုစည်းကမ်းချက်များ",
      "rights": "မူပိုင်ခွင့်အားလုံးကို ထိန်းသိမ်းထားသည်။",
      "madeFor": "ရည်ရွယ်ချက်ရှိသော ငွေကြေးဘဝအတွက် ဒီဇိုင်းထုတ်ထားသည်",
      "phoneAccounts": "ကျွန်ုပ်၏အကောင့်များ",
      "phoneBalance": "သုံးစွဲနိုင်သောလက်ကျန်",
      "phoneEveryday": "နေ့စဉ်သုံးအကောင့်",
      "phonePersonal": "USD · ကိုယ်ပိုင်",
      "phoneSavings": "စုဆောင်းငွေ",
      "listIncome": "ဝင်ငွေ",
      "listEveryday": "နေ့စဉ်အသုံးစရိတ်",
      "listLiving": "လူနေမှုအသုံးစရိတ်",
      "visualOverview": "အကျဉ်းချုပ်",
      "visualAllocation": "ပိုင်ဆိုင်မှုခွဲဝေမှု နမူနာ",
      "visualOutlook": "လစဉ် ခန့်မှန်းချက်"
    }
  };
  Object.assign(strings.en, {
    railDashboard: 'See your financial picture',
    railTransactions: 'Follow every transaction',
    railAccounts: 'Keep accounts organized',
    railInvest: 'Know your portfolio',
    railAnalyze: 'Understand your trends',
    railLife: 'Plan the life ahead'
  });
  Object.assign(strings.zh, {
    railDashboard: '一眼掌握财务全貌',
    railTransactions: '记录每一笔收支',
    railAccounts: '统一管理账户',
    railInvest: '清楚了解投资组合',
    railAnalyze: '看懂财务趋势',
    railLife: '规划更好的生活'
  });
  Object.assign(strings.my, {
    railDashboard: 'သင့်ငွေကြေးကို မြင်သာစွာ ကြည့်ပါ',
    railTransactions: 'ငွေဝင်ငွေထွက်ကို မှတ်တမ်းတင်ပါ',
    railAccounts: 'အကောင့်များကို စနစ်တကျ စီမံပါ',
    railInvest: 'ရင်းနှီးမြှုပ်နှံမှုကို သိရှိပါ',
    railAnalyze: 'ငွေကြေးလမ်းကြောင်းကို နားလည်ပါ',
    railLife: 'အနာဂတ်ဘဝကို စီမံပါ'
  });
  const htmlKeys = new Set(['heroTitle', 'featuresTitle', 'whyTitle', 'closingTitle']);
  const storageKey = 'mmhvault.landing.language';
  const siteHeader = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const languageButtons = [...document.querySelectorAll('[data-lang]')];
  const localeElements = [...document.querySelectorAll('[data-i18n]')];
  const localeTrigger = document.getElementById('locale-trigger');
  const localeMenu = document.getElementById('locale-menu');
  const localeFlag = document.querySelector('.locale-active-flag');
  const localeName = document.querySelector('.locale-active-name');
  const languageMeta = {
    en: { flag: '🇬🇧', title: 'English' },
    zh: { flag: '🇨🇳', title: '中文' },
    my: { flag: '🇲🇲', title: 'မြန်မာ' }
  };

  let currentLang = 'en';

  function applyLanguage(lang) {
    currentLang = lang === 'my' ? 'my' : (lang === 'zh' ? 'zh' : 'en');
    const dict = strings[currentLang];
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : (currentLang === 'my' ? 'my' : 'en');
    localeElements.forEach(node => {
      // Brand hero text is permanently multilingual, never translated or replaced.
      if (node.closest('[data-hero-fixed]')) return;
      const key = node.getAttribute('data-i18n');
      const value = dict[key];
      if (typeof value !== 'string') return;
      if (htmlKeys.has(key)) node.innerHTML = value; // only hardcoded local, trusted translations
      else node.textContent = value;
    });
    languageButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === currentLang));
    });
    toggle.setAttribute('aria-label', currentLang === 'zh' ? '打开导航菜单' : (currentLang === 'my' ? 'လမ်းညွှန်မီနူး ဖွင့်ရန်' : 'Open navigation menu'));
    document.querySelector('#primary-nav').setAttribute('aria-label', currentLang === 'zh' ? '主导航' : (currentLang === 'my' ? 'အဓိကလမ်းညွှန်' : 'Primary navigation'));
    localeTrigger.setAttribute('aria-label', currentLang === 'zh' ? '选择语言' : (currentLang === 'my' ? 'ဘာသာစကား ရွေးရန်' : 'Select language'));
    localeMenu.setAttribute('aria-label', currentLang === 'zh' ? '语言选择' : (currentLang === 'my' ? 'ဘာသာစကား ရွေးချယ်မှု' : 'Choose language'));
    localeFlag.textContent = languageMeta[currentLang].flag;
    localeName.textContent = languageMeta[currentLang].title;
    document.title = currentLang === 'zh'
      ? 'MMHVAULT — 个人财务与财富管理 | 让未来更有方向'
      : currentLang === 'my' ? 'MMHVAULT — ကိုယ်ပိုင်ငွေကြေးနှင့် ပိုင်ဆိုင်မှု စီမံခန့်ခွဲမှု' : 'MMHVAULT — Personal Finance & Wealth | Make Money Clearer';
    const desc = document.querySelector('meta[name="description"]');
    if (desc && currentLang === 'zh') desc.setAttribute('content', 'MMHVAULT 个人财务管理平台：管理账户、收支、投资及财务分析，在更清晰的个人空间里规划未来。');
    if (desc && currentLang === 'my') desc.setAttribute('content', 'MMHVAULT သည် အကောင့်များ၊ ဝင်ငွေ၊ အသုံးစရိတ်၊ ရင်းနှီးမြှုပ်နှံမှုနှင့် အနာဂတ်အစီအစဉ်များကို စီမံနိုင်သော ကိုယ်ပိုင်ငွေကြေးပလက်ဖောင်း ဖြစ်ပါသည်။');
    if (desc && currentLang === 'en') desc.setAttribute('content', 'Meet MMHVAULT, a personal finance workspace for accounts, transactions, investments, financial analysis and intentional planning. Explore a calmer way to understand your money.');
    try { window.localStorage.setItem(storageKey, currentLang); } catch (_) {}
  }
  function closeMenu() {
    siteHeader.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function closeLanguage() {
    localeMenu.hidden = true;
    localeTrigger.setAttribute('aria-expanded', 'false');
  }
  function toggleLanguage() {
    const willOpen = localeMenu.hidden;
    closeMenu();
    localeMenu.hidden = !willOpen;
    localeTrigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      const active = languageButtons.find(button => button.dataset.lang === currentLang);
      if (active) active.focus();
    }
  }
  languageButtons.forEach(button => button.addEventListener('click', () => {
    applyLanguage(button.dataset.lang);
    closeLanguage();
    localeTrigger.focus();
  }));
  localeTrigger.addEventListener('click', toggleLanguage);
  localeTrigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (localeMenu.hidden) toggleLanguage();
      else languageButtons[0].focus();
    }
  });
  localeMenu.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = languageButtons.indexOf(document.activeElement);
      const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + languageButtons.length) % languageButtons.length;
      languageButtons[next].focus();
    }
  });
  toggle.addEventListener('click', () => {
    closeLanguage();
    const isOpen = siteHeader.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  document.querySelectorAll('#primary-nav a').forEach(link => link.addEventListener('click', () => {
    closeMenu();
    closeLanguage();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const wasOpen = !localeMenu.hidden;
      closeLanguage();
      closeMenu();
      if (wasOpen) localeTrigger.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.locale-picker')) closeLanguage();
    if (!siteHeader.contains(event.target)) closeMenu();
  });
  const media = window.matchMedia('(min-width: 1201px)');
  if (typeof media.addEventListener === 'function') media.addEventListener('change', closeMenu);
  let saved = 'en';
  try { const stored = window.localStorage.getItem(storageKey); if (stored === 'zh' || stored === 'my') saved = stored; } catch (_) {}
  applyLanguage(saved);
})();
