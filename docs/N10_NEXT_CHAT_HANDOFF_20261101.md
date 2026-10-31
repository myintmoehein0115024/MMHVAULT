# MMHVAULT — N10 安全验收 / V11 开发交接（2026-11-01）

> **用于新对话的完整接续说明（已提前准备）。** 当前仅允许继续安全审查、Draft PR 离线优化及明确获准的 Staging 验收；不得自行合并或上线。遇到对话上限，把本文件链接交给新对话即可。**禁止复制密码、JWT、TOTP、恢复十词、任何密钥或真实用户财务数据。**

## 项目与仓库
- 正式站：https://mmhvault.com
- 正式源码：https://github.com/myintmoehein0115024/MMHVAULT
- **N10 唯一正在审查的 Draft PR #2**：https://github.com/myintmoehein0115024/MMHVAULT/pull/2
- N10 分支：`feature/n10-fixed-recovery-key-modal-20261031`，**Draft / unmerged**
- Staging Auth Project：`ldivswlhtgmznzwhzsoi`；生产 Supabase Project：`vrypucmyrztxgiqhjspd`。**不可混用**。
- QA 站仓库：https://github.com/myintmoehein0115024/MMHVAULT-Auth-QA
- **V11 暂停**：登录/全站 UI、Accounts/Transactions 同步、多币种、PWA、Life Planner 等仅在 N10 安全上线后分阶段审查与开发。Landing 另有独立 Draft PR，不得互相覆盖。

## 真实完成的 Staging QA（仅用户可控合成账户）
1. 已签入 A/B 两个短期测试账号，各完成一次性**合成十词**生成、HMAC 原始校验、Vault 加密备份、重新验证密码和本人读取。用户截图证明。
2. B 初始备份状态为「否」；备份后再次读取成功。B 退出后旧会话携带的 Bearer 被服务器 HTTP 401 拒绝。已登录情况下输入**错误密码**读取密钥被 HTTP 401 `invalid_credentials` 拒绝；45 秒前端自动隐藏经用户实际确认。
3. 独立新 MFA 合成账户安装 **verified TOTP**；用户截图：AAL1 缺少动态验证 → **HTTP 403 `MFA_REQUIRED` PASS**；六位 TOTP 验证后提升 AAL2 → **HTTP 200 `MFA_ALLOWED` PASS**。**这是独立 Staging MFA 检查端点的真实授权测试，不是固定恢复密钥服务与 MFA 的联合联测**。
4. 上述 **3 个新建合成账号全部由用户手动删除，并已通过只读 auth.users 清单查询核实不存在**。旧的 Staging 账号不应删除。
5. 用户确认删除本轮专用的 Staging Secret `N10_FIXED_RECOVERY_QA_HMAC_KEY`（**没有可用的密钥清单工具独立核对**）。不要请求或重新生成旧 Secret。
6. 恢复密钥临时 QA Edge `mmh-n10-fixed-vault-qa-locked` v8 已**退役**为纯 HTTP 410 `qa_retired` 代码，`verify_jwt=true`，源文件 `security/n10-fixed-recovery-vault-candidate/qa-retired-tombstone-STAGING.ts`。Edge 管理界面仍显示 ACTIVE，意味着部署存在，**不意味着备份/读取功能仍可用**。退役码不调用 Vault、Auth、数据库或 Secrets。
7. 独立旧恢复 QA 页面 `n10-fixed-vault-qa.html` 和 MFA QA 页面 `n10-mfa-aal-qa.html` 已改为静态「测试已结束」，均不含脚本、密码或动态码输入。**不可擅自恢复旧入口。**
8. 另外一个更早的 Staging MFA 辅助 Edge `mmh-n10-qa-edge-mfa-20261031` 有其他 QA modes，**并非纯本次专用**，为了避免破坏其他测试未删除。

## 数据库清理审查 — 注意真实限制
- Staging 只读 `pg_catalog` 已确认：
  - `mmh_n10_privacy.recovery_backup_index.user_id` FK → `auth.users.id ON DELETE CASCADE`；
  - `public.mmh_n10a769_recovery_phrases.user_id` FK → `auth.users.id ON DELETE CASCADE`；
  - `mmh_n10_recovery_secret_gc` 是已启用的 `AFTER DELETE` 行级触发器；
  - 其审查过的迁移代码删除对应 `vault.secrets` 记录。
