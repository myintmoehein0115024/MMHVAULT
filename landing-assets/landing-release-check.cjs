// Read-only MMHVAULT Landing production-release gate.
// No credentials, network calls, database writes, or external dependencies.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const read = path => fs.readFileSync(path,'utf8');
const main = 'origin/main';
const source = path => {
 const r=cp.spawnSync('git',['show',main+':'+path],{encoding:'utf8',maxBuffer:1024*1024*2});
 assert.equal(r.status,0,'Cannot read original main:'+path);
 return r.stdout;
};
const l164HomeLink="  <link rel=\"stylesheet\" href=\"./landing-assets/safari-performance-l164.css?v=l164\">";
const l164PublicLink="<link rel=\"stylesheet\" href=\"/landing-assets/safari-performance-l164.css?v=l164\">";
const l165HomeLink="  <link rel=\"stylesheet\" href=\"./landing-assets/safari-performance-l164.css?v=l165\">";
const l165PublicLink="<link rel=\"stylesheet\" href=\"/landing-assets/safari-performance-l164.css?v=l165\">";
const l166HomeLink="  <link rel=\"stylesheet\" href=\"./landing-assets/safari-performance-l164.css?v=l166\">";
const l166PublicLink="<link rel=\"stylesheet\" href=\"/landing-assets/safari-performance-l164.css?v=l166\">";
const l166SafariPatch="\n/* L1.66 — desktop Hero uses its existing soft radial gradient without\n * another large blur surface. Mobile/tablet appearance is untouched. */\n@media (min-width: 1025px) {\n  body.l131 .hero-halo {\n    filter: none;\n  }\n}\n";
const l165SafariPatch="\n/* L1.65 — desktop Safari paint budget: preserve the premium hover end states\n * while avoiding large per-frame shadow interpolation on six showcase cards.\n * The Business ambient glow is already a soft radial gradient, so its extra\n * offscreen blur layer is redundant during long-page scrolling. */\n@media (min-width: 1025px) {\n  body.l131 #business .business-stage::after {\n    filter: none;\n  }\n}\n@media (min-width: 1025px) and (hover: hover) and (pointer: fine) {\n  body.l131 .showcase-v2 .showcase-card,\n  html.mm-motion-active body.l131 .showcase-v2 .showcase-card {\n    transition-property: opacity, transform, border-color;\n  }\n}\n";
const l164PublicAnchor="<link rel=\"stylesheet\" href=\"/landing-assets/shared-header-l116.css?v=1\">";
const l164HomeAnchor="  <link rel=\"stylesheet\" href=\"./landing-assets/header-explore-l147.min.css?v=l147\">";
const l164SafariCSS="/* L1.64 — desktop WebKit-friendly presentation, shared public site only.\n * The sticky header is already near-opaque. Avoid sampling and blurring the\n * entire viewport behind it on every scroll frame. Preserve its blue/gold\n * gradient, translucency-like depth, border, shadow and all interactions.\n * This also helps other desktop engines; phone/tablet styles are untouched. */\n@media (min-width: 1025px) {\n  body.mmh-nav-unified .site-header {\n    -webkit-backdrop-filter: none;\n    backdrop-filter: none;\n    background: linear-gradient(180deg, #071928, #051625);\n  }\n  /* These cards already paint nearly opaque gradients. Removing their live\n   * backdrop sampling avoids six separate offscreen compositing surfaces. */\n  body.l131 .showcase-v2 .showcase-card {\n    -webkit-backdrop-filter: none;\n    backdrop-filter: none;\n  }\n  /* The ambient shapes and Hero glow already use soft radial gradients;\n   * their very large filter blur layers need not be repainted on scroll. */\n  body.l131 .ambient,\n  body.l131 .hero::after {\n    filter: none;\n  }\n}\n";
const l164WorkflowSuffix="\n  webkit-desktop-qa:\n    name: macOS WebKit desktop Safari-engine QA (no auth)\n    runs-on: macos-15\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - name: Install isolated WebKit test driver\n        run: |\n          npm install --no-save --no-package-lock --no-audit --no-fund playwright-core@1.56.1\n          node node_modules/playwright-core/cli.js install webkit\n      - name: Run native macOS WebKit public-only desktop regression\n        run: |\n          python3 -m http.server 8765 --bind 127.0.0.1 >/tmp/mmhvault-safari-http.log 2>&1 &\n          SERVER_PID=$!\n          trap 'kill \"$SERVER_PID\"' EXIT\n          sleep 2\n          node landing-assets/landing-webkit-check.cjs\n";
const l164WorkflowOnlyEdited=()=>
  read('.github/workflows/landing-release-check.yml')===
  source('.github/workflows/landing-release-check.yml') &&
  source('.github/workflows/landing-release-check.yml').endsWith(l164WorkflowSuffix);
const rawCurrent = read('index.html');
const rawPrevious=source('index.html');
// Verify the one allowed addition separately, then run all legacy content
// preservation checks on the exact pre-analytics homepage.
const analyticsAddition = /<!-- MMHVAULT Website Analytics V1: public Landing page views only; no auth or finance data\. -->\n<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon='\{"token":"[a-f0-9]{32}"\}'><\/script>\n/;
assert.equal((rawCurrent.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g)||[]).length,1,'Exactly one Cloudflare beacon required');
assert.ok(analyticsAddition.test(rawCurrent),'Unexpected analytics snippet');
assert.equal((rawPrevious.match(analyticsAddition)||[]).length,1,'Released main must contain Analytics V1');
assert.equal((rawCurrent.match(analyticsAddition)||[])[0],(rawPrevious.match(analyticsAddition)||[])[0],
  'L1.57 must preserve the exact already-released analytics beacon');
const prev=rawPrevious.replace(analyticsAddition,'').replace(l165HomeLink+'\n','');
const current = rawCurrent.replace(analyticsAddition,'').replace(l166HomeLink+'\n','');
// Legacy release checks below validate all previously approved Landing differences.

// L1.41: preserve every byte of the published homepage except the nine
// first-party asset query strings. This avoids mixed cached CSS and JS after
// a deploy without altering content, SEO, authentication or the public header.
const l141AssetReplacements=[
  [
    "href=\"./landing-assets/landing.css\"",
    "href=\"./landing-assets/landing.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/business.css\"",
    "href=\"./landing-assets/business.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/cinematic.css\"",
    "href=\"./landing-assets/cinematic.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/premium-l131.css?v=1\"",
    "href=\"./landing-assets/premium-l131.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/motion-l132.css?v=1\"",
    "href=\"./landing-assets/motion-l132.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/explore-l114.css?v=1\"",
    "href=\"./landing-assets/explore-l114.css?v=l141\""
  ],
  [
    "href=\"./landing-assets/shared-header-l116.css?v=1\"",
    "href=\"./landing-assets/shared-header-l116.css?v=l141\""
  ],
  [
    "src=\"./landing-assets/landing.js\"",
    "src=\"./landing-assets/landing.js?v=l141\""
  ],
  [
    "src=\"./landing-assets/motion-l132.js?v=1\"",
    "src=\"./landing-assets/motion-l132.js?v=l141\""
  ]
];
// L1.42: entire homepage is byte-for-byte identical to main except the
// below-fold Business stylesheet's non-blocking loading and no-script fallback.
const l142OldBusinessTag="  <link rel=\"stylesheet\" href=\"./landing-assets/business.css?v=l141\">";
const l142NewBusinessTag="  <!-- L1.42: business section is below the fold; do not block initial Hero paint. -->\n  <link rel=\"stylesheet\" href=\"./landing-assets/business.css?v=l141\" media=\"print\" onload=\"this.onload=null;this.media='all'\">\n  <noscript><link rel=\"stylesheet\" href=\"./landing-assets/business.css?v=l141\"></noscript>";
// L1.44: only the motion stylesheet link and its no-script fallback can change.
const l144OldMotionTag="  <link rel=\"stylesheet\" href=\"./landing-assets/motion-l132.css?v=l141\">";
const l144NewMotionTag="  <!-- L1.44: animation-only layer is progressive enhancement, not first-paint critical. -->\n  <link rel=\"stylesheet\" href=\"./landing-assets/motion-l132.css?v=l141\" media=\"print\" onload=\"this.onload=null;this.media='all'\">\n  <noscript><link rel=\"stylesheet\" href=\"./landing-assets/motion-l132.css?v=l141\"></noscript>";
// L1.45: preserve every homepage byte except one version change for the
// compacted first-party stylesheet; all previous L1.44 URL guards stay.
const l145OldLandingTag='<link rel="stylesheet" href="./landing-assets/landing.css?v=l141">';
const l145NewLandingTag='<link rel="stylesheet" href="./landing-assets/landing.min.css?v=l145">';
// L1.47 replaces only the two adjacent header CSS links, preserving cascade.
const l147OldHeaderTags='  <link rel="stylesheet" href="./landing-assets/explore-l114.css?v=l141">\n'+
 '  <link rel="stylesheet" href="./landing-assets/shared-header-l116.css?v=l141">';
const l147NewHeaderTags='  <!-- L1.47: preserve Explore -> shared header cascade, one smaller critical request. -->\n'+
 '  <link rel="stylesheet" href="./landing-assets/header-explore-l147.min.css?v=l147">';
// L1.48 starts from an already merged L1.47, not from its pre-merge branch.
const l148OldScriptTag='<script defer src="./landing-assets/landing.js?v=l141"></script>';
const l148NewScriptTag='<script defer src="./landing-assets/landing.js?v=l148"></script>';
const l149NewScriptTag='<script defer src="./landing-assets/landing.js?v=l149"></script>';
const l150NewScriptTag='<script defer src="./landing-assets/landing.js?v=l150"></script>';
const l151NewScriptTag='<script defer src="./landing-assets/landing.js?v=l151"></script>';
const l152NewScriptTag='<script defer src="./landing-assets/landing.js?v=l152"></script>';
const l153NewScriptTag='<script defer src="./landing-assets/landing.js?v=l153"></script>';
const l154NewScriptTag='<script defer src="./landing-assets/landing.js?v=l154"></script>';
const l155NewScriptTag='<script defer src="./landing-assets/landing.js?v=l155"></script>';
const l156OldMotionTag='<script defer src="./landing-assets/motion-l132.js?v=l141"></script>';
const l156NewMotionTag='<script defer src="./landing-assets/motion-l132.js?v=l156"></script>';
const l157NewMotionTag='<script defer src="./landing-assets/motion-l132.js?v=l157"></script>';
const l159NewMotionTag='<script defer src="./landing-assets/motion-l132.js?v=l159"></script>';
const l161LandingTag='<script defer src="./landing-assets/landing.js?v=l161"></script>';
const l148IndexOnlyEdited=()=>prev.includes(l159NewMotionTag) &&
  prev.includes(l161LandingTag) && current===prev;
const l147IndexOnlyEdited=baseline=>baseline===prev && l148IndexOnlyEdited() &&
  baseline.includes(l147NewHeaderTags) && !current.includes(l147OldHeaderTags);
