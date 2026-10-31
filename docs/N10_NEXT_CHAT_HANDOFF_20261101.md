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