- **重要未通过项：** 曾尝试进行 Vault secret/index 实例清单的只读 SQL 审计，**被 OpenAI 安全检查拦截**。**不得换 SQL、换连接或换方式绕过**；不能声称实际密钥无残留或删除级联真正端到端 PASS。需待允许的安全审计机制/人工合规验证。
- Staging 安全 Advisor：旧 `authenticated` SECURITY DEFINER QA 函数存在 WARN，但函数包含 `auth.uid()` 和服务器 MFA 校验；未贸然修改；泄露密码保护在 Staging 上仍关闭（WARN）；无策略的私有 RLS 表有 INFO。不要借此修改生产。
- 目前代码审查和数据库结构检查属于设计/静态通过，不是生产授权。

## Draft PR 安全改进进度
- 生产候选 Edge `security/n10-fixed-recovery-vault-candidate/index.ts` **严格钉住** `EXPECTED_BASE=https://vrypucmyrztxgiqhjspd.supabase.co` 和 `ORIGIN=https://mmhvault.com`，放弃按 BASE 自动推断 origin。
- **硬关闭** `const RECOVERY_RELEASE_ENABLED=false;`；username signup 候选也 `RELEASE_ENABLED=false`。任何上线前必须另行授权且完成失败回滚条件。
- 新增退役端点离线检查；最近一次纯 JS 断言 **36/36 PASS**。GitHub Actions／Deno 的最新实际工作流结果**未核实**，不能声称 CI 全绿。
- **额外 MFA 防旧令牌修复（当前 Draft）**：`security/n10-fixed-recovery-vault-candidate/mfa-assurance.mjs` 在服务器已查不到 verified 因子时，拒绝带旧 `aal2` 声明的过期状态登录令牌（返回 `unavailable`），要求使用新会话。已同步调整 `test-mfa-assurance.mjs` 的回归用例；10/10 项纯 JS 模拟 JWT 声明场景通过（**不是已签名的真实 Auth/JWT 端到端**），其余规则维持原样。
- 正式的 `app.html`、`login.html`、DNS、RLS、Auth 开关、财务数据 **本轮均未改动**。不得直接合并 Draft PR #2。

新增 **3 项静态访问顺序回归检查**：严格保持请求 Origin／Method／release gate → JWT 与 live session → 限流与密码再验证 → MFA 重检 → Vault 解密 → 再次 MFA／Session 检查 → 45 秒密钥响应的顺序；备份前必须核对原始不可变 HMAC verifier。**35/35 PASS 是源码断言，不是独立真实端到端验收。**

- **Vault 写入前复验加强：** 最新 Draft 的固定恢复 Edge 在核对十词 HMAC verifier 后、调用 `mmh_n10_recovery_backup_put` 前，重新从服务器检查当前 JWT 身份/MFA 和 `auth.sessions` 会话状态，任何异常全部拒绝；该防护减少异步时间窗口，但**不构成跨 Auth 与 Vault 事务的绝对原子保证**。对应安全顺序回归已更新，总计 **36/36 静态断言 PASS**；未进行真实恢复服务的 MFA 联测。

## 尚未完成（上线阻断项，按顺序）
1. **Vault 清理审计：** 合法、获得明确范围授权且不绕过上述安全拦截的实际 secret orphan-free 删除验收；只读结构检查不能替代真实验收。
2. **准确服务的 MFA + Vault 联测：** 需要另开安全测试计划，在受控 Staging、专门新合成账户和新窗口下，对**准确版本的固定恢复密钥备份／读取 Edge** 验证 AAL1 拒绝、AAL2 放行、会话吊销、错误密码、数据隔离、45 秒隐藏，且不触碰已退役旧服务。请严格先说明临时环境和回滚范围，需用户明确授权后才能部署，不能通过更改 URL 或复制 JWT 绕过。
3. **安全检查＋正式灰度上线：** 独立 PR review、真实 CI/Deno 验证、泄露密码保护评估、明确生产范围/备份/回滚、生产单独审批。N10 合并与发布不能自动进行。V11 要在此后推进。