// The runtime JS may change only these four targeted DOM write sites.
const l148JsReplacements=[
  [
    "      element.textContent = conceptData[currentBusinessView][element.dataset.businessAmount] || '';",
    "      const value = conceptData[currentBusinessView][element.dataset.businessAmount] || '';\n      if (element.textContent !== value) element.textContent = value;"
  ],
  [
    "      if(value) element.textContent=value;",
    "      if(value && element.textContent !== value) element.textContent=value;"
  ],
  [
    "      element.textContent = dictionary[key] || '';",
    "      const value = dictionary[key] || '';\n      if (element.textContent !== value) element.textContent = value;"
  ],
  [
    "      if (htmlKeys.has(key)) node.innerHTML = value; // only hardcoded local, trusted translations\n      else node.textContent = value;",
    "      // L1.48: preserve the existing node when its localized value is already correct.\n      // Avoid unnecessary text/style invalidation on first paint and language changes.\n      if (htmlKeys.has(key)) {\n        if (node.innerHTML !== value) node.innerHTML = value; // trusted local translations only\n      } else if (node.textContent !== value) node.textContent = value;"
  ]
];
// L1.49: one click-handler guard, preserving all previous L1.48 DOM optimizations.
const l149BusinessClickBefore="  businessTabs.forEach(button => button.addEventListener('click', () => {\n    updateBusinessPreview(button.dataset.businessView);\n  }));";
const l149BusinessClickAfter="  businessTabs.forEach(button => button.addEventListener('click', () => {\n    // L1.49: selecting an already active concept is a no-op. Avoid\n    // redundant data-current-view mutations and replayed Business animations.\n    // applyLanguage still calls updateBusinessPreview for translated labels.\n    if (button.dataset.businessView !== currentBusinessView)\n      updateBusinessPreview(button.dataset.businessView);\n  }));";
// L1.50 modifies only the active-language click handler; all L1.48 and
// L1.49 runtime invariants remain identical to the already merged main.
const l150LanguageClickBefore="  languageButtons.forEach(button => button.addEventListener('click', () => {\n    applyLanguage(button.dataset.lang);\n    closeLanguage();\n    localeTrigger.focus({preventScroll:true});\n  }));";
const l150LanguageClickAfter="  languageButtons.forEach(button => button.addEventListener('click', () => {\n    // L1.50: reselecting the active language only closes the selector;\n    // preserve keyboard focus without retranslating the entire page.\n    if (button.dataset.lang !== currentLang) applyLanguage(button.dataset.lang);\n    closeLanguage();\n    localeTrigger.focus({preventScroll:true});\n  }));";
// L1.51: compare exact nav-only edit against merged L1.50 source, preserving
// all prior L1.48/L1.49/L1.50 language and Business guards.
const l151MarkSectionBefore="  function markSection(id) {\n    if (homeLink) {\n      if (id === 'top') homeLink.setAttribute('aria-current','location');\n      else homeLink.removeAttribute('aria-current');\n    }\n    sectionLinks.forEach(link => {\n      if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current','location');\n      else link.removeAttribute('aria-current');\n    });\n  }";
const l151MarkSectionAfter="  function markSection(id) {\n    // L1.51: repeated viewport observations must not rewrite unchanged\n    // navigation attributes; keep the same active section and semantics.\n    if (homeLink) {\n      if (id === 'top') {\n        if (homeLink.getAttribute('aria-current') !== 'location')\n          homeLink.setAttribute('aria-current','location');\n      } else if (homeLink.hasAttribute('aria-current'))\n        homeLink.removeAttribute('aria-current');\n    }\n    sectionLinks.forEach(link => {\n      if (link.getAttribute('href') === '#' + id) {\n        if (link.getAttribute('aria-current') !== 'location')\n          link.setAttribute('aria-current','location');\n      } else if (link.hasAttribute('aria-current'))\n        link.removeAttribute('aria-current');\n    });\n  }";
// L1.52 changes only the product selection attribute writes, preserving
// the shipped L1.48-L1.51 optimizations and all other public runtime logic.
const l152PreviewTabBefore="      t.classList.toggle('is-active',yes);\n      t.setAttribute('aria-selected',String(yes));\n      t.tabIndex=yes?0:-1;\n      if(yes&&focus)t.focus({preventScroll:true});";
const l152PreviewTabAfter="      t.classList.toggle('is-active',yes);\n      // L1.52: only the two tabs whose selection state actually changes\n      // need ARIA/tabindex writes; preserve the existing roving focus.\n      const selected=String(yes);\n      if(t.getAttribute('aria-selected')!==selected)t.setAttribute('aria-selected',selected);\n      const tabIndex=yes?0:-1;\n      if(t.tabIndex!==tabIndex)t.tabIndex=tabIndex;\n      if(yes&&focus)t.focus({preventScroll:true});";
// L1.53: exactly three nonvisual Business attribute guards on top of
// released L1.52, preserving all prior Landing behavior.
const l154HydrationPatches=[["      button.setAttribute('aria-pressed', String(button.dataset.lang === currentLang));","      // L1.54: preserve existing language choice ARIA on cold hydration.\n      const pressed=String(button.dataset.lang === currentLang);\n      if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);"],["      if (label) label.textContent = productLabels[currentLang][tab.dataset.productTab];","      if (label) {\n        const name=productLabels[currentLang][tab.dataset.productTab];\n        if(label.textContent!==name)label.textContent=name;\n      }"],["    if (activeStoryTitle) activeStoryTitle.textContent = productLabels[currentLang][activeProduct];","    if (activeStoryTitle) {\n      const name=productLabels[currentLang][activeProduct];\n      if(activeStoryTitle.textContent!==name)activeStoryTitle.textContent=name;\n    }"]];
const l153BusinessAttrPatches=[["      button.setAttribute('aria-pressed',String(selected));","      // L1.53: a language change must not rewrite the active concept state.\n      const pressed=String(selected);\n      if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);"],["      element.setAttribute('data-i18n',key);\n      const value = dictionary[key] || '';","      if(element.getAttribute('data-i18n')!==key)element.setAttribute('data-i18n',key);\n      const value = dictionary[key] || '';"],["    if(panel) panel.dataset.currentView = currentBusinessView;","    if(panel && panel.dataset.currentView!==currentBusinessView)panel.dataset.currentView = currentBusinessView;"]];
// L1.55: compare exact edit against latest main (L1.54).
const l155InterruptedPreviewPatch="  // L1.55: finish an interrupted crossfade immediately when the tab is\n  // hidden or the user enables reduced motion, preserving selected content.\n  const clearInterruptedPreview = () => {\n    if (previewTransition && (reducedPreviewMotion.matches || document.hidden))\n      settlePreviewTransition();\n  };\n  if (typeof reducedPreviewMotion.addEventListener === 'function')\n    reducedPreviewMotion.addEventListener('change', clearInterruptedPreview);\n  else if (typeof reducedPreviewMotion.addListener === 'function')\n    reducedPreviewMotion.addListener(clearInterruptedPreview);\n  document.addEventListener('visibilitychange', clearInterruptedPreview);\n\n";
const l148LandingJsOnlyEdited=()=>{
  const merged=source('landing-assets/landing.js');
  if(!l148JsReplacements.every(([before,after])=>merged.includes(after)&&!merged.includes(before)))return false;
  if(![l149BusinessClickAfter,l150LanguageClickAfter,l151MarkSectionAfter,l152PreviewTabAfter].every(x=>merged.includes(x)))return false;
  if(!l153BusinessAttrPatches.every(([before,after])=>merged.includes(after)&&!merged.includes(before)))return false;
  if(!l154HydrationPatches.every(([before,after])=>merged.includes(after)&&!merged.includes(before)))return false;
  const anchor="  function selectProductView(view,focus=false,instant=false){";
  return merged.includes(l155InterruptedPreviewPatch+anchor) &&
    merged.includes('L1.61: keyboard-opened menu should lead to the first visible link.') &&
    read('landing-assets/landing.js')===merged;
};

// L1.46: only two critical CSS links differ from the released HTML.
const l146CssLinks=[
 ['href="./landing-assets/cinematic.css?v=l141"',
  'href="./landing-assets/cinematic.min.css?v=l146"'],
 ['href="./landing-assets/premium-l131.css?v=l141"',
  'href="./landing-assets/premium-l131.min.css?v=l146"']
];
// L1.46 is already released on latest main; verify its two compact links
// are preserved instead of reapplying a historical patch to deployed HTML.
const l146IndexOnlyEdited=()=>l147IndexOnlyEdited(prev) &&
 l146CssLinks.every(([before,after])=>current.includes(after)&&!current.includes(before));
const l145IndexOnlyEdited=()=>l146IndexOnlyEdited() &&
 current.includes(l145NewLandingTag);
const l144IndexOnlyEdited=()=>l145IndexOnlyEdited() &&
  current.includes(l144NewMotionTag);

// Conservatively compact *only* comments and formatting whitespace outside
// CSS strings. Do not reorder declarations, merge rules or change values.
const l145CompactCss=src=>{
  let out='',quote='',inComment=false,space=false;
  for(let i=0;i<src.length;i++){
    const c=src[i],next=src[i+1];
    if(inComment){if(c==='*'&&next==='/'){inComment=false;i++;space=true}continue}
    if(quote){
      out+=c;
      if(c==='\\'&&i+1<src.length){out+=src[++i];continue}
      if(c===quote)quote='';
      continue;
    }
    if(c==='"'||c==="'"){
      if(space){if(!/[{;}]/.test(out.at(-1)||''))out+=' ';space=false}
      out+=c;quote=c;continue;
    }
    if(c==='/'&&next==='*'){inComment=true;i++;space=true;continue}
    if(/\s/.test(c)){space=true;continue}
    if(space){
      const prev=out.at(-1)||'';
      if(!(!prev||prev==='{'||prev===';'||prev==='}'||c==='}'||c===';'||c==='{'))out+=' ';
      space=false;
    }
    out+=c;
  }
  if(quote||inComment)throw Error('Malformed original Landing CSS');
  return out.trim()+'\n';
};
const l145CssOnlyEdited=()=>{
  const original=source('landing-assets/landing.css');
  const compact=read('landing-assets/landing.min.css');
  return read('landing-assets/landing.css')===original &&
    compact===l145CompactCss(original) &&
    compact.length<original.length-8000;
};
const l142IndexOnlyEdited=()=>l144IndexOnlyEdited() &&
  current.includes(l142NewBusinessTag);

/* L1.33: exact presentation-only Myanmar feature typography append.
 * No public HTML, scripting, authentication, finance, PWA or SEO changes. */
const oldHeroPreload='<link rel="preload" as="image" type="image/webp" href="./landing-assets/cinematic-lake.webp">';
const newHeroPreload='<link rel="preload" as="image" type="image/webp" href="./landing-assets/personal-business-concept.webp" fetchpriority="high">';
const l133BurmeseCssSuffix="\n/* L1.33 — Myanmar feature previews: readable native-script rhythm on phones.\n   Only public showcase labels; keep all hero, login and App styles intact. */\nhtml[lang=\"my\"] body.l131 .features-explorer.app-showcase .product-tab-copy{\n  min-width:0;\n}\nhtml[lang=\"my\"] body.l131 .features-explorer.app-showcase .product-tab-copy strong{\n  display:block;\n  font-family:\"Noto Sans Myanmar\",\"Myanmar Text\",\"Padauk\",sans-serif;\n  font-size:14px;\n  font-weight:600;\n  line-height:1.85;\n  letter-spacing:0;\n  white-space:normal;\n  overflow-wrap:anywhere;\n  word-break:normal;\n}\nhtml[lang=\"my\"] body.l131 .features-explorer.app-showcase .product-tab-copy small{\n  line-height:1.85;\n  letter-spacing:0;\n  overflow-wrap:anywhere;\n}\nhtml[lang=\"my\"] body.l131 .features-explorer.app-showcase .app-story h3{\n  font-family:\"Noto Sans Myanmar\",\"Myanmar Text\",\"Padauk\",sans-serif;\n  font-weight:600;\n  line-height:1.75;\n  letter-spacing:0;\n  overflow-wrap:anywhere;\n  word-break:normal;\n}\n@media(max-width:620px){\n  html[lang=\"my\"] body.l131 .features-explorer.app-showcase .product-tab{\n    min-height:76px;\n  }\n  html[lang=\"my\"] body.l131 .features-explorer.app-showcase .product-tab-copy strong{\n    font-size:13px;\n  }\n}\n";
const l134ResponsiveCssSuffix="\n/* L1.34 — Keep the six public feature choices stable while EN / ZH / MY\n   translations change. Only Landing's mobile feature picker is affected.\n   Preserve native zoom, scrolling, the fixed Hero, and all existing colors. */\n@media (max-width: 620px) {\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab {\n    min-width: 0;\n    min-height: 94px;\n    padding-block: 10px;\n  }\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab-copy {\n    min-width: 0;\n  }\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab-copy strong,\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab-copy small {\n    white-space: normal;\n    overflow-wrap: anywhere;\n  }\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab-soon {\n    white-space: normal;\n    overflow-wrap: anywhere;\n  }\n}\n@media (max-width: 360px) {\n  html[lang] body.l131 .features-explorer.app-showcase .product-tab {\n    min-height: 108px;\n  }\n}\n/* Mobile tapping should not shrink the grid card under the user's finger. */\n@media (max-width: 620px) and (prefers-reduced-motion: no-preference) {\n  html.mm-motion-active body.l131 .features-explorer.app-showcase .product-tab:active {\n    transform: none;\n  }\n}\n";
const l135HeaderCssSuffix="\n/* L1.35: Public mobile header shows the selected language. */\n@media(max-width: 700px){\n body.mmh-nav-unified .site-header .locale-trigger .locale-globe{display:none!important}\n body.mmh-nav-unified .site-header .locale-trigger .locale-active-flag{\n  display: inline-flex !important;align-items:center;justify-content:center;\n  flex:0 0 24px;width:24px;font-size:19px;line-height:1;white-space:nowrap\n }\n}\n";
const l136TouchTargetReplacements=[["flex:0 0 42px;width:42px;min-width:42px;min-height:42px;height:42px","flex:0 0 44px;width:44px;min-width:44px;min-height:44px;height:44px"],["width:42px;min-width:42px;min-height:42px;height:42px","width:44px;min-width:44px;min-height:44px;height:44px"],["min-width:39px;width:39px;min-height:39px;height:39px;flex-basis:39px","min-width:44px;width:44px;min-height:44px;height:44px;flex-basis:44px"]];
const l138MotionReplacements=[["-webkit-backdrop-filter:blur(32px);backdrop-filter:blur(32px);","-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);"],["from{opacity:0;transform:translate3d(0,-7px,0)}","from{opacity:.28;transform:translate3d(0,-4px,0)}"],["animation:mmh-public-panel-in .19s cubic-bezier(.2,.65,.3,1) both","animation:mmh-public-panel-in .22s cubic-bezier(.2,.65,.3,1) both"],["animation:mmh-public-panel-in .17s cubic-bezier(.2,.65,.3,1) both","animation:mmh-public-panel-in .22s cubic-bezier(.2,.65,.3,1) both"]];
const l138MotionOnlyEdited=()=>{
  // L1.38 has already shipped. Protect its final motion and glass styles
  // byte-for-byte against the latest main instead of reapplying the old diff.
  const expected=source('landing-assets/shared-header-l116.css');
  return read('landing-assets/shared-header-l116.css')===expected &&
    expected.includes('-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);') &&
    expected.includes('from{opacity:.28;transform:translate3d(0,-4px,0)}') &&
    expected.includes('animation:mmh-public-panel-in .22s cubic-bezier(.2,.65,.3,1) both');
};
const l136HeaderTargetsOnlyEdited=()=>{
  // L1.36 is merged: preserve its 44px compact targets plus L1.38 scoped motion.
  const expected=source('landing-assets/shared-header-l116.css');
  return l138MotionOnlyEdited() &&
    expected.includes('flex:0 0 44px;width:44px;min-width:44px;min-height:44px;height:44px') &&
    expected.includes('min-width:44px;width:44px;min-height:44px;height:44px;flex-basis:44px');
};
const l135HeaderCssOnlyEdited=()=>
  source('landing-assets/shared-header-l116.css').endsWith(l135HeaderCssSuffix) &&
  l136HeaderTargetsOnlyEdited();
