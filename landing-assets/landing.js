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
  Object.assign(strings.en,{assetGlobal:'Global',assetGold:'Gold',assetOther:'Other'});
  Object.assign(strings.zh,{assetGlobal:'全球股票',assetGold:'黄金',assetOther:'其他'});
  Object.assign(strings.my,{assetGlobal:'ကမ္ဘာလုံးဆိုင်ရာ',assetGold:'ရွှေ',assetOther:'အခြား'});

  // Public concept-only translations; no real business data is loaded.
  Object.assign(strings.en,{"navBusiness":"Business","businessEyebrow":"A NEW PERSPECTIVE ON FINANCE","businessHeading":"Your finances.<br><em>Your ambitions.</em>","businessLead":"Personal finances today. The possibility of a dedicated workspace for your future business, presented with the same considered attention to detail.","businessStatus":"Business workspace · design concept","businessSideNote":"One visual language for the life you're building and the ventures you're imagining.","businessLabel":"FINANCIAL WORKSPACE","businessPersonal":"Personal","businessBusiness":"Business","businessPreviewOnly":"CONCEPT / DEMO","businessDemoEyebrow":"FINANCIAL PICTURE","businessDemoPeriod":"ILLUSTRATIVE MONTH","personalDemoTitle":"Personal overview","businessDemoTitle":"Business overview","personalDemoBalance":"TOTAL BALANCE","businessDemoBalance":"BUSINESS BALANCE","personalDemoDelta":"+ $2,720 fictional monthly net cash flow","businessDemoDelta":"+ $36,250 fictional monthly net cash flow","businessMetricIncome":"INCOME","businessMetricOutflow":"OUTGOINGS","personalDemoThird":"SAVINGS GOAL","businessDemoThird":"MONTHLY REVENUE","businessActivityTitle":"RECENT ACTIVITY","businessBreakdown":"ALLOCATION SNAPSHOT","personalRow1":"Monthly salary","personalRow2":"Everyday expense","personalRow3":"Savings transfer","businessRow1":"Client payment","businessRow2":"Operating expense","businessRow3":"Software subscription","businessLegend1":"Available","businessLegend2":"Invested","businessLegend3":"Reserved","businessFootnote":"Concept interface only. All figures are fictional; no actual financial or business records.","businessExplore":"Explore personal finance features"});
  Object.assign(strings.zh,{"navBusiness":"商业财务","businessEyebrow":"探索更多财务管理可能","businessHeading":"管理个人财富，<br><em>规划事业未来。</em>","businessLead":"从个人财务管理到未来的商业财务空间，探索统一、清晰、精致的财务工作体验。商业功能目前仅为概念展示。","businessStatus":"商业工作区 · 设计概念","businessSideNote":"从个人生活到未来事业，以一致的高级视觉理解每一笔资金。","businessLabel":"财务管理工作区","businessPersonal":"个人财务","businessBusiness":"商业财务","businessPreviewOnly":"概念演示","businessDemoEyebrow":"财务概览","businessDemoPeriod":"虚构示例月份","personalDemoTitle":"个人财务总览","businessDemoTitle":"商业财务总览","personalDemoBalance":"账户总余额","businessDemoBalance":"商业资金余额","personalDemoDelta":"本月虚构净现金流 + $2,720","businessDemoDelta":"本月虚构净现金流 + $36,250","businessMetricIncome":"收入","businessMetricOutflow":"支出","personalDemoThird":"储蓄目标","businessDemoThird":"月度营业额","businessActivityTitle":"近期记录","businessBreakdown":"资金分布","personalRow1":"每月工资","personalRow2":"日常消费","personalRow3":"储蓄转账","businessRow1":"客户付款","businessRow2":"经营成本","businessRow3":"软件订阅","businessLegend1":"可用资金","businessLegend2":"投资资金","businessLegend3":"预留资金","businessFootnote":"仅为概念界面，所有金额均为虚构示例，并非真实账户或商业数据。","businessExplore":"了解个人财务功能"});
  Object.assign(strings.my,{"navBusiness":"စီးပွားရေး","businessEyebrow":"ငွေကြေးစီမံခန့်ခွဲမှု၏ အမြင်သစ်","businessHeading":"သင့်ငွေကြေးကို စီမံပြီး<br><em>သင့်လုပ်ငန်းအတွက် အနာဂတ်ကို ပုံဖော်ပါ။</em>","businessLead":"ကိုယ်ပိုင်ငွေကြေးမှ အနာဂတ်စီးပွားရေးလုပ်ငန်းအထိ စနစ်တကျ စီမံနိုင်မည့် အကြံပြုဒီဇိုင်းကို လေ့လာပါ။ လုပ်ငန်းအတွက် လုပ်ဆောင်ချက်သည် ယခုအချိန်တွင် နမူနာသာ ဖြစ်ပါသည်။","businessStatus":"စီးပွားရေးလုပ်ငန်းနေရာ · ဒီဇိုင်းနမူနာ","businessSideNote":"သင့်ဘဝနှင့် စီးပွားရေးရည်မှန်းချက်များအတွက် တစ်သမတ်တည်းသော အမြင်။","businessLabel":"ငွေကြေးစီမံခန့်ခွဲမှု","businessPersonal":"ကိုယ်ပိုင်","businessBusiness":"စီးပွားရေး","businessPreviewOnly":"နမူနာသာ","businessDemoEyebrow":"ငွေကြေးအကျဉ်းချုပ်","businessDemoPeriod":"စိတ်ကူးယဉ် လစဉ်နမူနာ","personalDemoTitle":"ကိုယ်ပိုင်ငွေကြေးအကျဉ်းချုပ်","businessDemoTitle":"စီးပွားရေးငွေကြေးအကျဉ်းချုပ်","personalDemoBalance":"စုစုပေါင်းလက်ကျန်","businessDemoBalance":"လုပ်ငန်းငွေလက်ကျန်","personalDemoDelta":"ယခုလ နမူနာငွေဝင်ငွေထွက် + $2,720","businessDemoDelta":"ယခုလ နမူနာငွေဝင်ငွေထွက် + $36,250","businessMetricIncome":"ဝင်ငွေ","businessMetricOutflow":"အသုံးစရိတ်","personalDemoThird":"စုဆောင်းငွေရည်မှန်းချက်","businessDemoThird":"လစဉ်လုပ်ငန်းဝင်ငွေ","businessActivityTitle":"မကြာသေးမီက မှတ်တမ်းများ","businessBreakdown":"ငွေကြေးခွဲဝေမှု","personalRow1":"လစဉ်လစာ","personalRow2":"နေ့စဉ်အသုံးစရိတ်","personalRow3":"စုဆောင်းငွေလွှဲခြင်း","businessRow1":"ဖောက်သည်ငွေပေးချေမှု","businessRow2":"လုပ်ငန်းအသုံးစရိတ်","businessRow3":"ဆော့ဖ်ဝဲကြေး","businessLegend1":"အသုံးပြုနိုင်သောငွေ","businessLegend2":"ရင်းနှီးမြှုပ်နှံထားသောငွေ","businessLegend3":"သီးသန့်ထားသောငွေ","businessFootnote":"ဤနေရာသည် ဒီဇိုင်းနမူနာသာဖြစ်ပြီး ငွေပမာဏအားလုံးမှာ စိတ်ကူးယဉ်အချက်အလက်များ ဖြစ်ပါသည်။","businessExplore":"ကိုယ်ပိုင်ငွေကြေးလုပ်ဆောင်ချက်များ"});
  Object.assign(strings.en,{
    businessVisualKicker:'ONE VISION. TWO PERSPECTIVES.',
    businessVisualTitle:'Your finances, personal and professional.',
    businessVisualBody:'A visual concept for a more intentional personal financial life and the business you may build in the future.',
    businessVisualDisclaimer:'Illustrative design only · All amounts are fictional'
  });
  Object.assign(strings.zh,{
    businessVisualKicker:'一个愿景，两种财务视角',
    businessVisualTitle:'从个人财富，走向事业未来。',
    businessVisualBody:'以统一高级视觉呈现个人财务与未来商业财务空间。商业功能目前仅为概念展示。',
    businessVisualDisclaimer:'仅供视觉示意 · 所有金额均为虚构数据'
  });
  Object.assign(strings.my,{
    businessVisualKicker:'ရည်မှန်းချက်တစ်ခု · အမြင်နှစ်မျိုး',
    businessVisualTitle:'ကိုယ်ပိုင်ငွေကြေးနှင့် အနာဂတ်စီးပွားရေး။',
    businessVisualBody:'ကိုယ်ပိုင်ဘဝနှင့် အနာဂတ်စီးပွားရေးလုပ်ငန်းအတွက် ငွေကြေးစီမံမှု ဒီဇိုင်းနမူနာဖြစ်ပါသည်။ စီးပွားရေးလုပ်ဆောင်ချက်ကို မထုတ်ပြန်ရသေးပါ။',
    businessVisualDisclaimer:'ဒီဇိုင်းနမူနာသာ · ငွေပမာဏအားလုံးမှာ စိတ်ကူးယဉ်အချက်အလက်များ ဖြစ်ပါသည်'
  });


  // L1.6 editorial Business/Personal report concepts. Amounts remain local fictional examples.
  Object.assign(strings.en,{
    personalDemoCashLabel:'NET CASH FLOW',businessDemoCashLabel:'OPERATING CASH FLOW',
    personalDemoCashNote:'Illustrative monthly movement',businessDemoCashNote:'Revenue minus operating costs · demo',
    personalDemoAssetLabel:'ILLUSTRATIVE ASSETS',businessDemoAssetLabel:'TOTAL BUSINESS ASSETS',
    personalDemoAssetNote:'Example valuation only',businessDemoAssetNote:'Fictional business asset estimate',
    businessReportLabel:'FINANCIAL REPORTS',
    personalDemoReportTitle:'Personal report concept',businessDemoReportTitle:'Monthly business report concept',
    businessReportNote:'Preview only · No report generated'
  });
  Object.assign(strings.zh,{
    personalDemoCashLabel:'本月净现金流',businessDemoCashLabel:'经营净现金流',
    personalDemoCashNote:'虚构月度资金变化',businessDemoCashNote:'营业收入减经营支出 · 示例',
    personalDemoAssetLabel:'示例资产',businessDemoAssetLabel:'企业资产总览',
    personalDemoAssetNote:'仅为虚构估值',businessDemoAssetNote:'虚构企业资产估值',
    businessReportLabel:'财务报告',
    personalDemoReportTitle:'个人财务报告概念',businessDemoReportTitle:'企业月度财务报告概念',
    businessReportNote:'仅为预览 · 不生成真实报告'
  });
  Object.assign(strings.my,{
    personalDemoCashLabel:'လစဉ် အသားတင်ငွေစီးဆင်းမှု',businessDemoCashLabel:'လုပ်ငန်း အသားတင်ငွေစီးဆင်းမှု',
    personalDemoCashNote:'စိတ်ကူးယဉ် လစဉ်နမူနာ',businessDemoCashNote:'လုပ်ငန်းဝင်ငွေနှင့် အသုံးစရိတ်ကွာခြားချက် · နမူနာ',
    personalDemoAssetLabel:'ပိုင်ဆိုင်မှု နမူနာ',businessDemoAssetLabel:'လုပ်ငန်းပိုင်ဆိုင်မှု စုစုပေါင်း',
    personalDemoAssetNote:'နမူနာတန်ဖိုးသာ',businessDemoAssetNote:'စိတ်ကူးယဉ် ပိုင်ဆိုင်မှုတန်ဖိုး',
    businessReportLabel:'ငွေကြေးအစီရင်ခံစာ',
    personalDemoReportTitle:'ကိုယ်ပိုင် ငွေကြေးအစီရင်ခံစာ နမူနာ',businessDemoReportTitle:'လုပ်ငန်း လစဉ်အစီရင်ခံစာ နမူနာ',
    businessReportNote:'ကြည့်ရှုရန် နမူနာသာ · အစီရင်ခံစာ မထုတ်ပေးပါ'
  });

  Object.assign(strings.en,{
    businessTabsAria:'Select illustrative Personal or Business finances',
    businessInsightsAria:'Illustrative financial insights',
    heroImageAlt:'Fictional MMHVAULT financial dashboard presented on a laptop and phone',
    businessPhotoAlt:'Fictional Personal and Business financial dashboard concept shown on devices'
  });
  Object.assign(strings.zh,{
    businessTabsAria:'切换个人或商业财务概念展示',
    businessInsightsAria:'虚构财务概览指标',
    heroImageAlt:'电脑和手机展示的虚构 MMHVAULT 财务仪表盘',
    businessPhotoAlt:'个人及商业财务的电脑手机概念展示图'
  });
  Object.assign(strings.my,{
    businessTabsAria:'ကိုယ်ပိုင် သို့မဟုတ် လုပ်ငန်း ငွေကြေးနမူနာကို ရွေးချယ်ပါ',
    businessInsightsAria:'နမူနာ ငွေကြေးအချက်အလက်များ',
    heroImageAlt:'လက်ပ်တော့နှင့် ဖုန်းပေါ်ရှိ MMHVAULT ငွေကြေးနမူနာ မျက်နှာပြင်',
    businessPhotoAlt:'ကိုယ်ပိုင်နှင့် လုပ်ငန်း ငွေကြေးနမူနာ ကွန်ပျူတာနှင့် ဖုန်းပုံ'
  });

  // Showcase B: visual concepts only. All numbers are fictional.
  Object.assign(strings.en,{
    showcaseEyebrow:'THE MMHVAULT EXPERIENCE',
    showcaseTitle:'A clearer picture of every financial decision.',
    showcaseIntro:'Six thoughtful perspectives. One carefully considered workspace.',
    showcaseCore:'CORE OVERVIEW',showcaseTotal:'TOTAL BALANCE',
    showcaseThisMonth:'THIS MONTH',showcaseRecent:'RECENT ACTIVITY',
    showcaseSalary:'Salary',showcaseGroceries:'Groceries',showcaseLiving:'Living',
    showcaseAccountList:'MULTI-CURRENCY VIEW',showcaseAllocation:'ASSET ALLOCATION',
    showcaseTrends:'FINANCIAL TRENDS',showcasePlanAhead:'A MORE INTENTIONAL DAY',
    showcaseHabit:'Daily habits',showcaseGoals:'Long-term goals'
  });
  Object.assign(strings.zh,{
    showcaseEyebrow:'MMHVAULT · 专属财务空间',
    showcaseTitle:'每一项财务决策，都值得看得更清晰。',
    showcaseIntro:'六个精心设计的视角，构成一个更从容的财务空间。',
    showcaseCore:'核心总览',showcaseTotal:'账户总余额',
    showcaseThisMonth:'本月',showcaseRecent:'近期收支记录',
    showcaseSalary:'工资收入',showcaseGroceries:'日常采购',showcaseLiving:'生活开销',
    showcaseAccountList:'多币种账户',showcaseAllocation:'资产配置',
    showcaseTrends:'财务趋势',showcasePlanAhead:'让每一天更有方向',
    showcaseHabit:'日常习惯',showcaseGoals:'长期目标'
  });
  Object.assign(strings.my,{
    showcaseEyebrow:'MMHVAULT · ကိုယ်ပိုင်ငွေကြေးနေရာ',
    showcaseTitle:'ငွေကြေးဆုံးဖြတ်ချက်တိုင်းကို ပိုမိုရှင်းလင်းစွာ မြင်နိုင်ရန်။',
    showcaseIntro:'ရှုထောင့်ခြောက်မျိုးဖြင့် ငွေကြေးအခြေအနေကို စနစ်တကျ ကြည့်ရှုနိုင်ပါသည်။',
    showcaseCore:'အဓိကခြုံငုံသုံးသပ်ချက်',showcaseTotal:'စုစုပေါင်းလက်ကျန်',
    showcaseThisMonth:'ယခုလ',showcaseRecent:'လတ်တလော ငွေဝင်ငွေထွက်',
    showcaseSalary:'လစာ',showcaseGroceries:'နေ့စဉ်ဈေးဝယ်',showcaseLiving:'နေထိုင်စရိတ်',
    showcaseAccountList:'ငွေကြေးအမျိုးအစားစုံ အကောင့်များ',showcaseAllocation:'ပိုင်ဆိုင်မှုခွဲဝေမှု',
    showcaseTrends:'ငွေကြေးလမ်းကြောင်း',showcasePlanAhead:'ပိုမိုစနစ်ကျသော နေ့စဉ်ဘဝ',
    showcaseHabit:'နေ့စဉ်အလေ့အထများ',showcaseGoals:'ရေရှည်ရည်မှန်းချက်များ'
  });


  // L1.9 Product Explorer: editorial interface only; values are fabricated and local.
  Object.assign(strings.en,{
    productPickLabel:'EXPLORE THE WORKSPACE',productChooseHint:'Select a feature to see its illustrative interface.',
    productStageBrand:'/ PRODUCT PREVIEW',productStageStatus:'CONCEPT UI',productSectionLabel:'A CLOSER LOOK',
    productConceptLabel:'ILLUSTRATIVE CONCEPT',productTotalBalance:'TOTAL BALANCE',
    productMonth:'THIS MONTH',productIncome:'MONTHLY INCOME',productExpense:'MONTHLY EXPENSES',
    productNetFlow:'NET CASH FLOW',productRecentActivity:'RECENT ACTIVITY',
    productTransport:'Transport',productTrackNote:'One place for a clearer view of incoming and outgoing funds.',
    productAccountOne:'EVERYDAY ACCOUNT',productAccountTwo:'LOCAL ACCOUNT',productAccountThree:'SAVINGS ACCOUNT',
    productMultiCurrencyNote:'Different currencies are displayed individually — without misleading totals.',
    productAllocation:'ILLUSTRATIVE ALLOCATION',productAssetGlobal:'GLOBAL MARKETS',productAssetGold:'GOLD',
    productAssetOther:'OTHER ASSETS',productTrend:'MONTHLY CASH FLOW TREND',
    productInsightLabel:'INSIGHT SNAPSHOT',productInsightValue:'See the bigger picture at a glance.',
    productPlannerMonth:'YOUR WEEK AT A GLANCE',productDailyHabits:'DAILY HABITS',
    productLongTermGoals:'LONG-TERM GOALS',productPlannerConcept:'Schedules, habits and goals — a future space to bring daily life into focus.',
    productConceptOnly:'Concept preview. Not yet available.',productTablistAria:'Explore MMHVAULT product concepts'
  });
  Object.assign(strings.zh,{
    productPickLabel:'探索财务功能',productChooseHint:'选择一个功能，体验对应的概念界面。',
    productStageBrand:'/ 产品概念展示',productStageStatus:'概念界面',productSectionLabel:'深入了解',
    productConceptLabel:'虚构演示界面',productTotalBalance:'账户总余额',
    productMonth:'本月',productIncome:'本月收入',productExpense:'本月支出',
    productNetFlow:'净现金流',productRecentActivity:'近期交易记录',
    productTransport:'交通支出',productTrackNote:'在一个空间里清晰掌握每一笔收入与支出。',
    productAccountOne:'日常账户',productAccountTwo:'本地账户',productAccountThree:'储蓄账户',
    productMultiCurrencyNote:'不同币种分别展示，不进行容易误导的直接加总。',
    productAllocation:'资产配置示例',productAssetGlobal:'全球市场',productAssetGold:'黄金',
    productAssetOther:'其他资产',productTrend:'每月现金流趋势',
    productInsightLabel:'分析概览',productInsightValue:'一眼看清更完整的财务图景。',
    productPlannerMonth:'一周生活概览',productDailyHabits:'每日习惯',
    productLongTermGoals:'长期目标',productPlannerConcept:'日程、习惯与目标——未来让日常生活更有方向的空间。',
    productConceptOnly:'仅为概念预览，尚未上线。',productTablistAria:'浏览 MMHVAULT 产品功能概念展示'
  });
  Object.assign(strings.my,{
    productPickLabel:'ငွေကြေးလုပ်ဆောင်ချက်များ',productChooseHint:'နမူနာမျက်နှာပြင်ကို ကြည့်ရန် လုပ်ဆောင်ချက်တစ်ခု ရွေးပါ။',
    productStageBrand:'/ ထုတ်ကုန် နမူနာ',productStageStatus:'နမူနာမျက်နှာပြင်',productSectionLabel:'ပိုမိုလေ့လာရန်',
    productConceptLabel:'စိတ်ကူးယဉ် နမူနာ',productTotalBalance:'စုစုပေါင်းလက်ကျန်',
    productMonth:'ယခုလ',productIncome:'လစဉ်ဝင်ငွေ',productExpense:'လစဉ်အသုံးစရိတ်',
    productNetFlow:'အသားတင်ငွေစီးဆင်းမှု',productRecentActivity:'လတ်တလောငွေဝင်ငွေထွက်',
    productTransport:'သွားလာရေး',productTrackNote:'ဝင်ငွေနှင့် အသုံးစရိတ်ကို တစ်နေရာတည်းတွင် ရှင်းလင်းစွာ ကြည့်နိုင်ပါသည်။',
    productAccountOne:'နေ့စဉ်အကောင့်',productAccountTwo:'ဒေသတွင်းအကောင့်',productAccountThree:'စုဆောင်းငွေအကောင့်',
    productMultiCurrencyNote:'မတူညီသောငွေကြေးများကို မှားယွင်းစွာ မပေါင်းဘဲ သီးခြားပြသထားပါသည်။',
    productAllocation:'ပိုင်ဆိုင်မှုခွဲဝေမှု နမူနာ',productAssetGlobal:'ကမ္ဘာ့ဈေးကွက်',productAssetGold:'ရွှေ',
    productAssetOther:'အခြားပိုင်ဆိုင်မှု',productTrend:'လစဉ်ငွေစီးဆင်းမှုအခြေအနေ',
    productInsightLabel:'အခြေအနေအကျဉ်းချုပ်',productInsightValue:'ငွေကြေးအခြေအနေကို ပိုမိုရှင်းလင်းစွာ မြင်နိုင်ပါသည်။',
    productPlannerMonth:'တစ်ပတ်တာ အစီအစဉ်',productDailyHabits:'နေ့စဉ်အလေ့အထများ',
    productLongTermGoals:'ရေရှည်ရည်မှန်းချက်များ',productPlannerConcept:'အချိန်ဇယား၊ အလေ့အထနှင့် ရည်မှန်းချက်များအတွက် အနာဂတ်နေရာ။',
    productConceptOnly:'နမူနာသာ ဖြစ်ပြီး မရရှိနိုင်သေးပါ။',productTablistAria:'MMHVAULT ထုတ်ကုန်လုပ်ဆောင်ချက် နမူနာများ'
  });


  // L1.10: compact product detail labels. Fictional illustrations only.
  Object.assign(strings.en, {
    detailDashFactOne:'3 SAMPLE METRICS',detailDashFactTwo:'MONTHLY SNAPSHOT',
    detailTransactionsFactOne:'4 SAMPLE ENTRIES',detailTransactionsFactTwo:'INCOME & EXPENSES',
    detailAccountsFactOne:'3 CURRENCIES',detailAccountsFactTwo:'INDIVIDUAL BALANCES',
    detailInvestFactOne:'3 ASSET GROUPS',detailInvestFactTwo:'100% SAMPLE ALLOCATION',
    detailAnalyzeFactOne:'7 DEMO MONTHS',detailAnalyzeFactTwo:'ILLUSTRATIVE TREND',
    detailLifeFactOne:'PLANNING CONCEPT',detailLifeFactTwo:'NOT YET AVAILABLE'
  });
  Object.assign(strings.zh, {
    detailDashFactOne:'3 项示例指标',detailDashFactTwo:'月度财务概览',
    detailTransactionsFactOne:'4 条虚构记录',detailTransactionsFactTwo:'收支记录展示',
    detailAccountsFactOne:'3 种货币',detailAccountsFactTwo:'余额分别计算',
    detailInvestFactOne:'3 组资产分类',detailInvestFactTwo:'100% 示例配置',
    detailAnalyzeFactOne:'7 个月度示例',detailAnalyzeFactTwo:'虚构趋势展示',
    detailLifeFactOne:'生活规划概念',detailLifeFactTwo:'尚未上线'
  });
  Object.assign(strings.my, {
    detailDashFactOne:'နမူနာညွှန်းကိန်း ၃ ခု',detailDashFactTwo:'လစဉ်အခြေအနေအကျဉ်းချုပ်',
    detailTransactionsFactOne:'စိတ်ကူးယဉ်မှတ်တမ်း ၄ ခု',detailTransactionsFactTwo:'ဝင်ငွေနှင့် အသုံးစရိတ်',
    detailAccountsFactOne:'ငွေကြေး ၃ မျိုး',detailAccountsFactTwo:'လက်ကျန်များကို သီးခြားပြသထားသည်',
    detailInvestFactOne:'ပိုင်ဆိုင်မှုအုပ်စု ၃ ခု',detailInvestFactTwo:'နမူနာခွဲဝေမှု ၁၀၀%',
    detailAnalyzeFactOne:'နမူနာ ၇ လ',detailAnalyzeFactTwo:'နမူနာလမ်းကြောင်းသာ',
    detailLifeFactOne:'ဘဝအစီအစဉ် နမူနာ',detailLifeFactTwo:'မရရှိနိုင်သေးပါ'
  });


  // L1.11 cinematic app mock: every visible app interface label is local-only sample text.
  Object.assign(strings.en,{
  "appExploreTitle": "EXPLORE MMHVAULT",
  "appSelectHint": "Choose a feature to preview a realistic App screen.",
  "appSearchMock": "Search the workspace...",
  "appFictionBadge": "DEMO",
  "appWorkspace": "WORKSPACE",
  "appSimulationStatus": "PREVIEW MODE",
  "appPreviewDisclaimer": "Fictional values · No connection to accounts",
  "appStoryHighlights": "WHAT THIS FEATURE BRINGS",
  "appStoryConcept": "Design demonstration only. No real account information.",
  "appPrevious": "Previous feature",
  "appNext": "Next feature",
  "appThumbExplore": "Preview",
  "appFinancialOverview": "FINANCIAL OVERVIEW",
  "appWelcomeHeadline": "Your financial picture.",
  "appPortfolioTrend": "PORTFOLIO TREND",
  "appAssetAllocation": "ASSET ALLOCATION",
  "appAssetsInvest": "Investments",
  "appAssetsCash": "Cash",
  "appAssetsOther": "Other",
  "appGoals": "FINANCIAL GOALS",
  "appEmergencyFund": "Emergency fund",
  "appSavingsPlan": "Savings plan",
  "appRecordsLabel": "PERSONAL RECORDS",
  "appSearchEntries": "Search records...",
  "appAll": "All",
  "appAssetControl": "YOUR ACCOUNTS",
  "appOriginalCurrency": "ORIGINAL CURRENCY",
  "appAccountsOverview": "ACCOUNT OVERVIEW",
  "appAccountsCount": "ACCOUNTS",
  "appAccountBalances": "ACCOUNT BALANCES",
  "appInvestmentOverview": "INVESTMENT OVERVIEW",
  "appHoldingCost": "HOLDING COST",
  "appHoldingValue": "HOLDING VALUE",
  "appUnrealized": "UNREALIZED P/L",
  "appPerformance": "PERFORMANCE TREND",
  "appHoldings": "HOLDINGS PREVIEW",
  "appFinanceAnalysis": "FINANCIAL ANALYSIS",
  "appRemaining": "REMAINING",
  "appSavingsRate": "SAVINGS RATE",
  "appExpenseBreakdown": "EXPENSE BREAKDOWN",
  "appHousing": "Housing",
  "appFood": "Food",
  "appTravel": "Travel",
  "appMisc": "Other",
  "appLifePlanning": "LIFE PLANNING CONCEPT",
  "appLifeFuture": "A space for the life beyond money.",
  "appFocusedWork": "Focus time",
  "appEveningWalk": "Evening walk",
  "appHealthHabits": "Healthy routine",
  "appLearningGoal": "Learning goals",
  "appBenefitDashboard1": "A complete view of your position",
  "appBenefitDashboard2": "Cash flow and trend insights",
  "appBenefitDashboard3": "Progress toward your goals",
  "appBenefitTransactions1": "Organize income and expenses",
  "appBenefitTransactions2": "Filter and review activity",
  "appBenefitTransactions3": "Understand spending patterns",
  "appBenefitAccounts1": "Keep accounts in one place",
  "appBenefitAccounts2": "Respect original currencies",
  "appBenefitAccounts3": "Clear individual balances",
  "appBenefitInvest1": "Holdings and cost context",
  "appBenefitInvest2": "Understand asset allocations",
  "appBenefitInvest3": "Visualize performance trends",
  "appBenefitAnalyze1": "Monthly income and expenses",
  "appBenefitAnalyze2": "Compare trends over time",
  "appBenefitAnalyze3": "Category-level insights",
  "appBenefitLife1": "Plan schedules and routines",
  "appBenefitLife2": "Track habits and milestones",
  "appBenefitLife3": "Future concept · Coming Soon"
});
  Object.assign(strings.zh,{
  "appExploreTitle": "探索 MMHVAULT",
  "appSelectHint": "选择功能，查看贴近真实 App 的演示页面。",
  "appSearchMock": "搜索工作空间…",
  "appFictionBadge": "演示",
  "appWorkspace": "工作空间",
  "appSimulationStatus": "演示模式",
  "appPreviewDisclaimer": "全部金额均为虚构 · 未连接账户",
  "appStoryHighlights": "功能亮点",
  "appStoryConcept": "仅为设计演示，不显示真实账户信息。",
  "appPrevious": "上一个功能",
  "appNext": "下一个功能",
  "appThumbExplore": "查看",
  "appFinancialOverview": "财务总览",
  "appWelcomeHeadline": "您的财务全貌。",
  "appPortfolioTrend": "资产趋势",
  "appAssetAllocation": "资产配置",
  "appAssetsInvest": "投资",
  "appAssetsCash": "现金",
  "appAssetsOther": "其他",
  "appGoals": "财务目标",
  "appEmergencyFund": "应急储备金",
  "appSavingsPlan": "储蓄计划",
  "appRecordsLabel": "个人收支记录",
  "appSearchEntries": "搜索收支记录…",
  "appAll": "全部",
  "appAssetControl": "账户管理",
  "appOriginalCurrency": "原始币种",
  "appAccountsOverview": "账户概览",
  "appAccountsCount": "个账户",
  "appAccountBalances": "账户余额",
  "appInvestmentOverview": "投资总览",
  "appHoldingCost": "持仓成本",
  "appHoldingValue": "持仓市值",
  "appUnrealized": "未实现盈亏",
  "appPerformance": "收益趋势",
  "appHoldings": "持仓概览",
  "appFinanceAnalysis": "财务分析",
  "appRemaining": "结余",
  "appSavingsRate": "储蓄率",
  "appExpenseBreakdown": "支出分类",
  "appHousing": "住房",
  "appFood": "餐饮",
  "appTravel": "出行",
  "appMisc": "其他",
  "appLifePlanning": "生活规划概念",
  "appLifeFuture": "为财务以外的重要生活留出空间。",
  "appFocusedWork": "专注工作",
  "appEveningWalk": "晚间散步",
  "appHealthHabits": "健康习惯",
  "appLearningGoal": "学习目标",
  "appBenefitDashboard1": "全面了解资产与净值",
  "appBenefitDashboard2": "查看现金流与走势",
  "appBenefitDashboard3": "掌握财务目标进度",
  "appBenefitTransactions1": "集中整理收支记录",
  "appBenefitTransactions2": "快速筛选与查看流水",
  "appBenefitTransactions3": "了解日常消费习惯",
  "appBenefitAccounts1": "统一管理多种账户",
  "appBenefitAccounts2": "保留原始币种展示",
  "appBenefitAccounts3": "清楚区分每个账户余额",
  "appBenefitInvest1": "清晰了解本金与持仓",
  "appBenefitInvest2": "查看投资资产配置",
  "appBenefitInvest3": "掌握收益趋势",
  "appBenefitAnalyze1": "分析每月收支变化",
  "appBenefitAnalyze2": "比较不同月份趋势",
  "appBenefitAnalyze3": "了解分类开销",
  "appBenefitLife1": "规划日程与日常习惯",
  "appBenefitLife2": "追踪目标与里程碑",
  "appBenefitLife3": "未来功能 · 即将推出"
});
  Object.assign(strings.my,{
  "appExploreTitle": "MMHVAULT ကို လေ့လာပါ",
  "appSelectHint": "App ပုံစံနမူနာကို ကြည့်ရန် လုပ်ဆောင်ချက်တစ်ခု ရွေးပါ။",
  "appSearchMock": "ရှာဖွေရန်…",
  "appFictionBadge": "နမူနာ",
  "appWorkspace": "အလုပ်နေရာ",
  "appSimulationStatus": "နမူနာပြသမှု",
  "appPreviewDisclaimer": "ငွေပမာဏအားလုံး နမူနာသာ · အကောင့်နှင့် မချိတ်ဆက်ထားပါ",
  "appStoryHighlights": "အဓိကလုပ်ဆောင်ချက်များ",
  "appStoryConcept": "ဒီဇိုင်းနမူနာသာ ဖြစ်ပြီး အကောင့်အစစ်၏ အချက်အလက်များ မပါဝင်ပါ။",
  "appPrevious": "ယခင်လုပ်ဆောင်ချက်",
  "appNext": "နောက်လုပ်ဆောင်ချက်",
  "appThumbExplore": "ကြည့်ရှုရန်",
  "appFinancialOverview": "ငွေကြေးအခြေအနေ",
  "appWelcomeHeadline": "သင့်ငွေကြေးအခြေအနေ။",
  "appPortfolioTrend": "ပိုင်ဆိုင်မှုလမ်းကြောင်း",
  "appAssetAllocation": "ပိုင်ဆိုင်မှုခွဲဝေမှု",
  "appAssetsInvest": "ရင်းနှီးမြှုပ်နှံမှု",
  "appAssetsCash": "ငွေသား",
  "appAssetsOther": "အခြား",
  "appGoals": "ငွေကြေးရည်မှန်းချက်များ",
  "appEmergencyFund": "အရေးပေါ်ရန်ပုံငွေ",
  "appSavingsPlan": "စုဆောင်းငွေစီမံချက်",
  "appRecordsLabel": "ကိုယ်ပိုင်မှတ်တမ်းများ",
  "appSearchEntries": "မှတ်တမ်းများ ရှာဖွေရန်…",
  "appAll": "အားလုံး",
  "appAssetControl": "သင့်အကောင့်များ",
  "appOriginalCurrency": "မူရင်းငွေကြေး",
  "appAccountsOverview": "အကောင့်အကျဉ်းချုပ်",
  "appAccountsCount": "အကောင့်များ",
  "appAccountBalances": "အကောင့်လက်ကျန်များ",
  "appInvestmentOverview": "ရင်းနှီးမြှုပ်နှံမှုအကျဉ်းချုပ်",
  "appHoldingCost": "ဝယ်ယူထားသောတန်ဖိုး",
  "appHoldingValue": "လက်ရှိတန်ဖိုး",
  "appUnrealized": "မရောင်းရသေးသော အမြတ်/အရှုံး",
  "appPerformance": "အကျိုးအမြတ်လမ်းကြောင်း",
  "appHoldings": "ကိုင်ဆောင်မှုအကျဉ်းချုပ်",
  "appFinanceAnalysis": "ငွေကြေးသုံးသပ်ချက်",
  "appRemaining": "ကျန်ငွေ",
  "appSavingsRate": "စုဆောင်းမှုနှုန်း",
  "appExpenseBreakdown": "အသုံးစရိတ်ခွဲခြားမှု",
  "appHousing": "နေအိမ်",
  "appFood": "စားသောက်",
  "appTravel": "သွားလာရေး",
  "appMisc": "အခြား",
  "appLifePlanning": "ဘဝအစီအစဉ် နမူနာ",
  "appLifeFuture": "ငွေကြေးအပြင် အရေးကြီးသောဘဝအတွက် နေရာတစ်ခု။",
  "appFocusedWork": "အာရုံစိုက်အလုပ်",
  "appEveningWalk": "ညနေ လမ်းလျှောက်",
  "appHealthHabits": "ကျန်းမာရေးအလေ့အထ",
  "appLearningGoal": "သင်ယူရေးရည်မှန်းချက်",
  "appBenefitDashboard1": "ပိုင်ဆိုင်မှုနှင့် စုစုပေါင်းတန်ဖိုး",
  "appBenefitDashboard2": "ငွေစီးဆင်းမှုနှင့် လမ်းကြောင်း",
  "appBenefitDashboard3": "ငွေကြေးပန်းတိုင် တိုးတက်မှု",
  "appBenefitTransactions1": "ဝင်ငွေနှင့် အသုံးစရိတ် စုစည်းမှု",
  "appBenefitTransactions2": "မှတ်တမ်းများ စစ်ထုတ်ကြည့်ရှုမှု",
  "appBenefitTransactions3": "အသုံးစရိတ်ပုံစံ လေ့လာမှု",
  "appBenefitAccounts1": "အကောင့်အားလုံး တစ်နေရာတည်း",
  "appBenefitAccounts2": "မူရင်းငွေကြေးအလိုက် ပြသမှု",
  "appBenefitAccounts3": "အကောင့်တစ်ခုချင်းစီ၏ လက်ကျန်",
  "appBenefitInvest1": "ရင်းနှီးမြှုပ်နှံမှုကုန်ကျစရိတ်",
  "appBenefitInvest2": "ပိုင်ဆိုင်မှုခွဲဝေမှု",
  "appBenefitInvest3": "အကျိုးအမြတ်လမ်းကြောင်း",
  "appBenefitAnalyze1": "လစဉ် ဝင်ငွေနှင့် အသုံးစရိတ်",
  "appBenefitAnalyze2": "လအလိုက် နှိုင်းယှဉ်မှု",
  "appBenefitAnalyze3": "အမျိုးအစားအလိုက် သုံးသပ်မှု",
  "appBenefitLife1": "အချိန်ဇယားနှင့် အလေ့အထများ",
  "appBenefitLife2": "ရည်မှန်းချက်တိုးတက်မှု",
  "appBenefitLife3": "အနာဂတ်လုပ်ဆောင်ချက် · မကြာမီ"
});
  // L1.12 premium Accounts demo only
  Object.assign(strings.en,{appAccountCurrencies:'CURRENCIES',appAccountActive:'ACTIVE',appAccountSample:'ILLUSTRATIVE ACCOUNTS',appAccountCollection:'Your accounts, at a glance',appAccountEveryday:'PERSONAL · CASH',appAccountLocal:'BANK · LOCAL',appAccountSavings:'SAVINGS · RESERVE',appOriginalBalance:'ORIGINAL BALANCE'});
  Object.assign(strings.zh,{appAccountCurrencies:'币种数量',appAccountActive:'使用中',appAccountSample:'虚构演示账户',appAccountCollection:'一眼掌握所有账户',appAccountEveryday:'个人 · 现金',appAccountLocal:'银行 · 本地',appAccountSavings:'储蓄 · 备用金',appOriginalBalance:'原币种余额'});
  Object.assign(strings.my,{appAccountCurrencies:'ငွေကြေးအမျိုးအစား',appAccountActive:'အသုံးပြုနေ',appAccountSample:'စိတ်ကူးယဉ်အကောင့်များ',appAccountCollection:'အကောင့်များကို တစ်နေရာတည်းတွင် ကြည့်ရန်',appAccountEveryday:'ကိုယ်ပိုင် · ငွေသား',appAccountLocal:'ဘဏ် · ဒေသတွင်း',appAccountSavings:'စုဆောင်းငွေ · သီးသန့်',appOriginalBalance:'မူရင်းငွေကြေးလက်ကျန်'});

  // L1.13: Compact App details, all demonstration data only.
  Object.assign(strings.en,{"appRecentAndGoals":"ACTIVITY & GOALS","appTransactionPay":"PAYROLL","appTransactionDaily":"EVERYDAY","appTransactionLiving":"LIVING","appTransactionTransport":"TRAVEL","appTransactionDetail":"4 SAMPLE TRANSACTIONS","appMockCurrency":"DISPLAYED IN USD","appAssetEtf":"GLOBAL ETF","appAssetGold":"GOLD","appAssetReserve":"OTHER ASSETS","appInvestHoldingsDisclaimer":"ILLUSTRATIVE PORTFOLIO","appInsightPeak":"HIGHEST DEMO MONTH","appInsightCategory":"LARGEST EXPENSE CATEGORY","appLifeSampleInfo":"ILLUSTRATIVE LIFE PLANNING PREVIEW"});
  Object.assign(strings.zh,{"appRecentAndGoals":"近期动态与目标","appTransactionPay":"薪资","appTransactionDaily":"日常","appTransactionLiving":"生活","appTransactionTransport":"交通","appTransactionDetail":"4 条虚构收支记录","appMockCurrency":"示例币种：美元","appAssetEtf":"全球 ETF","appAssetGold":"黄金","appAssetReserve":"其他资产","appInvestHoldingsDisclaimer":"虚构投资组合","appInsightPeak":"示例最高月份","appInsightCategory":"最大支出分类","appLifeSampleInfo":"生活规划概念演示"});
  Object.assign(strings.my,{"appRecentAndGoals":"လှုပ်ရှားမှုနှင့် ပန်းတိုင်များ","appTransactionPay":"လစာ","appTransactionDaily":"နေ့စဉ်","appTransactionLiving":"နေထိုင်မှု","appTransactionTransport":"သွားလာရေး","appTransactionDetail":"စိတ်ကူးယဉ်ငွေဝင်ငွေထွက် ၄ ခု","appMockCurrency":"အမေရိကန်ဒေါ်လာဖြင့် ပြသထားသည်","appAssetEtf":"ကမ္ဘာ့ ETF","appAssetGold":"ရွှေ","appAssetReserve":"အခြားပိုင်ဆိုင်မှု","appInvestHoldingsDisclaimer":"နမူနာရင်းနှီးမြှုပ်နှံမှု","appInsightPeak":"နမူနာအမြင့်ဆုံးလ","appInsightCategory":"အများဆုံးအသုံးစရိတ်အမျိုးအစား","appLifeSampleInfo":"ဘဝအစီအစဉ် နမူနာမျက်နှာပြင်"});

  // L1.15 Business editorial: future-function status must remain explicit in every locale.
  Object.assign(strings.en,{"businessPerspectivePersonal":"Personal finance","businessPerspectivePersonalNote":"A clearer view of today","businessPerspectiveBusiness":"Business ambitions","businessPerspectiveBusinessNote":"A future workspace concept","businessPhotoCaption":"PERSONAL × FUTURE BUSINESS","businessPhotoCaptionNote":"Illustrative concept","businessSideNote":"One considered visual language for your money today and the venture you may build tomorrow."});
  Object.assign(strings.zh,{"businessPerspectivePersonal":"个人财务","businessPerspectivePersonalNote":"看清当下的每一笔资金","businessPerspectiveBusiness":"未来事业","businessPerspectiveBusinessNote":"规划中的商业财务空间","businessPhotoCaption":"个人财务 × 未来商业","businessPhotoCaptionNote":"概念设计展示","businessSideNote":"以统一的高级视觉，连接今日的个人财富与未来的事业规划。"});
  Object.assign(strings.my,{"businessPerspectivePersonal":"ကိုယ်ပိုင်ငွေကြေး","businessPerspectivePersonalNote":"ယနေ့ငွေကြေးအခြေအနေကို ရှင်းလင်းစွာ","businessPerspectiveBusiness":"အနာဂတ်လုပ်ငန်း","businessPerspectiveBusinessNote":"အနာဂတ်လုပ်ငန်းအတွက် ဒီဇိုင်းနမူနာ","businessPhotoCaption":"ကိုယ်ပိုင်ငွေကြေး × အနာဂတ်လုပ်ငန်း","businessPhotoCaptionNote":"ဒီဇိုင်းနမူနာသာ","businessSideNote":"ယနေ့ ကိုယ်ပိုင်ငွေကြေးနှင့် အနာဂတ်စီးပွားရေးရည်မှန်းချက်များအတွက် တစ်သမတ်တည်းသော ဒီဇိုင်း။"});

  // L1.16: Switchable illustrative Personal / future Business stage details.
  Object.assign(strings.en,{"personalContextEyebrow":"PERSONAL FINANCIAL PICTURE","businessContextEyebrow":"BUSINESS FINANCIAL CONCEPT","personalContextTitle":"Your personal picture","personalContextNote":"A considered view of everyday finances — illustrative figures only.","personalContextState":"PERSONAL · CONCEPT","businessContextTitle":"A vision for your future business","businessContextNote":"Explore revenue, operating costs and cash flow in an illustrative workspace.","businessContextState":"BUSINESS · COMING SOON","personalDemoIncomeLabel":"INCOME","personalDemoOutgoingLabel":"EXPENSES","businessDemoIncomeLabel":"REVENUE","businessDemoOutgoingLabel":"OPERATING COSTS","businessDemoThird":"OPERATING RESERVE"});
  Object.assign(strings.zh,{"personalContextEyebrow":"个人财务概览","businessContextEyebrow":"商业财务概念展示","personalContextTitle":"清晰掌握个人财务","personalContextNote":"通过虚构示例，更直观地了解日常收支和资金状况。","personalContextState":"个人财务 · 概念","businessContextTitle":"探索未来商业财务空间","businessContextNote":"通过概念界面了解营业收入、经营成本及现金流。","businessContextState":"商业财务 · 即将推出","personalDemoIncomeLabel":"收入","personalDemoOutgoingLabel":"支出","businessDemoIncomeLabel":"营业收入","businessDemoOutgoingLabel":"经营成本","businessDemoThird":"经营储备金"});
  Object.assign(strings.my,{"personalContextEyebrow":"ကိုယ်ပိုင်ငွေကြေးအခြေအနေ","businessContextEyebrow":"လုပ်ငန်းငွေကြေး ဒီဇိုင်းနမူနာ","personalContextTitle":"သင့်ကိုယ်ပိုင် ငွေကြေးအခြေအနေ","personalContextNote":"နေ့စဉ်ဝင်ငွေနှင့် အသုံးစရိတ်ကို နမူနာအချက်အလက်များဖြင့် ကြည့်ရှုပါ။","personalContextState":"ကိုယ်ပိုင် · နမူနာ","businessContextTitle":"သင့်အနာဂတ်လုပ်ငန်းအတွက် အမြင်သစ်","businessContextNote":"လုပ်ငန်းဝင်ငွေ၊ လည်ပတ်စရိတ်နှင့် ငွေစီးဆင်းမှုကို နမူနာကြည့်ရှုပါ။","businessContextState":"လုပ်ငန်း · မကြာမီ","personalDemoIncomeLabel":"ဝင်ငွေ","personalDemoOutgoingLabel":"အသုံးစရိတ်","businessDemoIncomeLabel":"လုပ်ငန်းဝင်ငွေ","businessDemoOutgoingLabel":"လည်ပတ်စရိတ်","businessDemoThird":"လုပ်ငန်းအရန်ငွေ"});

  // L1.19 Closing CTA / Footer translations only.
  Object.assign(strings.en,{"closingExplore":"Explore the workspace","footerExploreTitle":"EXPLORE","footerTrustTitle":"INFORMATION","footerBackTop":"Back to top"});
  Object.assign(strings.zh,{"closingExplore":"探索财务空间","footerExploreTitle":"探索 MMHVAULT","footerTrustTitle":"政策与说明","footerBackTop":"返回顶部"});
  Object.assign(strings.my,{"closingExplore":"ငွေကြေးစီမံခန့်ခွဲမှုကို လေ့လာရန်","footerExploreTitle":"လေ့လာရန်","footerTrustTitle":"အချက်အလက်များ","footerBackTop":"အပေါ်သို့ ပြန်သွားရန်"});

  // L1.22 mobile Sign In / Sign Up entry labels; auth remains isolated.
  Object.assign(strings.en,{"mobileAuthHeading":"SECURE ACCOUNT ACCESS","mobileRegister":"Create Account","mobileRegisterNote":"To register, select Sign Up on the access page."});
  Object.assign(strings.zh,{"mobileAuthHeading":"账户登录与注册","mobileRegister":"注册账户","mobileRegisterNote":"进入后选择“Sign Up”即可注册。"});
  Object.assign(strings.my,{"mobileAuthHeading":"လုံခြုံသော အကောင့်ဝင်ရောက်မှု","mobileRegister":"အကောင့်ဖွင့်ရန်","mobileRegisterNote":"အကောင့်ဖွင့်ရန် ဝင်ရောက်မှုစာမျက်နှာရှိ Sign Up ကို ရွေးပါ။"});

  const htmlKeys = new Set(['heroTitle', 'featuresTitle', 'businessHeading', 'whyTitle', 'closingTitle']);
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
  let currentBusinessView = 'personal';
  const businessTabs = [...document.querySelectorAll('[data-business-view]')];
  const conceptData = {
    personal: { balance:'$24,680.50',income:'$4,860.00',outgoing:'$2,140.00',third:'$12,000',cash:'$2,720.00',assets:'$42,800.00',row1:'+$2,500',row2:'−$85',row3:'−$400',shares:{available:'44%',invested:'34%',reserved:'22%'} },
    business: { balance:'$366,250.00',income:'$58,900.00',outgoing:'$22,650.00',third:'$156,200',cash:'$36,250.00',assets:'$492,800.00',row1:'+$12,000',row2:'−$2,400',row3:'−$320',shares:{available:'34%',invested:'33%',reserved:'33%'} }
  };
  function updateBusinessPreview(view) {
    currentBusinessView = view === 'business' ? 'business' : 'personal';
    const prefix = currentBusinessView === 'business' ? 'business' : 'personal';
    const dictionary = strings[currentLang];
    businessTabs.forEach(button => {
      const selected = button.dataset.businessView === currentBusinessView;
      button.setAttribute('aria-pressed',String(selected));
      button.classList.toggle('is-selected',selected);
    });
    document.querySelectorAll('[data-business-amount]').forEach(element => {
      element.textContent = conceptData[currentBusinessView][element.dataset.businessAmount] || '';
    });
    document.querySelectorAll('[data-business-share]').forEach(element=>{
      const value=conceptData[currentBusinessView].shares[element.dataset.businessShare];
      if(value) element.textContent=value;
    });
    const keyMap = {
      eyebrow: prefix + 'ContextEyebrow',
      contextTitle: prefix + 'ContextTitle',
      contextNote: prefix + 'ContextNote',
      contextState: prefix + 'ContextState',
      incomeLabel: prefix + 'DemoIncomeLabel',
      outgoingLabel: prefix + 'DemoOutgoingLabel',
      title: prefix + 'DemoTitle',
      balanceLabel: prefix + 'DemoBalance',
      delta: prefix + 'DemoDelta',
      thirdLabel: prefix + 'DemoThird',
      cashLabel: prefix + 'DemoCashLabel',
      cashNote: prefix + 'DemoCashNote',
      assetLabel: prefix + 'DemoAssetLabel',
      assetNote: prefix + 'DemoAssetNote',
      reportTitle: prefix + 'DemoReportTitle',
      row1: prefix + 'Row1',
      row2: prefix + 'Row2',
      row3: prefix + 'Row3'
    };
    document.querySelectorAll('[data-business-text]').forEach(element => {
      const key = keyMap[element.dataset.businessText];
      element.setAttribute('data-i18n',key);
      element.textContent = dictionary[key] || '';
    });
    const panel = document.querySelector('.business-stage');
    if(panel) panel.dataset.currentView = currentBusinessView;
  }
  businessTabs.forEach(button => button.addEventListener('click', () => {
    updateBusinessPreview(button.dataset.businessView);
  }));


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
    updateBusinessPreview(currentBusinessView);
    // Keep the currently selected feature story in the new display language.
    const storyDesc=document.querySelector('[data-app-story-desc]');
    const storyIndex=productNames.indexOf(activeProduct);
    if(storyDesc&&storyIndex>=0){
      const key=productFeatureKeys[activeProduct];
      storyDesc.setAttribute('data-i18n',key);
      storyDesc.textContent=dict[key]||'';
    }
    document.querySelectorAll('[data-app-story-benefit]').forEach(node=>{
      const key='appBenefit'+productCap[activeProduct]+(Number(node.dataset.appStoryBenefit)+1);
      node.setAttribute('data-i18n',key);node.textContent=dict[key]||'';
    });
    const appStory = document.querySelector('.app-story');
    if (appStory) appStory.setAttribute('aria-label',dict.appStoryHighlights);
    const tablist = document.querySelector('.product-tablist');
    if (tablist) tablist.setAttribute('aria-label', dict.productTablistAria);
    // Translate descriptive controls and photographic alt text without changing the fixed Hero copy.
    const businessTabbar = document.querySelector('.business-tabbar');
    const businessInsights = document.querySelector('.business-insight-grid');
    if (businessTabbar) businessTabbar.setAttribute('aria-label', dict.businessTabsAria);
    if (businessInsights) businessInsights.setAttribute('aria-label', dict.businessInsightsAria);
    const heroArt = document.querySelector('.hero-art');
    const heroPhoto = document.querySelector('.hero-device-cinematic');
    const businessPhoto = document.querySelector('.business-visual-frame img');
    if (heroArt) heroArt.setAttribute('aria-label', dict.heroImageAlt);
    if (heroPhoto) heroPhoto.setAttribute('alt', dict.heroImageAlt);
    if (businessPhoto) businessPhoto.setAttribute('alt', dict.businessPhotoAlt);
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
  const media = window.matchMedia('(min-width: 1051px)');
  if (typeof media.addEventListener === 'function') media.addEventListener('change', closeMenu);

  // Keeps the top navigation aligned with the section being viewed.
  // Does not affect history, app navigation, tokens, or the immutable Hero.
  const sectionLinks = [...document.querySelectorAll('#primary-nav a[href^="#"]')];
  const sectionMap = new Map(sectionLinks.map(link => [link.getAttribute('href').slice(1), link]));
  function markSection(id) {
    sectionLinks.forEach(link => {
      if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  markSection('top');
  if ('IntersectionObserver' in window) {
    const sections = [...document.querySelectorAll('main section[id]')];
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      });
      const closest = [...visible].sort((a,b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
      if (closest && sectionMap.has(closest[0])) markSection(closest[0]);
      else if (window.scrollY < 130) markSection('top');
    }, {rootMargin:'-24% 0px -52% 0px',threshold:0});
    sections.forEach(section => observer.observe(section));
  }
  sectionLinks.forEach(link => link.addEventListener('click', () => {
    const target = link.getAttribute('href').slice(1);
    if (sectionMap.has(target)) markSection(target);
  }));

  // L1.12: one navigation only (left-side feature selector).
  const productTabs=[...document.querySelectorAll('[data-product-tab]')];
  const productPanels=[...document.querySelectorAll('[data-product-panel]')];
  const productNames=productTabs.map(t=>t.dataset.productTab);
  const productLabels={dashboard:'Dashboard',transactions:'Transactions',accounts:'Accounts',invest:'Invest',analyze:'Analyze',life:'Life Planner'};
  const productFeatureKeys={dashboard:'featureDashboard',transactions:'featureTransactions',accounts:'featureAccounts',invest:'featureInvest',analyze:'featureAnalyze',life:'featureLife'};
  const productCap={dashboard:'Dashboard',transactions:'Transactions',accounts:'Accounts',invest:'Invest',analyze:'Analyze',life:'Life'};
  let activeProduct='dashboard';
  function selectProductView(view,focus=false){
    const name=productNames.includes(view)?view:'dashboard';
    activeProduct=name;
    productTabs.forEach(t=>{const yes=t.dataset.productTab===name;t.classList.toggle('is-active',yes);t.setAttribute('aria-selected',String(yes));t.tabIndex=yes?0:-1;if(yes&&focus)t.focus()});
    productPanels.forEach(p=>{p.hidden=p.dataset.productPanel!==name});
    const stage=document.querySelector('.product-stage');if(stage)stage.dataset.productCurrent=name;
    const idx=document.querySelector('[data-app-story-index]');if(idx)idx.textContent=String(productNames.indexOf(name)+1).padStart(2,'0')+' / 06';
    const title=document.querySelector('[data-app-story-title]');if(title)title.textContent=productLabels[name];
    const dict=strings[currentLang], desc=document.querySelector('[data-app-story-desc]'),key=productFeatureKeys[name];
    if(desc){desc.setAttribute('data-i18n',key);desc.textContent=dict[key]||''}
    document.querySelectorAll('[data-app-story-benefit]').forEach(node=>{const k='appBenefit'+productCap[name]+(Number(node.dataset.appStoryBenefit)+1);node.setAttribute('data-i18n',k);node.textContent=dict[k]||''});
    const pane=document.querySelector('.app-sim-content');if(pane)pane.scrollTop=0;
  }
  productTabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectProductView(tab.dataset.productTab));tab.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();
    const step=(e.key==='ArrowDown'||e.key==='ArrowRight')?1:-1;
    const next=e.key==='Home'?0:e.key==='End'?productTabs.length-1:(i+step+productTabs.length)%productTabs.length;
    selectProductView(productTabs[next].dataset.productTab,true);
  })});
  const syncProductHash=()=>{const s=window.location.hash.slice(1);if(s.startsWith('feature-')&&productNames.includes(s.slice(8)))selectProductView(s.slice(8))};
  window.addEventListener('hashchange',syncProductHash);syncProductHash();

  // Progressive enhancement: retain the original in-page HTML device demonstration
  // until the independent photographic asset has loaded. No authentication or network API.
  const heroPhoto = document.querySelector('.hero-device-cinematic');
  if (heroPhoto) {
    const revealPhoto = () => {
      if (heroPhoto.naturalWidth > 0) {
        const art = heroPhoto.closest('.hero-art');
        if (art) art.classList.add('is-photo-ready');
      }
    };
    if (heroPhoto.complete) revealPhoto();
    else heroPhoto.addEventListener('load', revealPhoto, {once:true});
  }

  let saved = 'en';
  try { const stored = window.localStorage.getItem(storageKey); if (stored === 'zh' || stored === 'my') saved = stored; } catch (_) {}
  applyLanguage(saved);
})();