## 用户协作风格
- 用**简短中文**沟通，每次仅说明「已完成、下一步、还有几步」；减少重复「继续」来回，允许一轮里完成多个不需用户操作的只读/离线步骤。
- 需要用户时**每次只布置一个明确操作**，不要求终端，不索取任何密钥/密码/验证码/十词。
- 用户已要求**提前准备新会话指令**，不要等对话满了才写。**本文件就是准备好的交接指令**；新对话从读取此文件＋PR #2 当前状态开始，杜绝重复测试和无依据的生产操作。

## 2026-11-01 — 新会话 GitHub 重新核实（不涉及 Staging/生产写入）
- PR #2 在基准提交 `5fc213881da334ab700b92a83018415ca4aa413e` 仍为 Draft / unmerged。最新基准 GitHub Actions [41226412163](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41226412163) **SUCCESS**；日志明确显示 14/14 MFA 纯模拟、36/36 后端 SQL/Edge 静态合同、10/10 UI 静态合同通过，session 检查步骤成功，Deno 对四个候选 TS 文件的 type-check 成功。这只证明**上述 SHA 的离线检查**；分支新增文档后需再确认新的 head CI。
- 增加文档 [N10_SAFE_EVIDENCE_AND_JOINT_MFA_GATE_20261101.md](./N10_SAFE_EVIDENCE_AND_JOINT_MFA_GATE_20261101.md)，规定 Vault 删除清理阻断项的合法审计证据、不可绕过前次安全拦截、准确固定恢复 Edge + TOTP 的新隔离联测、生产审批与回滚边界。
- **状态不变：** `VAULT_DELETE_E2E=UNVERIFIED`、`FIXED_RECOVERY_MFA_VAULT_JOINT=UNTESTED`、`PRODUCTION_N10_RELEASE=BLOCKED`、`V11=PAUSED`。不能将 GitHub CI 绿色当作真实数据库删除证明。

## 2026-11-01 — PR #2 与 main 合并冲突（请勿自动处理）
- GitHub REST `pulls/2` 在当前 PR head `7a2a103cada49dafc420f0375b8108778bbe8d30` 报告 `mergeable=false`, `mergeable_state=dirty`。分支相对当时 `main` 为 ahead 107、behind 11。
- `main` 自 N10 建分支基线 `0d94cd34ea96eda6cc3c525534385ccb4b93bde3` 以来，登录与安全中心文件 `login.html`、`js/mmhvault-n10-a7-83-security-center.js` 都有正式更新；Draft 也修改了这两个文件，必须逐行人工整合，不能以 N10 Draft 的旧版本覆盖正式密码重置/账户安全模态功能。
- **不进行自动 merge/rebase/force push**，不改 `main` 或 Landing 相关代码。待 N10 安全门槛全部完成并获独立批准后再解决文件冲突，然后基于最终 head 重新执行 CI/回归。

## 2026-11-01 — 未部署 Staging 候选的 MFA／Session 写入前复验
- 仅修改 `security/n10-fixed-recovery-vault-candidate/qa-staging-recovery-NOT_DEPLOYED.ts`（**仍为未部署、发布开关 OFF**），使 `backup_existing` 在原始十词 HMAC verifier 通过后、写入 Vault 前，和生产候选一致地再次验证精确 JWT 对应的 server-managed MFA factors、同一 Auth 用户/会话 ID、以及数据库中的 live session；失败按原因拒绝。
- 合成 QA 专用 `qa_initialize` 在 verifier 写入之前，以及明文合成恢复词返回之前，分别重新验证 MFA 和 live session；并发失效时拒绝明文。注意：如果写入后、返回前吊销了会话，已建立的合成 verifier 可能需要由授权操作者按测试清理计划处置，**不得自动重置或直接复用旧 fixture**。
- 对应 `test-candidate-contracts.mjs` 增加两项可审计的执行顺序及拒绝路径静态断言；之前 36/36 增至 **38/38**。最新代码提交 `53c5c03ae5e437e66905ffc987e7fa3e4f1342d7` 在 [Actions 41227033653](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41227033653) **SUCCESS**，含 Deno 四文件 check、合成 MFA 14/14、UI 10/10；并非 live signed-token/Vault 证明。
- 旧 QA adapter 包含已经删除的 A/B 合成账户 UUID，它是**历史审查样本，不得直接重新部署**。未来固定恢复服务联合验收必须另制新版本、以新账户、独立批准并保留 fail-closed 开关。已退役 410 Edge 不变。
- 当前硬阻断仍为 `VAULT_DELETE_E2E=UNVERIFIED`、`FIXED_RECOVERY_MFA_VAULT_JOINT=UNTESTED`、PR 冲突未解决；**N10 未上线、V11 暂停**。