// L1.37 exact public-only storage event additions relative to latest main.
const l137LandingStorageHook="\n  // L1.37: keep public pages already open in other tabs on one language.\n  // A storage event originates only in another tab; identical writes do not\n  // re-trigger events. No navigation, scroll, auth or finance state changes.\n  window.addEventListener('storage', event => {\n    const next = event.newValue;\n    if (event.key !== storageKey || (next !== 'en' && next !== 'zh' && next !== 'my') || next === currentLang) return;\n    applyLanguage(next);\n    closeLanguage();\n  });\n";
const l137PublicStorageHook="\n  // L1.37: synchronize the same public language preference across open tabs.\n  // Keep document routes, menu focus, credentials and App state untouched.\n  window.addEventListener('storage', event => {\n    const next = event.newValue;\n    if (event.key !== storageKey || !locales.has(next) || next === locale) return;\n    changeLanguage(next);\n    closeLanguage();\n  });\n";
const l137LandingJSOnlyEdited=()=>{
  const expected=source('landing-assets/landing.js');
  return l148LandingJsOnlyEdited() &&
    expected.includes(l137LandingStorageHook);
};
const l139MotionInsertion="  // L1.39: begin phone reveals just before cards enter view to avoid a\n  // temporary blank during quick scrolling; desktop timing is unchanged.\n  const mobileReveal = window.matchMedia && window.matchMedia('(max-width: 620px)').matches;\n";
const l139PublicInsertion="      // L1.39: pre-reveal phone cards ahead of viewport; leave desktop as-is.\n      const mobileReveal=window.matchMedia('(max-width: 620px)').matches;\n";
// L1.40 uses published L1.39 as the baseline. Compare only the intended
// phone-reveal configuration change and preserve the public-page script bytewise.
const l156MotionPatches=[["  const activeAnimations=new WeakMap();\n  const play=","  const activeAnimations=new WeakMap();\n  // L1.56: stop only Business concept WAAPI motion on tab hiding or\n  // live reduced-motion changes, leaving presentation and data intact.\n  const runningBusinessAnimations=new Set();\n  const cancelInterruptedBusinessMotion=()=>{\n    if(permitted() && !document.hidden)return;\n    for(const animation of runningBusinessAnimations)animation.cancel();\n    runningBusinessAnimations.clear();\n  };\n  if(typeof motionPreference.addEventListener==='function')\n    motionPreference.addEventListener('change',cancelInterruptedBusinessMotion);\n  else if(typeof motionPreference.addListener==='function')\n    motionPreference.addListener(cancelInterruptedBusinessMotion);\n  document.addEventListener('visibilitychange',cancelInterruptedBusinessMotion);\n  const play="],["    if(!permitted() || typeof node.animate!=='function')return;","    if(!permitted() || document.hidden || typeof node.animate!=='function')return;"],["    activeAnimations.set(node,animation);\n  };","    activeAnimations.set(node,animation);\n    runningBusinessAnimations.add(animation);\n    const forget=()=>runningBusinessAnimations.delete(animation);\n    animation.addEventListener('finish',forget,{once:true});\n    animation.addEventListener('cancel',forget,{once:true});\n  };"],["      if(!permitted())return;","      if(!permitted() || document.hidden)return;"]];
const l157RevealBefore="  // L1.40: prewarm mobile reveals further ahead of fast swipes, with no\n  // intersection threshold that might skip a narrow card. Desktop unchanged.\n  const mobileReveal = window.matchMedia && window.matchMedia('(max-width: 620px)').matches;\n  const observer=new IntersectionObserver(entries=>{\n    for(const entry of entries){\n      if(!entry.isIntersecting)continue;\n      entry.target.classList.add('mm-shown');\n      observer.unobserve(entry.target);\n    }\n  },{rootMargin:mobileReveal?'0px 0px 24% 0px':'0px 0px -6% 0px',threshold:mobileReveal?0:0.065});\n  elements.filter(el=>!el.classList.contains('mm-shown')).forEach(el=>observer.observe(el));\n";
const l157RevealAfter="  // L1.57: recalculate phone-first reveal margins after orientation changes.\n  // Keep already revealed sections visible; no scroll interception or repaint.\n  const mobileRevealQuery=window.matchMedia\n    ? window.matchMedia('(max-width: 620px)') : {matches:false};\n  let observer;\n  const bindRevealObserver=()=>{\n    if(observer)observer.disconnect();\n    const mobileReveal=mobileRevealQuery.matches;\n    const nextObserver=new IntersectionObserver(entries=>{\n      for(const entry of entries){\n        if(!entry.isIntersecting)continue;\n        entry.target.classList.add('mm-shown');\n        nextObserver.unobserve(entry.target);\n      }\n    },{rootMargin:mobileReveal?'0px 0px 24% 0px':'0px 0px -6% 0px',threshold:mobileReveal?0:0.065});\n    observer=nextObserver;\n    elements.filter(el=>!el.classList.contains('mm-shown')).forEach(el=>observer.observe(el));\n  };\n  bindRevealObserver();\n  if(typeof mobileRevealQuery.addEventListener==='function')\n    mobileRevealQuery.addEventListener('change',bindRevealObserver);\n  else if(typeof mobileRevealQuery.addListener==='function')\n    mobileRevealQuery.addListener(bindRevealObserver);\n";
const l159RevealAddition="  // L1.59: settle any pending reveals when reduced motion is enabled live.\n  // Already visible content stays visible if normal motion is enabled again.\n  const settleReducedReveals=()=>{\n    if(permitted())return;\n    for(const el of elements)el.classList.add('mm-shown');\n    observer.disconnect();\n  };\n  if(typeof motionPreference.addEventListener==='function')\n    motionPreference.addEventListener('change',settleReducedReveals);\n  else if(typeof motionPreference.addListener==='function')\n    motionPreference.addListener(settleReducedReveals);\n\n";
const l159RevealAnchor="  // Clicking a guide or an in-page navigation link must reveal the destination,";
const l139MotionOnlyEdited=()=>{
  const released=source('landing-assets/motion-l132.js');
  return read('landing-assets/motion-l132.js')===released &&
    released.includes('L1.59: settle any pending reveals when reduced motion') &&
    released.includes('L1.57: recalculate phone-first reveal margins') &&
    released.includes('L1.56: stop only Business concept WAAPI motion');
};
const l158PublicRevealBefore="      // L1.39: pre-reveal phone cards ahead of viewport; leave desktop as-is.\n      const mobileReveal=window.matchMedia('(max-width: 620px)').matches;\n      const observer=new IntersectionObserver(entries=>{\n        entries.forEach(entry=>{\n          if(!entry.isIntersecting)return;\n          entry.target.classList.add('mm-public-shown');\n          observer.unobserve(entry.target);\n        });\n      },{threshold:.045,rootMargin:mobileReveal?'0px 0px 12% 0px':'0px 0px -4% 0px'});\n      targets.filter(el=>!el.classList.contains('mm-public-shown'))\n        .forEach(el=>observer.observe(el));";
const l158PublicRevealAfter="      // L1.58: rotate.\n      const mq=matchMedia('(max-width:620px)');\n      let io;\n      function bind(){\n        io?.disconnect();\n        const mobileReveal=mq.matches;\n        const o=new IntersectionObserver(es=>{\n          for(const e of es)if(e.isIntersecting){\n            e.target.classList.add('mm-public-shown');\n            o.unobserve(e.target);\n          }\n        },{threshold:.045,rootMargin:mobileReveal?'0px 0px 12% 0px':'0px 0px -4% 0px'});\n        io=o;\n        for(const e of targets)if(!e.classList.contains('mm-public-shown'))o.observe(e);\n      }\n      bind();\n      mq.addEventListener?mq.addEventListener('change',bind):mq.addListener?.(bind);";
const l158OldScriptTag="<script defer src=\"/landing-assets/public-pages.js\"></script>";
const l158NewScriptTag="<script defer src=\"/landing-assets/public-pages.js?v=l158\"></script>";
const l160ScriptTag='<script defer src="/landing-assets/public-pages.js?v=l160"></script>';
const l161ScriptTag='<script defer src="/landing-assets/public-pages.js?v=l161"></script>';
// L1.61 compares a released L1.60 page with its cache-busted navigation script.
const l158RestoreScript=(html)=>html; // L1.61 script now in released main.
const l162CssPatch="\n/* L1.62 — public breadcrumb labels must wrap inside narrow phone viewports.\n   Presentation-only; no navigation, SEO markup or JS changes. */\n@media (max-width: 620px) {\n  body.public-landing-page .page-breadcrumb {\n    flex-wrap: wrap;\n    min-width: 0;\n    max-width: 100%;\n  }\n  body.public-landing-page .page-breadcrumb > :is(a, span) {\n    min-width: 0;\n    overflow-wrap: anywhere;\n  }\n}\n";
const l162OldCssLink="<link rel=\"stylesheet\" href=\"/landing-assets/public-pages.css\">";
const l162NewCssLink="<link rel=\"stylesheet\" href=\"/landing-assets/public-pages.css?v=l162\">";
const l162RestoreCss=(html)=>html.replace(l162NewCssLink,l162OldCssLink);
const l163NewCssLink="<link rel=\"stylesheet\" href=\"/landing-assets/public-pages.css?v=l163\">";
const l163RestoreCss=(html)=>html.replace(l166PublicLink,l164PublicLink); // L1.64 CSS link is released.
const l163FooterCssPatch="\n/* L1.63 — minimum 44px touch targets for public footer navigation on phones.\n   Keep the desktop footer and all page content, links, language strings intact. */\n@media (max-width: 620px) {\n  body.public-landing-page .public-footer-group {\n    min-width: 0;\n    gap: 5px;\n  }\n  body.public-landing-page .public-footer-group strong {\n    max-width: 100%;\n    overflow-wrap: anywhere;\n  }\n  body.public-landing-page .public-footer-group a {\n    box-sizing: border-box;\n    display: flex;\n    align-items: center;\n    width: 100%;\n    min-width: 0;\n    min-height: 44px;\n    padding: 8px;\n    border-radius: 10px;\n    overflow-wrap: anywhere;\n  }\n  body.public-landing-page .public-footer-group a span {\n    min-width: 0;\n    overflow-wrap: anywhere;\n  }\n  body.public-landing-page .public-footer-bottom > a {\n    display: inline-flex;\n    align-items: center;\n    max-width: 100%;\n    min-height: 44px;\n    padding: 8px;\n    border-radius: 10px;\n    overflow-wrap: anywhere;\n  }\n}\n";
const l163FooterCssOnlyEdited=()=>
  read('landing-assets/public-pages.css')===source('landing-assets/public-pages.css') &&
  source('landing-assets/public-pages.css').endsWith(l163FooterCssPatch);
const l160PublicRemovals=[" * Read-only presentation: no auth, fetch, history/URL rewrites or finance data.\n"," * Header markup and shared-header-l116.css are identical across public pages.\n","  // L1.26: return focus to a visible trigger when dismissing compact\n","  // navigation, Explore or the language picker on any public page.\n","    // A collapsed Explore inside the mobile menu must not close the menu too.\n"];
const l160PublicMarker="      mq.addEventListener?mq.addEventListener('change',bind):mq.addListener?.(bind);\n";
const l160PublicAddition="      // L1.60: settle pending reveals.\n      const reduced=matchMedia('(prefers-reduced-motion: reduce)');\n      const settle=()=>{\n        if(!reduced.matches)return;\n        io.disconnect();\n        for(const el of targets)el.classList.add('mm-public-shown');\n      };\n      reduced.addEventListener?reduced.addEventListener('change',settle):reduced.addListener?.(settle);\n";
const l139PublicOnlyEdited=()=>{
  const released=source('landing-assets/public-pages.js');
  return released.includes('L1.60: settle pending reveals.') &&
    released.includes('L1.61: keyboard-opened responsive menu starts at its first link.') &&
    read('landing-assets/public-pages.js')===released;
};
const l137PublicJSOnlyEdited=()=>{
  const expected=source('landing-assets/public-pages.js');
  return l139PublicOnlyEdited() && expected.includes(l137PublicStorageHook);
};
const l133BurmeseLayoutOnlyEdited=()=>
  l145CssOnlyEdited() &&
  source('landing-assets/landing.css').endsWith(l134ResponsiveCssSuffix) &&
  source('landing-assets/landing.css').includes(l133BurmeseCssSuffix) &&
  l137LandingJSOnlyEdited() &&
  l142IndexOnlyEdited() &&
  current.includes('<title>MMHVAULT | Personal Finance & Wealth</title>');