## 2026-11-01 — 无需部署的恢复词临时授权失败清理补强
- `security/n10-fixed-recovery-vault-candidate/username-signup-integration-NOT_DEPLOYED.ts` 的 `loginPhrase` 原先在 `verifyOtp()` 发放临时会话后、`getUser(access_token)` 身份验证失败的路径里，没有专门清理临时会话；现在使用独立 Auth 客户端的 `try/finally`：仅签名用户 UID 符合预期后 `keepSession=true` 并返回；否则尝试 `auth.signOut({scope:'local'})`。如签退过程本身发生服务端错误，依然可能需要独立的会话清理核实，不能断言后端全部吊销。该流程不改变 MFA/AAL2 的后续挑战规则。
- 相关后端静态回归新增 1 项，从 38/38 提升至 **39/39**。最新代码 SHA `fa5a5c918d05a984ce9293e6eed653e4da8dce95` 对应 [GitHub Actions #41227265460](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41227265460)：**SUCCESS**，14/14 合成 MFA、39/39 后端静态合同、10/10 UI 静态检查，以及 4 个候选 TS 的 Deno type-check 均成功；不是当前生产或 Staging 的真实恢复验证。
- **绝不合并**：PR #2 继续 Draft，生产恢复开关 OFF，Vault 删除后的孤儿密钥证明 UNVERIFIED，固定恢复服务＋MFA＋Vault 联合实测 UNTESTED，`login.html` / security center 与已更新 main 的合并冲突未解，V11 继续暂停。

## 2026-11-01 — 全新 Staging MFA+Vault 联测候选准备（**未部署，未获测试批准**）
- 只读重新核对 Supabase 项目：Staging `ldivswlhtgmznzwhzsoi` 与生产 `vrypucmyrztxgiqhjspd` 均 `ACTIVE_HEALTHY`；旧 Staging `mmh-n10-fixed-vault-qa-locked` 仍显示 v8、`verify_jwt=true`，根据已复核源码系 HTTP 410 退役版。生产 Edge 清单没有新的 fixed recovery Vault 服务。未查询旧 Vault secret/index 敏感记录。
- 新增 `security/n10-fixed-recovery-vault-candidate/qa-joint-mfa-vault-STAGING-NOT_DEPLOYED.ts`：继承经审查的 Staging adapter，严格 Staging 项目 + GitHub QA origin + 独立 QA HMAC、需要 Auth 验证用户的 UID 和 email 双白名单，全部 6 次 MFA + live-session 检查，包括备份写入前、秘密读取后和 QA 初始化写入/明文返回前。
- **三重默认拒绝**：`RECOVERY_RELEASE_ENABLED=false`、`QA_IDENTITIES=new Map([])`（`ALLOWLIST_OK=false`）、`QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'`（过期）。代码中不包含任何已删除 A/B 用户 UUID 或其邮箱。除非新授权下人工审查三项修改，否则该候选不应部署或启用。
- 单独新增 2 个后端静态合同检查，并更新 CI 对第 5 个 TS 候选文件执行 Deno 类型检查；`2214c71f9d12a37385b887351f648d32fc2a0639` 在 [GitHub Actions #41227613147](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41227613147) **SUCCESS**：14/14 MFA 模拟、41/41 后端静态安全合同、10/10 UI 静态检查、session 组合测试和 5 个 TS 候选 Deno check 均成功。
- **下一步必须得到独立授权**：仅限 Staging 新建独立、专用 QA Edge、专用新合成 A/B 用户及 Secret、明确短时窗口和回滚；不得复活旧 410 Edge，不得改变 production Auth、`app.html`、`login.html`、财务数据或 Landing。实际 Vault 删除孤儿记录证明仍 UNVERIFIED，联合真实 MFA+Vault 仍 UNTESTED，N10 PR #2 Draft 冲突未解，V11 暂停。

## 2026-11-01 — 获得批准后已准备独立 Staging 联合 QA 服务（OFF）
- 用户仅批准 **Staging 准备**，明确上线/联合实测须另行批准。独立 `mmh-n10-qa-joint-mfa-vault-20261101` 首次部署成功：Staging project `ldivswlhtgmznzwhzsoi`、Edge ID `da53e3b3-e138-45f5-990c-5eb63bc7944d`、v1、`verify_jwt=true`；ACTIVE 仅是部署状态，不是测试启用。
- 从 GitHub `e2f6a475...` 读取候选源与 MFA/session 辅助模块部署；再次从 Supabase 独立读取部署文件和元数据，检查 **`RECOVERY_RELEASE_ENABLED=false`、QA 白名单为空、1970 期限已过期**、Staging pin、旧账号 UUID 不存在。旧 HTTP 410 退役 Edge 未触动，生产服务/SQL/用户记录未动。
- 用 Staging `auth.users` 对**预定的新** A/B 测试邮箱做了严格等值、只读查询，确认未创建；没有读取 Vault 受限数据。当前 Supabase 连接器没有安全的 Auth Admin createUser 动作，因此避免以 SQL 直接写入 `auth.users`；接下来需要用户自行在 **Staging → Authentication → Users → Add user** 新建两个独立合成账户，不要分享密码/OTP/Token。
- 完整审计与邮箱标识、当前阻断和回滚要求：`docs/N10_STAGING_JOINT_MFA_VAULT_LOCKED_DEPLOYMENT_20261101.md`。当用户完成账号创建，只读验证 UID/email，再按独立授权决定是否打开窗口。当前真实 `FIXED_RECOVERY_MFA_VAULT_JOINT=UNTESTED`、`VAULT_DELETE_E2E=UNVERIFIED`，PR #2 Draft 未合并，V11 暂停。

## 2026-11-01 — 独立 QA 绑定网页（已经发布，但 LOCKED）
- 独立 QA 仓库 `myintmoehein0115024/MMHVAULT-Auth-QA` **main** 新增专用 `n10-joint-mfa-bind-20261101.html` + `n10-joint-mfa-bind-20261101.js`；严格只针对 **Staging A** (`be5ec3b7-a35f-4a53-b2b7-0ff77a01fc4f`)，不修改 MMHVAULT 正式 main 或 Landing。
- 页面预计地址：[独立 N10 MFA 绑定页](https://myintmoehein0115024.github.io/MMHVAULT-Auth-QA/n10-joint-mfa-bind-20261101.html)。GitHub Pages 2026-11-01 已成功部署 SHA `cfa0f3869767a9d8cd0246907150db366d189c4d`，官方 deploy job 日志确认站点 URL `https://myintmoehein0115024.github.io/MMHVAULT-Auth-QA/`。尚无独立浏览器端实际打开验证，用户下一步只需打开看 LOCKED。
- 页面双重禁用 `QA_RELEASED=false`、`QA_WINDOW_END_UTC=1970-01-01`；未授权前禁用密码和绑定。代码含 Staging URL 与 **public** `sb_publishable_` 前端 Key（不是 service key）；身份检测 Auth 服务器签名 UID、精确 email；SDK `persistSession=false`、`autoRefreshToken=false`；TOTP QR 90 秒自动隐藏，标签页隐藏及页面卸载清理；不访问 Vault/财务 API、不保存浏览器长期会话。
- QA 仓库新增离线安全检查 `tests/n10_joint_mfa_locked.test.cjs` + `.github/workflows/n10-joint-mfa-locked.yml`，GitHub Actions `41228940473` SUCCESS (6/6 关闭状态安全合同 + JS parse)，**只对源码测试**，不是真实 MFA。
- Staging 联合 Edge `mmh-n10-qa-joint-mfa-vault-20261101` v1 仍然 OFF、空白名单、1970 过期；没有执行用户 A 的 TOTP 绑定或 AAL1/AAL2 + Vault 联测；Vault 删除孤儿密钥仍 UNVERIFIED；生产未变，PR #2 仍 Draft、冲突未消，V11 暂停。
- **后续单独批准**：只开放此专用 QA 绑定页面进行 A 的 TOTP Enrollment（限时、受控、仅 Staging，测试后恢复 LOCKED）；之后要做真实 MFA+Vault 联测还需完整审批。绝不可因为“打开网页正常”就自动把 Edge release flag 或空白名单改成开放。

## 最新交接补充（2026-11-01 · 已覆盖前文过期步骤）
- **重要：本文前面“尚未创建 A/B”“尚未打开网页”的步骤已过期，不要重新创建账户。** Staging A/B 两个合成用户均已存在并验证身份。用户成功打开过独立 MFA QA 页，确认 LOCKED；在一次明确批准的短时 A-only 绑定测试后，用户报告 PASS，但 Staging Auth 只读核验仍显示 A 的一个 TOTP 因子 **unverified**，1 challenge / **0 verified**；B 0 factors。真实 AAL2 **没有验收通过**。
- Staging 认证只读聚合日志在对应窗口含 `mfa_factor_name_conflict` 四次、`mfa_verification_failed` 一次。主要兼容问题：`listFactors().totp` 不包含尚未验证的因子，必须从 `listFactors().all` 读取旧 `unverified` TOTP；不能凭发起 challenge、前端自报 PASS 判断绑定成功。
- 独立 QA 仓库中已修复此列表错误、旧因子清理和复核、唯一显示名称、错误分阶段提示、验证码重试限制、页面关闭和到期处理；最新模拟 CI 11/11 PASS，仍 **`QA_RELEASED=false` + 1970 过期**。一次重启测试窗口的代码提交被安全检查拦截，**不要通过其它分支/API/用户代操作绕过阻断**。需要合法解决该门禁后，才可能再次真实测试。
- N10 Draft PR #2 后续增加前端 `N10_FIXED_VAULT_UI_RELEASED=false`，候选 Vault 服务器发布开关也 OFF；`login.html` 在审查时 main 和 Draft 的 blob 相同；安全中心保留不合并的 Draft 专用改动，PR #2 仍 `mergeable=false`。参考 `docs/N10_PR2_MERGE_AND_RELEASE_GATES_20261101.md`。
- Draft 安全中心相同的旧 TOTP 因子枚举缺陷已修：`inspectTotpFactors(data.all)` + 旧因子处理及重查 + 唯一名称；验证码通过后还需同因子 `verified` 及会话 AAL2 才允许报告成功。**正式 main 尚未应用这个修复**。
- 最新 Draft 增加 `mfaEpoch`、`mfaFlowActive` 防止弹窗已关闭、标签页隐藏、退出或切换 UID 后迟到的 MFA 请求重新显示 QR／提示成功；账户切换或登出同步清除敏感 UI。回归 15/15 UI 安全合同及最新 CI `41231983225` SUCCESS。此为 **离线模拟验证，不是生产签名端到端验收**。
- 生产环境、财务数据、正式 login/app、域名、生产 RLS/Edge 未修改。**不要合并 Draft、发布 Vault、开启联合测试或改变受限 Vault 审计权限**。真实 A MFA、AAL1/AAL2+Vault 联测和 Vault 删除证明均未完成。V11 暂停。
- 若用户仅回复“继续”，优先进行 Draft-only / LOCKED 的离线安全检查或记录整理，简短报告进度；禁止将受阻测试擅自当作批准。用户偏好一次说明实际已完成事项、下一步与剩余大阶段，避免重复要求手工操作。