const l133PublicPagesUnchanged=()=>l137PublicJSOnlyEdited();
const manifest=JSON.parse(read('mmh-manifest-v2.webmanifest'));
const oldManifest=JSON.parse(source('mmh-manifest-v2.webmanifest'));
const dom=(key,content)=>((content.match(new RegExp('<script id="'+key+'">([\\s\\S]*?)<\\/script>'))||[])[1]||null);
let passed=0;
function check(title,predicate){assert.ok(predicate,title);++passed;console.log('PASS '+title)}
check('Main page indexable',!/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(current));
check('Official finance and wealth search title',current.includes('<title>MMHVAULT | Personal Finance & Wealth</title>'));
check('Consistent official Open Graph and Twitter titles',(current.match(/content="MMHVAULT \| Personal Finance &amp; Wealth"/g)||[]).length===2);
check('Official description names real finance tools and future Business', current.includes('name="description"')&&current.includes('official personal finance and wealth management website')&&current.includes('Business is a future concept.'));
check('Canonical is unique and official',(current.match(/<link rel="canonical"/g)||[]).length===1&&current.includes('href="https://mmhvault.com/"'));
check('OG site and homepage URL',current.includes('property="og:site_name" content="MMHVAULT"')&&current.includes('property="og:url" content="https://mmhvault.com/"'));
check('Real brand PNG present',fs.existsSync('images/mmhvault-logo-transparent.png')&&current.includes('https://mmhvault.com/images/mmhvault-logo-transparent.png'));
const jsonText=(current.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
check('One valid JSON-LD block',!!jsonText&&(current.match(/<script type="application\/ld\+json">/g)||[]).length===1);
const graph=JSON.parse(jsonText)['@graph'];
check('Website name in structured data',graph.some(x=>x['@type']==='WebSite'&&x.name==='MMHVAULT'&&x.url==='https://mmhvault.com/'));
check('Brand Organization in structured data',graph.some(x=>x['@type']==='Organization'&&x.name==='MMHVAULT'));
const site=graph.find(x=>x['@type']==='WebSite');
const brand=graph.find(x=>x['@type']==='Organization');
const appSchema=graph.find(x=>x['@type']==='SoftwareApplication');
check('One official WebSite / Organization / SoftwareApplication graph',
 graph.length===3 && site?.name==='MMHVAULT' &&
 brand?.name==='MMHVAULT' && appSchema?.name==='MMHVAULT' &&
 site?.publisher?.['@id']===brand?.['@id'] &&
 appSchema?.publisher?.['@id']===brand?.['@id']);
check('SoftwareApplication truthfully describes web finance and excludes future Business',
 appSchema?.url==='https://mmhvault.com/' &&
 appSchema?.applicationCategory==='FinanceApplication' &&
 appSchema?.operatingSystem==='Web browser' &&
 ['Accounts','Transactions','Investments','Budgets','Financial Analysis','Financial Planning']
  .every(x=>appSchema.featureList?.includes(x)) &&
 !appSchema?.featureList?.includes('Business') &&
 !appSchema?.offers && !appSchema?.aggregateRating && !appSchema?.review);
check('Organization references the real brand logo and correct platform identity',
 brand?.description?.includes('Personal Finance & Wealth') &&
 brand?.logo?.url==='https://mmhvault.com/images/mmhvault-logo-transparent.png');
check('Exact N10 recovery route preserved',dom('mmh-n10-recovery-error-route',current)===dom('mmh-n10-recovery-error-route',prev)&&!!dom('mmh-n10-recovery-error-route',prev));
check('Installed standalone fallback present',!!dom('mmh-pwa-standalone-root-bridge',current));
check('Standalone guard does not affect normal browser',dom('mmh-pwa-standalone-root-bridge',current).includes('if (!isStandalone) return'));
check('Fallback leaves OAuth/recovery params alone',dom('mmh-pwa-standalone-root-bridge',current).includes("'access_token'")&&dom('mmh-pwa-standalone-root-bridge',current).includes("'code'"));
check('Unsuccessful pinch guard excluded',!current.includes('standalone-pinch-guard.js')&&!fs.existsSync('landing-assets/standalone-pinch-guard.js'));
check('Normal secure Login route',current.includes('href="./login.html"')&&current.includes('href="./mmh-manifest-v2.webmanifest"'));
check('Both mobile auth entry links',current.includes('mobile-nav-auth-signin')&&current.includes('mobile-nav-auth-signup'));
check('All fixed Hero languages',["YOUR MONEY. YOUR DIRECTION.","让财务更清晰，让未来更有方向。","ငွေကြေးကို ပိုမိုရှင်းလင်းစွာ သိမြင်"].every(t=>current.includes(t)));
check('Business + Life Planner not presented as live',current.includes('COMING SOON')&&current.includes('in development.'));
check('No Supabase backend code in Landing',!current.includes('supabase.createClient')&&!current.includes('SUPABASE_SERVICE_ROLE_KEY'));
check('Current production Login remains noindex',/name="robots" content="noindex,nofollow,noarchive"/.test(read('login.html')));
check('Actual App remains noindex',/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(read('app.html').slice(0,350000)));
check('Protected Business page remains noindex',/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(read('business.html').slice(0,2000)));

const names=['header-explore-l147.min.css','landing.css','business.css','cinematic.css','cinematic.min.css','landing.js','premium-l131.css','premium-l131.min.css','explore-l114.css','motion-l132.css','motion-l132.js','luxury-horizon.svg','premium-architecture.svg','cinematic-lake.webp','personal-business-concept.webp'];
check('All required live assets exist',names.every(f=>fs.existsSync('landing-assets/'+f)));
check('Landing style and script links correct',['landing.min.css','business.css','cinematic.min.css','landing.js'].every(f=>current.includes('./landing-assets/'+f)));
check('L1.45 editable stylesheet retained alongside compact runtime CSS',
  read('landing-assets/landing.css')===source('landing-assets/landing.css') &&
  l145CssOnlyEdited());
check('L1.31 premium layer linked and scoped', current.includes('class="l131 mmh-nav-unified"') && current.includes('href="./landing-assets/premium-l131.min.css?v=l146"') && read('landing-assets/premium-l131.css').includes('body.l131 .showcase-v2'));
check('Explore styles load after existing premium/motion layers and remain scoped',
 current.includes('href="./landing-assets/header-explore-l147.min.css?v=l147"') &&
 read('landing-assets/explore-l114.css').includes('body.l131 .site-header #primary-nav') &&
 !read('landing-assets/explore-l114.css').includes('body.app'));
check('L1.32 motion assets linked from homepage',
  current.includes('href="./landing-assets/motion-l132.css?v=l141"') &&
  current.includes('src="./landing-assets/motion-l132.js?v=l159"'));
const motionSource=read('landing-assets/motion-l132.js');
const motionStyles=read('landing-assets/motion-l132.css');
check('L1.32 reveal uses IntersectionObserver and no forced hidden fallback',
  motionSource.includes('IntersectionObserver') && motionSource.includes('mm-shown') &&
  motionStyles.includes('.mm-reveal:not(.mm-shown)') &&
  motionSource.includes("if(!permitted() || !('IntersectionObserver' in window))return;"));
check('L1.32 respects reduced motion and native links',
  motionSource.includes('prefers-reduced-motion: reduce') &&
  motionStyles.includes('@media (prefers-reduced-motion: reduce)') &&
  !motionSource.includes('preventDefault(') && !motionSource.includes('location.replace'));
check('L1.32 product/business state switch animations stay presentational',
  motionSource.includes('L1.21: data-product-current now drives') &&
  !motionSource.includes('const productStage=document.querySelector') &&
  motionSource.includes('data-current-view') &&
  motionSource.includes("typeof node.animate!=='function'") &&
  !/fetch\s*\(|localStorage|supabase|touchstart|gesturestart/.test(motionSource));

check('L1.31 desktop Hero photograph restores actual device composition', read('landing-assets/premium-l131.css').includes('L1.31.1 — restore the photograph') && read('landing-assets/premium-l131.css').includes('url("./personal-business-concept.webp")') && read('landing-assets/cinematic.css').includes('hero-art.is-photo-ready .hero-device-cinematic {display:none;}'));
check('L1.31 never globally disables touch zoom', !/user-scalable\s*=\s*no/i.test(current) && !/touch-action\s*:\s*none/i.test(read('landing-assets/premium-l131.css')));
check('No preview QA material in production root',!current.includes('pwa-qa')&&!current.includes('mmh_layout_probe'));
check('Public robots.txt present',fs.existsSync('robots.txt')&&read('robots.txt').includes('User-agent: *')&&read('robots.txt').includes('Sitemap: https://mmhvault.com/sitemap.xml'));
check('Existing sitemap canonical root',read('sitemap.xml').includes('<loc>https://mmhvault.com/</loc>'));
check('Sitemap has no private app or login',!/<loc>[^<]*\/(?:app|login|n10-qa)\.html/i.test(read('sitemap.xml')));
check('PWA launcher points to secure Login',manifest.start_url==='./login.html?source=pwa&install=v2');
check('Manifest differs only in start_url',JSON.stringify({...manifest,start_url:oldManifest.start_url})===JSON.stringify(oldManifest));
check('Preserved old iPhone touch icon',current.includes('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=pwa24-20261029">'));
const allowed=new Set(['index.html','robots.txt','mmh-manifest-v2.webmanifest','business.html','sitemap.xml','register/index.html','features/index.html','about/index.html','business/index.html','privacy.html','terms.html','security.html','landing-assets/public-pages.css','landing-assets/public-header-l115.css','landing-assets/shared-header-l116.css','landing-assets/public-pages.js','landing-assets/landing-release-check.cjs','landing-assets/landing-browser-check.cjs','.github/workflows/landing-release-check.yml',...names.map(f=>'landing-assets/'+f),'landing-assets/landing.min.css',
  'landing-assets/safari-performance-l164.css','landing-assets/landing-webkit-check.cjs']);
const diff=cp.spawnSync('git',['diff','--name-only',main+'...HEAD'],{encoding:'utf8'});
assert.equal(diff.status,0,'git diff unsuccessful');
const actual=diff.stdout.trim().split(/\n/).filter(Boolean);
check('All proposed file changes confined to allowlist',actual.length>0&&actual.every(f=>allowed.has(f))&&!actual.includes('app.html')&&!actual.includes('login.html'));

/* L1.30 public brand sitelinks: distinct indexable informational destinations. */
const sitelinkPages = [
  {name:'Create Your Account',path:'register/index.html',url:'https://mmhvault.com/register/'},
  {name:'Personal Finance Features',path:'features/index.html',url:'https://mmhvault.com/features/'}
];
const publicSitemap=read('sitemap.xml');
const translationScript=read('landing-assets/landing.js');
for(const page of sitelinkPages){
  const html=read(page.path);
  const head=html.split('</head>')[0];
  check(page.name+' public page exists with distinct title',html.includes('<h1')&&head.includes('<title>'+page.name+' | MMHVAULT</title>'));
  check(page.name+' has canonical and no noindex',head.includes('<link rel="canonical" href="'+page.url+'">')&&!/name="robots"[^>]*noindex/i.test(head));
  check(page.name+' available in canonical sitemap',publicSitemap.includes('<loc>'+page.url+'</loc>'));
  check(page.name+' linked from homepage and public footer',current.includes('href="./'+page.path.split('/')[0]+'/"')&&html.includes('href="/register/"')&&html.includes('href="/features/"'));
  check(page.name+' contains valid breadcrumb JSON-LD',(()=>{
    const json=(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
    if(!json)return false;
    const data=JSON.parse(json);
    return data['@type']==='BreadcrumbList'&&data.itemListElement?.[1]?.item===page.url;
  })());
}
check('Public registration is not a copy of secure Login',!read('register/index.html').includes('id="signupEmail"')&&read('register/index.html').includes('href="/login.html"'));
check('Secure Login stays noindex and untouched',!actual.includes('login.html')&&/name="robots" content="noindex,nofollow,noarchive"/.test(read('login.html')));
check('Life Planner and Business are labelled future concepts',read('features/index.html').includes('Coming Soon')&&read('features/index.html').includes('future release'));
check('Public page CSS & JS are present',fs.existsSync('landing-assets/public-pages.css')&&fs.existsSync('landing-assets/public-pages.js'));
check('Homepage public navigation has correct EN/ZH/MY labels',['en','zh','my'].every(lang=>translationScript.includes('Object.assign(strings.'+lang+',{"sitelinkFeatures"')));

/* L1.7 — factual brand entity and About page sitelink, no AI Overview promises. */
const about=read('about/index.html');
const aboutHead=about.split('</head>')[0];
check('About is unique, indexable, with consistent title and canonical',
 aboutHead.includes('<title>About MMHVAULT | Personal Finance &amp; Wealth</title>') &&
 aboutHead.includes('<link rel="canonical" href="https://mmhvault.com/about/">') &&
 (aboutHead.match(/rel="canonical"/g)||[]).length===1 &&
 !/name=["']robots["'][^>]*noindex/.test(aboutHead));
check('About explicitly states official domain, product purpose and future Business',
 about.includes('Its official website is mmhvault.com') &&
 ['accounts, transactions, investments, budgets and financial planning','Personal Finance Clarity','All-in-One Workspace','Long-Term Perspective']
  .every(term=>about.includes(term)) &&
 about.includes('not a live business accounting service'));
check('About has valid linked AboutPage and BreadcrumbList schema',(()=>{
 const block=(aboutHead.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
 if(!block)return false;
 const graph=JSON.parse(block)['@graph'];
 return Array.isArray(graph) && graph.some(n=>n['@type']==='AboutPage'&&n.url==='https://mmhvault.com/about/') &&
 graph.some(n=>n['@type']==='BreadcrumbList'&&n.itemListElement?.[1]?.item==='https://mmhvault.com/about/');
})());
check('Public About is linked from homepage, Features, Register and sitemap',
 current.includes('href="./about/"') &&
 read('features/index.html').includes('href="/about/"') &&
 read('register/index.html').includes('href="/about/"') &&
 publicSitemap.includes('<loc>https://mmhvault.com/about/</loc>'));
check('All brand pages retain canonical host and avoid fake external profiles',
 !/tiktok\.com|michigan/i.test(current+about) &&
 [current,read('features/index.html'),read('register/index.html'),about].every(html=>html.includes('https://mmhvault.com/')));
check('Fixed homepage Hero remains visually protected and authentic brand visible',
 current.includes('data-hero-fixed') && current.includes('PERSONAL FINANCE &amp; WEALTH') &&
 about.includes('MMHVAULT · PERSONAL FINANCE &amp; WEALTH'));
check('Features mentions budgets/planning and labels future Business',
 read('features/index.html').includes('Budget reviews and financial planning tools') &&
 read('features/index.html').includes('Business and Life Planner experiences are separate future concepts'));
check('Secure routes not rewritten in this PR',
 !actual.some(p=>/^((login|app|business)\.html|mmh-manifest|sw\.js|mmh-push-sw\.js|CNAME)$/.test(p)));

/* L1.9 — Landing is the design and content source of its informational branches.
   Only the marketing pages may change; all real account flows remain untouched. */
const branchCSS=read('landing-assets/public-pages.css');
const branchJS=read('landing-assets/public-pages.js');
const pageSlices=[
 {route:'About',path:'about/index.html',bodyClass:'about-page',section:'THE MMHVAULT APPROACH'},
 {route:'Features',path:'features/index.html',bodyClass:'features-page',section:'THE FINANCIAL WORKSPACE'},
 {route:'Register',path:'register/index.html',bodyClass:'register-page',section:'PRIVATE ACCOUNT ACCESS'}
];
check('Shared public shell is scoped and all three independent pages inherit it',
 branchCSS.includes('.public-landing-page .brand-wordmark') &&
 branchCSS.includes('.public-landing-page .feature-hero') &&
 branchCSS.includes('.public-landing-page .public-locale-trigger') &&
 !branchCSS.includes('body.l131') &&
 pageSlices.every(page=>{
   const html=read(page.path);
   return html.includes('<body class="public-landing-page '+page.bodyClass+' mmh-nav-unified">') &&
     html.includes('<section class="hero feature-hero"') &&
     html.includes('class="brand-copy"') &&
     html.includes('class="feature-hero-copy"') &&
     html.includes('class="visual feature-visual"') &&
     html.includes('id="locale-trigger"') &&
     html.includes('id="locale-menu"') &&
     html.includes('href="/login.html" class="button button-gold header-cta"') &&
     html.includes('href="/"') &&
     html.includes(page.section);
 }));
check('All independent SEO entries preserve canonical and unique H1',
 pageSlices.every(page=>{
   const html=read(page.path);
   return (html.match(/<h1(?:\s|>)/g)||[]).length===1 &&
     (html.match(/<link rel="canonical"/g)||[]).length===1 &&
     html.includes('https://mmhvault.com/'+page.route.toLowerCase()+'/') &&
     !/<meta[^>]+name=["']robots["'][^>]+noindex/.test(html);
 }));
check('Landing About philosophy is intentionally derived into public About',
 ['Personal Finance Clarity','All-in-One Workspace','Private Financial Management',
  'Long-Term Perspective','Multi-Device Experience','English, Chinese & Burmese']
  .every(label=>current.includes(label.replace(/&/g,'&amp;')) && about.includes(label.replace(/&/g,'&amp;'))));
/* L1.9: catch future English/Chinese/Burmese About-copy drift from the
   homepage's source language dictionary before public SEO release. */
const landingDictionary=read('landing-assets/landing.js');
const htmlEscape=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');
function landingTranslations(key){
 const rx=new RegExp("(?:\\b"+key+"\\s*:\\s*'([^']*)'|\""+key+"\"\\s*:\\s*\"([^\"]*)\")",'g');
 return [...landingDictionary.matchAll(rx)].map(m=>m[1]??m[2]);
}
for(const key of ['whyLead', ...Array.from({length:6},(_,i)=>'benefit'+(i+1)+'Title'),
                           ...Array.from({length:6},(_,i)=>'benefit'+(i+1)+'Desc')]){
 const values=landingTranslations(key);
 check('Landing -> About 3-language text parity: '+key,
   values.length===3 &&
   about.includes('data-en="'+htmlEscape(values[0])+'" data-zh="'+
     htmlEscape(values[1])+'" data-my="'+htmlEscape(values[2])+'"'));
}

check('Public pages have a functional Landing-style language control and no form',
 ['en','zh','my'].every(l=>branchJS.includes("['en','zh','my']")) &&
 branchJS.includes("trigger.setAttribute('aria-expanded'") &&
 branchJS.includes('window.localStorage') &&
 !/fetch\s*\(|supabase|createClient|location\.replace|passwordInput/.test(branchJS) &&
 pageSlices.every(page=>!/<form[\s>]/i.test(read(page.path))));
check('Dedicated visual branches preserve their distinct purpose',
 read('features/index.html').includes('<h3') &&
 read('register/index.html').includes('Continue to Sign Up') &&
 read('register/index.html').includes('href="/login.html"') &&
 about.includes('not a bank, broker, payment service or financial adviser') &&
 read('features/index.html').includes('Business and Life Planner experiences are separate future concepts'));

/* L1.13 — real dedicated Business landing branch; keep private app isolated. */
const business=read('business/index.html');
const businessHead=business.split('</head>')[0];
const businessGraph=JSON.parse((businessHead.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1]||'{}')['@graph'];
check('Public Business concept has distinct canonical, truthful metadata and sitemap',
 businessHead.includes('<title>Business Workspace Concept | MMHVAULT</title>') &&
 businessHead.includes('<link rel="canonical" href="https://mmhvault.com/business/">') &&
 businessHead.includes('not a live accounting service') &&
 (businessHead.match(/rel="canonical"/g)||[]).length===1 &&
 !/name="robots"[^>]*noindex/.test(businessHead) &&
 publicSitemap.includes('<loc>https://mmhvault.com/business/</loc>') &&
 Array.isArray(businessGraph) && businessGraph.some(x=>x['@type']==='WebPage'&&x.url==='https://mmhvault.com/business/') &&
 businessGraph.some(x=>x['@type']==='BreadcrumbList'&&x.itemListElement?.[1]?.item==='https://mmhvault.com/business/'));
check('Business public page is premium, independent and clearly preview-only',
 business.includes('<body class="public-landing-page business-page mmh-nav-unified">') &&
 business.includes('id="business-heading"') &&
 business.includes('class="visual feature-visual"') &&
 business.includes('CONCEPT PREVIEW') &&
 business.includes('not a currently available business accounting service') &&
 business.includes('href="#business-focus"') &&
 business.includes('href="/#business"') &&
 !/<a class="action gold" href="\/#business"/.test(business) &&
 !business.includes('supabase.co') &&
 !/<form[\s>]/i.test(business));
check('Landing and seven public introductions now share navigation semantics',
 ['about/index.html','features/index.html','register/index.html',
  'privacy.html','terms.html','security.html','business/index.html'].every(path=>{
    const html=read(path);
    return html.includes('href="/#business"') &&
      html.includes('href="/#security"') &&
      html.includes('href="/business/"') &&
      html.includes('href="/security.html"') &&
      html.includes('class="nav-explore"') &&
      html.includes('href="/"');
  }) &&
 current.includes('href="#business" data-i18n="navBusiness"') &&
 current.includes('href="./business/" data-i18n="infoBusiness"') &&
 !(current.split('<nav class="nav" id="primary-nav"')[1]||'').split('</nav>')[0]
   .includes('href="./business/" data-i18n="navBusiness"'));
check('Private business.html is untouched and remains non-indexable',
 !actual.includes('business.html') &&
 source('business.html')===read('business.html') &&
 /<meta name="robots" content="noindex,nofollow,noarchive"/.test(read('business.html')));
check('Homepage auth/PWA bridge scripts unchanged',
 ['mmh-n10-recovery-error-route','mmh-pwa-standalone-root-bridge']
  .every(id=>dom(id,current)===dom(id,prev)));

/* L1.33 — public legal pages and consistent brand icon; no auth code changes. */
for(const page of [
 {path:'privacy.html',url:'https://mmhvault.com/privacy.html',title:'Privacy | MMHVAULT'},
 {path:'terms.html',url:'https://mmhvault.com/terms.html',title:'Terms of Use | MMHVAULT'},
 {path:'security.html',url:'https://mmhvault.com/security.html',title:'Security | MMHVAULT'}
]){
 const content=read(page.path);
 const head=content.split('</head>')[0];
 check(page.path+' has branded title, description and one canonical',
   head.includes('<title>'+page.title+'</title>') &&
   head.includes('<meta name="description" content="') &&
   (head.match(/rel="canonical"/g)||[]).length===1 &&
   head.includes('<link rel="canonical" href="'+page.url+'">'));
 check(page.path+' uses correct public sharing metadata',
   head.includes('og:site_name" content="MMHVAULT"') &&
   head.includes('og:url" content="'+page.url+'"') &&
   head.includes('https://mmhvault.com/images/mmhvault-logo-transparent.png'));
 check(page.path+' avoids favicon 404 and reserves logo space',
   head.includes('rel="icon" type="image/png" href="/images/mmhvault-logo-transparent.png"') &&
   content.includes('alt="MMHVAULT logo" width="38" height="38"'));
}
for(const path of ['register/index.html','features/index.html']){
 const head=read(path).split('</head>')[0];
 check(path+' uses existing brand logo for favicon, not missing .ico',
   head.includes('<link rel="icon" type="image/png" href="/images/mmhvault-logo-transparent.png">') &&
   !head.includes('/favicon.ico'));
}

/* L1.33 — conservative uncompressed resource budgets (not a lab speed score). */
const publicRuntimeBudgets={
  'index.html':100000,
  'landing-assets/landing.css':225000,
  'landing-assets/business.css':55000,
  'landing-assets/cinematic.css':40000,
  'landing-assets/cinematic.min.css':35000,
  'landing-assets/premium-l131.css':20000,
  'landing-assets/premium-l131.min.css':20000,
  'landing-assets/explore-l114.css':9000,
  'landing-assets/public-header-l115.css':16000,
  'landing-assets/shared-header-l116.css':20000,
  'landing-assets/header-explore-l147.min.css':26000,
  'landing-assets/public-pages.js':9300,
  'landing-assets/motion-l132.css':12000,
  'landing-assets/landing.js':110000,
  'landing-assets/motion-l132.js':15000,
  'landing-assets/cinematic-lake.webp':150000,
  'landing-assets/personal-business-concept.webp':150000,
  'images/mmhvault-logo-transparent.png':120000
};
for(const [file,maxBytes] of Object.entries(publicRuntimeBudgets)){
  check(file+' stays under uncompressed asset budget',fs.statSync(file).size<=maxBytes);
}
check('Landing priority image and below-fold concept use efficient loading',
  current.includes('width="1600" height="900"') &&
  current.includes('decoding="async" fetchpriority="high"') &&
  current.includes('loading="lazy" decoding="async"') &&
  current.includes('<link rel="preload" as="image" type="image/webp"') &&
  current.includes(l161LandingTag));
// Analytics V1: check external resources against the unmodified HTML.
const externalScriptTags = rawCurrent.match(/<script\b[^>]*\bsrc=["']https?:\/\/[^>]*><\/script>/gi) || [];
const approvedBeacon = /^<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon='\{"token":"[a-f0-9]{32}"\}'><\/script>$/.test(externalScriptTags[0] || '');
check('Landing ships no third-party blocking scripts or styles',
  externalScriptTags.length === 1 && approvedBeacon &&
  !/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i.test(rawCurrent));
/* L1.12 — policy pages share the Landing design without altering any
   substantive security/privacy/terms paragraph or disclaimer wording. */
for(const file of ['privacy.html','terms.html','security.html']){
 const content=read(file);
 const earlier=source(file);
 const originalPolicyCard=(earlier.match(/<article class="policy-card"[^>]*>[\s\S]*?<\/article>/)||[])[0];
 const currentPolicyCard=(content.match(/<article class="policy-card"[^>]*>[\s\S]*?<\/article>/)||[])[0];
 const originalTitle=(earlier.match(/<h1[^>]*>([^<]*)<\/h1>/)||[])[1];
 check(file+' original legal text unchanged and readable',
   !!originalTitle&&content.includes('<h1 id="policy-title">'+originalTitle+'</h1>') &&
   !!originalPolicyCard&&originalPolicyCard===currentPolicyCard);
 check(file+' uses unified Landing header, footer and canonical Home links',
   content.includes('<body class="public-landing-page policy-page mmh-nav-unified"') &&
   content.includes('<header class="site-header">') &&
   content.includes('class="nav-explore"') &&
   content.includes('class="public-footer"') &&
   content.includes('href="/business/"') &&
   content.includes('<a href="/" class="brand"') &&
   content.includes('href="/security.html"') &&
   !content.includes('href="index.html"'));
 check(file+' has no new authentication or financial-data processing',
   !/<form[\s>]/i.test(content) &&
   !/supabase\.createClient|SERVICE_ROLE_KEY|fetch\s*\(/.test(content));
}
check('Landing Security navigation stays in-page; independent Security details remain discoverable',
 current.includes('href="#security" data-i18n="navSecurity"') &&
 current.includes('href="./security.html" data-i18n="infoSecurity"') &&
 !(current.split('<nav class="nav" id="primary-nav"')[1]||'').split('</nav>')[0]
   .includes('href="./security.html" data-i18n="navSecurity"') &&
 current.includes('href="/" aria-current="page" data-i18n="navHome"') &&
 current.includes('href="/" class="brand"') &&
 !current.includes('href="#top" aria-current="page" data-i18n="navHome"'));
/* L1.14 — explicitly separate the five Landing sections from standalone
   indexable introduction pages. Do not change any public page content here. */
const rootNav=(current.match(/<nav class="nav" id="primary-nav"[^>]*>([\s\S]*?)<\/nav>/)||[])[1]||'';
check('Landing has five same-page primary sections and a separate Explore menu',
 ['features','business','about','security'].every(id=>
  rootNav.includes('href="#'+id+'" data-i18n="nav'+id[0].toUpperCase()+id.slice(1)+'"') &&
  current.includes('id="'+id+'"')) &&
 rootNav.includes('id="landing-explore"') &&
 ['about/','features/','business/','security.html','register/'].every(target=>
  rootNav.includes('href="./'+target+'" data-i18n="info')) &&
 (rootNav.match(/<details class="nav-explore"/g)||[]).length===1 &&
 (rootNav.match(/<summary>/g)||[]).length===1);
check('Homepage retains all prior content and SEO outside shared header layer',
 ['en','zh','my'].every(lang=>translationScript.includes('Object.assign(strings.'+lang+', {\n    navExplore:')) &&
 current.includes('<body id="top" class="l131 mmh-nav-unified">') &&
 current.includes('<link rel="stylesheet" href="./landing-assets/header-explore-l147.min.css?v=l147">') &&
 l142IndexOnlyEdited() &&
 l133BurmeseLayoutOnlyEdited() &&
 source('landing-assets/explore-l114.css')===read('landing-assets/explore-l114.css'));
const publicHeaders=['about/index.html','features/index.html','business/index.html',
 'register/index.html','security.html','privacy.html','terms.html'];
const landingHeader=(current.match(/<header class="site-header">[\s\S]*?<\/header>/)||[])[0]||'';
function normalizeSharedHeader(h){
  return h.replace(/ data-(?:en|zh|my)="[^"]*"/g,'')
    .replace(/href="\/#(features|business|about|security)"/g,'href="#$1"')
    .replace(/href="\/(about|features|business|register)\/"/g,'href="./$1/"')
    .replace(/href="\/(security|login)\.html"/g,'href="./$1.html"')
    .replace('href="/" data-i18n="navHome"','href="/" aria-current="page" data-i18n="navHome"');
}
const sharedCss=read('landing-assets/shared-header-l116.css');
// L1.20: compare public HTML byte-for-byte after removing ONLY the new head
// JSON-LD script. All visible text, SEO tags, JS and shared nav must match main.
const l120Open='\n<script type="application/ld+json" data-mmh-l120="webpage">\n';
const l120Close='\n</script>\n';
function stripL120SeoHead(html){
 const start=html.indexOf(l120Open);
 if(start<0)return html;
 const end=html.indexOf(l120Close,start+l120Open.length);
 if(end<0)return html;
 return html.slice(0,start)+html.slice(end+l120Close.length);
}

/* L1.17 — Only Features/Register may replace their permanently visible
 * Chinese+Burmese text block with one EN/ZH/MY-localized paragraph. Undo that
 * exact replacement before comparing the rest of the published page bytewise. */
function restoreOldLocalizedSummary(path,newHtml,previousHtml){
 if(!['features/index.html','register/index.html'].includes(path))return newHtml;
 const oldBlock=(previousHtml.match(/<div class="lang-summary" aria-label="MMHVAULT multilingual description">[\s\S]*?<\/div>/)||[])[0];
 const newBlock=(newHtml.match(/<div class="lang-summary lang-summary-localized" aria-label="MMHVAULT description in the selected language">[\s\S]*?<\/div>/)||[])[0];
 if(!oldBlock||!newBlock||
  (newHtml.match(/class="lang-summary lang-summary-localized"/g)||[]).length!==1)return newHtml;
 return newHtml.replace(newBlock,oldBlock);
}
check('Seven public pages inherit exact Landing header structure, icons and dropdown',
 !!landingHeader && publicHeaders.every(path=>{
   const html=read(path),old=source(path);
   const h=(html.match(/<header class="site-header">[\s\S]*?<\/header>/)||[])[0]||'';
   const cssNew='<link rel="stylesheet" href="/landing-assets/shared-header-l116.css?v=1">';
   return !!h && normalizeSharedHeader(h)===landingHeader &&
     html.includes(cssNew) && old.includes(cssNew) &&
     // L1.16 already shipped; protect its header, page body and SEO
     // byte-for-byte, allowing ONLY the two localized summary blocks.
     restoreOldLocalizedSummary(path,l158RestoreScript(l163RestoreCss(html)),old)===old &&
     (h.match(/<details class="nav-explore"/g)||[]).length===1 &&
     (h.match(/class="mobile-nav-auth"/g)||[]).length===1 &&
     (h.match(/class="locale-menu"/g)||[]).length===1;
 }));
check('One scoped public header stylesheet loads last on homepage and all pages',
 current.includes('href="./landing-assets/header-explore-l147.min.css?v=l147"') &&
 publicHeaders.every(path=>read(path).includes('href="/landing-assets/shared-header-l116.css?v=1"')) &&
 sharedCss.includes('body.mmh-nav-unified .site-header') &&
 sharedCss.includes('@media(max-width:1360px)') &&
 !sharedCss.includes('body.app') &&
 !/\bfetch\s*\(|supabase\.createClient|SERVICE_ROLE_KEY|location\.replace/.test(read('landing-assets/public-pages.js')));
check('Public features and register show exactly one localized statement per selected language',
 ['features/index.html','register/index.html'].every(path=>{
   const html=read(path),prior=source(path);
   const lead=prior.match(/<p class="lead"><span\s+data-en="([^"]+)" data-zh="([^"]+)" data-my="([^"]+)">/);
   const summary=html.match(/<div class="lang-summary lang-summary-localized"[^>]*>\s*<p data-en="([^"]+)" data-zh="([^"]+)" data-my="([^"]+)">([^<]+)<\/p>\s*<\/div>/);
   return !!lead&&!!summary&&
     summary[1]===lead[1]&&summary[2]===lead[2]&&summary[3]===lead[3]&&summary[4]===lead[1] &&
     (html.match(/class="lang-summary lang-summary-localized"/g)||[]).length===1 &&
     !/<p lang="(?:zh-CN|my)">/.test(html);
 }) &&
 publicHeaders.filter(path=>!['features/index.html','register/index.html'].includes(path))
   .every(path=>!read(path).includes('class="lang-summary"')) &&
 read('landing-assets/public-pages.css').includes('.public-landing-page .lang-summary-localized{') &&
 read('landing-assets/public-pages.js').includes("document.querySelectorAll('[data-en][data-zh][data-my]')"));
check('L1.18 subtle surfaces and public motion remain scoped and accessible',
  read('landing-assets/premium-l131.css').includes('L1.18 — restrained warm-gold') &&
  read('landing-assets/public-pages.css').includes('L1.18 — quiet, consistent') &&
  read('landing-assets/public-pages.css').includes('@media(prefers-reduced-motion:reduce)') &&
  read('landing-assets/public-pages.css').includes('body.public-landing-page.mm-public-motion .mm-public-reveal:not(.mm-public-shown)') &&
  read('landing-assets/public-pages.js').includes('L1.18 — progressive, one-shot reveals') &&
  read('landing-assets/public-pages.js').includes("'IntersectionObserver' in window") &&
  read('landing-assets/public-pages.js').includes("document.body?.classList.contains('public-landing-page')") &&
  !['fetch(', 'supabase', 'SERVICE_ROLE_KEY', 'location.replace'].some(
    term=>read('landing-assets/public-pages.js').includes(term)));
check('L1.19 tablet and phone layout refinement stays presentation-only',
 read('landing-assets/premium-l131.css').includes('L1.19 — compact-screen rhythm') &&
 read('landing-assets/public-pages.css').includes('L1.19 — readable public intro actions') &&
 read('landing-assets/premium-l131.css').includes('body.l131 .hero .hero-buttons .button') &&
 read('landing-assets/public-pages.css').includes('grid-template-columns:minmax(0,1fr)') &&
 read('landing-assets/public-pages.css').includes('@media(prefers-reduced-motion:reduce)'));
/* L1.20 — indexable subpages identify their purpose and official parent
 * without inventing social profiles, support channels or product availability. */
const l120Entities=[
 {path:'features/index.html',url:'https://mmhvault.com/features/',name:'Personal Finance Features',about:'software',policy:false},
 {path:'register/index.html',url:'https://mmhvault.com/register/',name:'Create Your Account',about:'software',policy:false},
 {path:'security.html',url:'https://mmhvault.com/security.html',name:'Security information',about:'brand',policy:true},
 {path:'privacy.html',url:'https://mmhvault.com/privacy.html',name:'Privacy',about:'brand',policy:true},
 {path:'terms.html',url:'https://mmhvault.com/terms.html',name:'Terms of use',about:'brand',policy:true}
];
check('L1.20 canonical, named WebPage and breadcrumb structured data are accurate',
 l120Entities.every(({path,url,name,about,policy})=>{
  const html=read(path),head=html.split('</head>')[0];
  const matches=[...head.matchAll(/<script type="application\/ld\+json" data-mmh-l120="webpage">([\s\S]*?)<\/script>/g)];
  if(matches.length!==1)return false;
  const data=JSON.parse(matches[0][1]);
  const nodes=data['@graph'];
  const page=nodes?.find(node=>node['@type']==='WebPage');
  if(data['@context']!=='https://schema.org' ||
     !page || page.url!==url || page['@id']!==url+'#page' ||
     page.name!==name || page.isPartOf?.['@id']!=='https://mmhvault.com/#website' ||
     page.about?.['@id']!=='https://mmhvault.com/#'+about ||
     !head.includes('<link rel="canonical" href="'+url+'">') ||
     !head.includes('<meta name="description" content="'+page.description+'">'))return false;
  if(policy){
   const breadcrumb=nodes.find(node=>node['@type']==='BreadcrumbList');
   if(!breadcrumb||page.breadcrumb?.['@id']!==breadcrumb['@id'] ||
     breadcrumb.itemListElement?.[0]?.item!=='https://mmhvault.com/' ||
     breadcrumb.itemListElement?.[1]?.item!==url)return false;
  }else if(!head.includes('"@type":"BreadcrumbList"'))return false;
  return l158RestoreScript(l163RestoreCss(html))===source(path);
 }));
check('L1.23 lightweight scroll reveals are opacity+transform only, motion access preserved',
 read('landing-assets/motion-l132.css').includes('L1.23: compositor-friendly') &&
 read('landing-assets/motion-l132.css').includes('opacity 550ms') &&
 read('landing-assets/motion-l132.css').includes('transform 590ms') &&
 read('landing-assets/motion-l132.css').includes('transition-duration: 410ms,440ms') &&
 !/filter\s*:\s*blur\(|filter\s+\d+ms/.test(read('landing-assets/motion-l132.css')) &&
 read('landing-assets/motion-l132.css').includes('L1.21 — seamless product preview') &&
 read('landing-assets/public-pages.css').includes('L1.23 — lighter fade/translate reveals') &&
 read('landing-assets/public-pages.css').includes('transition-duration:410ms,445ms') &&
 read('landing-assets/public-pages.css').includes('@media(prefers-reduced-motion:reduce)'));
check('L1.24 preload prioritizes the one real Hero image with no duplicate image preload',
 l142IndexOnlyEdited() &&
 current.includes('<img class="hero-device-cinematic" src="./landing-assets/personal-business-concept.webp"') &&
 current.includes('decoding="async" fetchpriority="high"') &&
 current.includes('loading="lazy" decoding="async"') &&
 !current.includes(oldHeroPreload));
check('L1.25 Hero only waits for decoded pixels, preserving original fallback',
 l133BurmeseLayoutOnlyEdited() &&
 l142IndexOnlyEdited() &&
 current.includes(newHeroPreload) &&
 !current.includes(oldHeroPreload));
check('L1.27 public tab title matches SEO without language focus scroll',
 l133BurmeseLayoutOnlyEdited() &&
 l133PublicPagesUnchanged() &&
 l142IndexOnlyEdited() && current.includes(newHeroPreload) &&
 !current.includes(oldHeroPreload));
check('L1.66 strict twelve-file desktop Hero halo optimization; protected areas unchanged',
  actual.length===12 &&
  actual.every(path=>[
    'index.html','landing-assets/safari-performance-l164.css',
    'landing-assets/landing-webkit-check.cjs',
    'landing-assets/landing-release-check.cjs',
    'landing-assets/landing-browser-check.cjs',
    ...publicHeaders
  ].includes(path)) &&
  rawCurrent===rawPrevious.replace(l165HomeLink,l166HomeLink) &&
  publicHeaders.every(path=>{
    const old=source(path);
    return old.split(l165PublicLink).length===2 &&
      read(path)===old.replace(l165PublicLink,l166PublicLink);
  }) &&
  source('landing-assets/safari-performance-l164.css')===l164SafariCSS+l165SafariPatch &&
  read('landing-assets/safari-performance-l164.css')===l164SafariCSS+l165SafariPatch+l166SafariPatch &&
  l166SafariPatch.includes('body.l131 .hero-halo') &&
  l166SafariPatch.includes('@media (min-width: 1025px)') &&
  !l166SafariPatch.includes('body.app') &&
  l165SafariPatch.includes('@media (min-width: 1025px)') &&
  l165SafariPatch.includes('transition-property: opacity, transform, border-color') &&
  l165SafariPatch.includes('body.l131 #business .business-stage::after') &&
  !l165SafariPatch.includes('body.app') &&
  l164WorkflowOnlyEdited() &&
  read('landing-assets/landing-webkit-check.cjs').includes('MACOS WEBKIT QA PASS') &&
  l163FooterCssOnlyEdited() && l139PublicOnlyEdited() && l139MotionOnlyEdited() &&
  current===prev && analyticsAddition.test(rawCurrent) &&
  l142IndexOnlyEdited() && l133BurmeseLayoutOnlyEdited() &&
  l133PublicPagesUnchanged() && l135HeaderCssOnlyEdited() &&
  ['landing-assets/business.css','landing-assets/cinematic.css',
    'landing-assets/premium-l131.css','landing-assets/motion-l132.css',
    'sitemap.xml','robots.txt','mmh-manifest-v2.webmanifest'
  ].every(path=>read(path)===source(path)));
// The device image remains decoded-before-show, with no invisible opacity
// transition on phones/tablets. This is the only change to cinematic.css.
const l140HeroCssSuffix="\n/* L1.40 — Once the phone/tablet Hero image has decoded, swap it in\n   without a second opacity delay that could expose a blank frame after\n   the HTML fallback is hidden. Keep desktop presentation unchanged. */\n@media (max-width: 900px) {\n  body.l131 .hero-device-cinematic { transition: none; }\n}\n";
check('L1.40 decoded mobile Hero has no delayed blank paint', 
  read('landing-assets/cinematic.css')===source('landing-assets/cinematic.css') &&
  read('landing-assets/cinematic.css').endsWith(l140HeroCssSuffix) &&
  l140HeroCssSuffix.includes('@media (max-width: 900px)') &&
  l140HeroCssSuffix.includes('body.l131 .hero-device-cinematic { transition: none; }') &&
  !l140HeroCssSuffix.includes('body.app') &&
  !l140HeroCssSuffix.includes('user-scalable=no'));
check('L1.41 all nine first-party style/script URLs keep coordinated versions',
  l142IndexOnlyEdited() &&
  l141AssetReplacements.length===9 &&
  l141AssetReplacements.every(([before,after])=>{
    const tag=after.replace('landing.css?v=l141','landing.min.css?v=l145')
      .replace('cinematic.css?v=l141','cinematic.min.css?v=l146')
      .replace('premium-l131.css?v=l141','premium-l131.min.css?v=l146')
      .replace('landing.js?v=l141','landing.js?v=l161')
      .replace('motion-l132.js?v=l141','motion-l132.js?v=l159');
    const bundled=/explore-l114\.css|shared-header-l116\.css/.test(after);
    return before!==after && after.includes('?v=l141') && !current.includes(before) &&
      (bundled ? current.includes(l147NewHeaderTags)&&!current.includes(after) :
        current.split(tag).length===(/business\.css|motion-l132\.css/.test(after)?3:2));
  }) &&
  (current.match(/<link rel="preload" as="image"/g)||[]).length===1 &&
  (current.match(/<script defer src=/g)||[]).length===2 &&
  !current.includes('user-scalable=no'));
check('L1.42 below-fold Business stylesheet is nonblocking with accessible noscript fallback',
  l142IndexOnlyEdited() &&
  current.includes(l142NewBusinessTag) &&
  current.includes('media="print" onload="this.onload=null;this.media=\'all\'"') &&
  (current.match(/<noscript>/g)||[]).length===2 &&
  (current.match(/<link rel="stylesheet"/g)||[]).length===8 &&
  (current.match(/<script defer src=/g)||[]).length===2 &&
  !current.includes('user-scalable=no') &&
  read('landing-assets/business.css')===source('landing-assets/business.css'));
check('L1.43 reproducible cold-cache browser-only performance lab and downloadable report',
  l144IndexOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes("const l143Samples=[];") &&
  read('landing-assets/landing-browser-check.cjs').includes("Network.emulateNetworkConditions") &&
  read('landing-assets/landing-browser-check.cjs').includes("Emulation.setCPUThrottlingRate") &&
  read('landing-assets/landing-browser-check.cjs').includes("'largest-contentful-paint'") &&
  read('landing-assets/landing-browser-check.cjs').includes("'layout-shift'") &&
  read('landing-assets/landing-browser-check.cjs').includes("performance-l143.json") &&
  read('.github/workflows/landing-release-check.yml').includes('landing-qa-screenshots/performance-l143.json') &&
  l148LandingJsOnlyEdited() &&
  read('landing-assets/cinematic.css')===source('landing-assets/cinematic.css') &&
  read('landing-assets/premium-l131.css')===source('landing-assets/premium-l131.css'));
check('L1.44 motion stylesheet loads without blocking Hero and keeps no-script styling',
  l144IndexOnlyEdited() &&
  current.includes(l144NewMotionTag) &&
  !current.includes(l144OldMotionTag) &&
  (current.match(/<noscript>/g)||[]).length===2 &&
  read('landing-assets/motion-l132.css')===source('landing-assets/motion-l132.css') &&
  l139MotionOnlyEdited() &&
  l148LandingJsOnlyEdited() &&
  read('landing-assets/explore-l114.css')===source('landing-assets/explore-l114.css') &&
  read('landing-assets/shared-header-l116.css')===source('landing-assets/shared-header-l116.css'));
check('L1.45 compacted CSS exactly matches formatting-only transformation with safe cache key',
  l145IndexOnlyEdited() &&
  l145CssOnlyEdited() &&
  current.includes(l145NewLandingTag) &&
  !current.includes(l145OldLandingTag) &&
  read('landing-assets/landing.min.css').includes('scroll-behavior:smooth') &&
  read('landing-assets/landing.min.css').includes('Noto Sans Myanmar') &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.45 CSSOM rule-for-rule equivalence') &&
  l164WorkflowOnlyEdited() &&
  read('landing-assets/cinematic.css')===source('landing-assets/cinematic.css') &&
  l148LandingJsOnlyEdited());
check('L1.46 generated critical CSS matches readable originals and only changes two versioned links',
 l146IndexOnlyEdited() &&
 l146CssLinks.length===2 &&
 ['cinematic','premium-l131'].every(name=>{
  const original=source('landing-assets/'+name+'.css');
  const compact=read('landing-assets/'+name+'.min.css');
  return read('landing-assets/'+name+'.css')===original &&
   compact===l145CompactCss(original) &&
   compact.length<original.length-500 &&
   current.includes('href="./landing-assets/'+name+'.min.css?v=l146"') &&
   !current.includes('href="./landing-assets/'+name+'.css?v=l141"');
 }) &&
 read('landing-assets/landing.css')===source('landing-assets/landing.css') &&
 l145CssOnlyEdited() &&
 read('landing-assets/landing-browser-check.cjs').includes('L1.46 CSSOM critical style parity') &&
 l148LandingJsOnlyEdited() &&
 read('landing-assets/explore-l114.css')===source('landing-assets/explore-l114.css') &&
 read('landing-assets/shared-header-l116.css')===source('landing-assets/shared-header-l116.css'));
check('L1.47 ordered header bundle remains identical to merged main',
 l147IndexOnlyEdited(prev) &&
 read('landing-assets/header-explore-l147.min.css')===
  l145CompactCss(source('landing-assets/explore-l114.css'))+
  l145CompactCss(source('landing-assets/shared-header-l116.css')) &&
 read('landing-assets/explore-l114.css')===source('landing-assets/explore-l114.css') &&
 read('landing-assets/shared-header-l116.css')===source('landing-assets/shared-header-l116.css') &&
 read('landing-assets/header-explore-l147.min.css').length<
  read('landing-assets/explore-l114.css').length+
  read('landing-assets/shared-header-l116.css').length-2500 &&
 (current.match(/<link rel="stylesheet"/g)||[]).length===8 &&
 !current.includes('href="./landing-assets/explore-l114.css?v=l141"') &&
 !current.includes('href="./landing-assets/shared-header-l116.css?v=l141"') &&
 read('landing-assets/landing-browser-check.cjs').includes('L1.47 Chrome CSSOM header bundle parity') &&
 l148LandingJsOnlyEdited());
check('L1.49 repeat concept tabs preserved through L1.55',
  l148IndexOnlyEdited() && l148LandingJsOnlyEdited() &&
  current.includes(l161LandingTag) &&
  !current.includes(l154NewScriptTag) &&
  source('landing-assets/landing.js').includes(l149BusinessClickAfter) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.49 active Business tab no-op browser parity'));
check('L1.50 same-language selection is isolated and retains menu keyboard behavior',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.50 active language selection no-op browser parity') &&
  source('landing-assets/landing.js').includes("localeTrigger.focus({preventScroll:true});") &&
  read('landing-assets/landing.js').includes("localeTrigger.focus({preventScroll:true});"));
check('L1.51 section nav state updates only when aria-current changes',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.51 repeated section nav highlight DOM parity') &&
  read('landing-assets/landing.js').includes(l151MarkSectionAfter));
check('L1.52 preview tab selection changes only relevant ARIA/tabindex values',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.52 preview tab attribute browser parity') &&
  read('landing-assets/landing.js').includes(l152PreviewTabAfter));
check('L1.53 Business language attr writes only on actual semantic changes',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.53 Business locale metadata no-op browser parity') &&
  l153BusinessAttrPatches.every(([oldCode,newCode])=>
    source('landing-assets/landing.js').includes(newCode) &&
    !source('landing-assets/landing.js').includes(oldCode) &&
    read('landing-assets/landing.js').includes(newCode)));
check('L1.54 language and feature title hydration skips identical writes',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.54 initial feature and language labels browser parity') &&
  l154HydrationPatches.every(([oldCode,newCode])=>
    source('landing-assets/landing.js').includes(newCode) &&
    !source('landing-assets/landing.js').includes(oldCode) &&
    read('landing-assets/landing.js').includes(newCode)));
check('L1.56 released Business interruption remains intact',
  l139MotionOnlyEdited() &&
  prev.includes(l159NewMotionTag) &&
  current.includes(l159NewMotionTag) &&
  !current.includes(l156OldMotionTag) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.56 Business WAAPI interruption browser parity'));
check('L1.58 public introduction pages rebind observer after viewport changes',
  l139PublicOnlyEdited() &&
  publicHeaders.every(path=>read(path).includes(l161ScriptTag)) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.58 rotated public-page observer parity') &&
  l148IndexOnlyEdited());
check('L1.57 orientation-aware observer rebind is isolated to Landing presentation',
  l139MotionOnlyEdited() &&
  current.includes(l159NewMotionTag) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.57 rotated viewport reveal observer parity') &&
  !read('landing-assets/motion-l132.js').includes('preventDefault(') &&
  !read('landing-assets/motion-l132.js').includes('localStorage') &&
  l139PublicOnlyEdited());
check('L1.60 live reduced-motion settles all public-page reveals without content changes',
  l139PublicOnlyEdited() &&
  publicHeaders.every(path=>read(path).includes(l161ScriptTag)) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.60 live reduced-motion public-page reveal persistence'));
check('L1.59 live reduced-motion change permanently reveals all pending Landing cards',
  l139MotionOnlyEdited() &&
  current.includes(l159NewMotionTag) &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.59 live reduced-motion reveal persistence') &&
  !read('landing-assets/motion-l132.js').includes('preventDefault('));
check('L1.55 interrupted crossfade isolated from current main',
  l148LandingJsOnlyEdited() &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.55 preview interruption browser parity') &&
  current.includes(l161LandingTag));
check('L1.48 measured language DOM improvements preserved',
  source('landing-assets/landing.js').includes('L1.48: preserve the existing node') &&
  read('landing-assets/landing-browser-check.cjs').includes('L1.48 measured initial-language DOM write parity'));
check('L1.34 mobile EN ZH MY card stability and touch-safe scrolling',
  l133BurmeseLayoutOnlyEdited() &&
  l134ResponsiveCssSuffix.includes('min-height: 94px') &&
  l134ResponsiveCssSuffix.includes('min-height: 108px') &&
  l134ResponsiveCssSuffix.includes('overflow-wrap: anywhere') &&
  l134ResponsiveCssSuffix.includes('prefers-reduced-motion: no-preference') &&
  !l134ResponsiveCssSuffix.includes('touch-action: none') &&
  !l134ResponsiveCssSuffix.includes('user-scalable=no') &&
  !l134ResponsiveCssSuffix.includes('body.app'));
check('L1.35 mobile selected language is visible without changing header size',
  l135HeaderCssOnlyEdited() &&
  l135HeaderCssSuffix.includes('max-width: 700px') &&
  l135HeaderCssSuffix.includes('.locale-globe') &&
  l135HeaderCssSuffix.includes('.locale-active-flag') &&
  l135HeaderCssSuffix.includes('display: inline-flex !important') &&
  !l135HeaderCssSuffix.includes('touch-action: none') &&
  !l135HeaderCssSuffix.includes('user-scalable=no') &&
  !l135HeaderCssSuffix.includes('body.app') &&
  l142IndexOnlyEdited());
check('L1.36 compact public mobile header buttons are 44 CSS pixels',
  l136HeaderTargetsOnlyEdited() &&
  l136TouchTargetReplacements.length===3 &&
  l136TouchTargetReplacements.every(([a,b])=>a!==b && b.includes('44px')) &&
  read('landing-assets/shared-header-l116.css').length<=20000 &&
  l142IndexOnlyEdited() &&
  l137LandingJSOnlyEdited() &&
  l137PublicJSOnlyEdited());
check('L1.37 public languages synchronize across tabs without auth or navigation',
  l137LandingJSOnlyEdited() && l137PublicJSOnlyEdited() &&
  l137LandingStorageHook.includes("window.addEventListener('storage'") &&
  l137PublicStorageHook.includes("window.addEventListener('storage'") &&
  l137LandingStorageHook.includes('event.key !== storageKey') &&
  l137PublicStorageHook.includes('event.key !== storageKey') &&
  !l137LandingStorageHook.includes('fetch(') &&
  !l137PublicStorageHook.includes('fetch(') &&
  !l137LandingStorageHook.includes('location.') &&
  !l137PublicStorageHook.includes('location.') &&
  l142IndexOnlyEdited());
check('L1.38 calmer paint-only public panels preserve accessibility and asset budget',
 l138MotionOnlyEdited() &&
 l138MotionReplacements.length===4 &&
 read('landing-assets/shared-header-l116.css').length<=20000 &&
 read('landing-assets/shared-header-l116.css').includes('prefers-reduced-motion:no-preference') &&
 read('landing-assets/shared-header-l116.css').includes('prefers-reduced-motion:reduce') &&
 l148LandingJsOnlyEdited() &&
 l139PublicOnlyEdited() &&
 l142IndexOnlyEdited());
check('L1.40 phone scroll reveals prewarm outside viewport without layout edits',
 l139MotionOnlyEdited() && l139PublicOnlyEdited() &&
 read('landing-assets/motion-l132.js').includes("mobileReveal?'0px 0px 24% 0px':'0px 0px -6% 0px'") &&
 read('landing-assets/public-pages.js').includes("mobileReveal?'0px 0px 12% 0px':'0px 0px -4% 0px'") &&
 !l139MotionInsertion.includes('preventDefault(') &&
 !l139PublicInsertion.includes('preventDefault(') &&
 l148LandingJsOnlyEdited() &&
 read('landing-assets/motion-l132.css')===source('landing-assets/motion-l132.css') &&
 l163FooterCssOnlyEdited() &&
 l142IndexOnlyEdited());
check('L1.28 shared header motion remains unchanged and accessible',
 l135HeaderCssOnlyEdited() &&
 !read('landing-assets/shared-header-l116.css').includes('body.app') &&
 read('landing-assets/shared-header-l116.css').includes('prefers-reduced-motion:no-preference') &&
 read('landing-assets/shared-header-l116.css').includes('animation:mmh-public-panel-in') &&
 read('landing-assets/shared-header-l116.css').includes('body.mmh-nav-unified .site-header .locale-menu:not([hidden])'));
check('L1.29 localized action names work without changing content or header geometry',
 ['en','zh','my'].every(lang=>read('landing-assets/landing.js').includes(
   lang+': {open:')) &&
 read('landing-assets/landing.js').includes('syncNavToggleLabel();') &&
 read('landing-assets/public-pages.js').includes('syncNavToggleLabel();') &&
 l135HeaderCssOnlyEdited());
check('L1.30 initial feature links render without a Dashboard flash',
 l133BurmeseLayoutOnlyEdited() &&
 l133PublicPagesUnchanged() &&
 read('landing-assets/landing.js').includes("syncProductHash(true)") &&
 read('landing-assets/landing.js').includes("const animate=!instant &&") &&
 l142IndexOnlyEdited());
check('L1.31 current-tab reselect never resets scroll or interrupts preview animation',
 l133BurmeseLayoutOnlyEdited() &&
 l133PublicPagesUnchanged() &&
 read('landing-assets/landing.js').includes('if(name===activeProduct&&!instant)') &&
 read('landing-assets/landing.js').includes('t.focus({preventScroll:true})') &&
 read('landing-assets/landing.js').includes('syncProductHash(true)') &&
 l142IndexOnlyEdited());
check('L1.32 feature labels follow all languages and canonical English snippet persists',
 l133BurmeseLayoutOnlyEdited() &&
 l133PublicPagesUnchanged() &&
 read('landing-assets/landing.js').includes('productLabels[currentLang][activeProduct]') &&
 read('landing-assets/landing.js').includes("desc.setAttribute('content', officialEnglishDescription)") &&
 read('landing-assets/landing.js').includes('syncProductHash(true)') &&
 l142IndexOnlyEdited());
check('L1.33 Myanmar-only feature names and story styles are appended without JS changes',
 l133BurmeseLayoutOnlyEdited() &&
 l133BurmeseCssSuffix.includes('html[lang="my"] body.l131 .features-explorer.app-showcase') &&
 l133BurmeseCssSuffix.includes('min-height:76px') &&
 !l133BurmeseCssSuffix.includes('body.app') &&
 read('landing-assets/landing.js').includes('productLabels[currentLang][activeProduct]') &&
 l142IndexOnlyEdited());
check('Protected auth/PWA/SEO/config sources unchanged in PR diff',
 ['business.html','app.html','login.html','sitemap.xml','robots.txt',
  'mmh-manifest-v2.webmanifest'].every(file=>{
    const test=cp.spawnSync('git',['diff','--quiet',main+'...HEAD','--',file],
      {encoding:'utf8',maxBuffer:4096});
    return test.status===0;
  }));
check('Homepage N10 recovery and standalone guards are unchanged from main',
 ['mmh-n10-recovery-error-route','mmh-pwa-standalone-root-bridge']
   .every(id=>dom(id,current)===dom(id,prev)));

console.log('Landing launch preflight: '+passed+'/'+passed+' PASS — no live authentication or PWA device claim.');
