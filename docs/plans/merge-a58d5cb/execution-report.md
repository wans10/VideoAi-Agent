# a58d5cb 合并执行报告

执行日期：2026-10-01。目标：feat/videoai-studio-design。

合并前：3ac9faedfb7a3f3b7b9d68769a6a9a4c2232fecf。上游：a58d5cb1b83b5f8dc7120c5e7a6eab9135b76535。
备份分支：backup/feat-videoai-studio-before-a58d5cb。
双父合并提交：e5f2e0c0a18869b0ff8d5fb45e87372a2450c471。浏览器测试修正：1e28a6e。最终 HEAD：694df03（分享品牌审查修正）。

## 合并结果

77 个 Git 冲突已解决，采用双父合并。保留 VideoAI Studio、影院首页、品牌、中文默认、CNY 一次换算、LLM Hub 微信/支付宝支付与阿里百炼直连。接受上游 GSC 退役及 Sora 归档。新分享、找回密码、案例阅读器与模型归档补充中文；中文模型生成器保留已有审校文案并验证归档结构。

上游新增 7 篇英文/法文/西班牙文文章尚无中文正文；语言映射不为这些文章伪造中文 canonical/hreflang，已有 8 篇中文文章保留。

后续审查确认分享面板仍有默认 #MaxVideoAI 标签，已在 694df03 改为 #VideoAI，并将同组件下载兜底文件名改为 videoai-video.mp4。该修正通过组件 ESLint 与 git diff --check；上述完整构建和集成测试结果来自修正前的 1e28a6e，不声明已重复执行完整测试。

## 验证

- Node 22.23.3，Next 15.5.25，按锁文件安装依赖。
- 生产构建通过，1125 个静态页面；模型注册表、生成投影、首页海报与公开媒体门禁通过。
- Lint、TypeScript、中文键完整性（6083 keys）、公共暴露检查通过。
- 完整标准测试：6363 通过，4 跳过，1 失败。唯一失败为 github-assets 来源证据校验。
- CNY 独立测试：25/25；真实媒体测试：10/10。
- Studio 浏览器及 PostgreSQL 核心契约：18/18。隔离集成中 MCP/HTTP/路由等 4 项通过；connected montage 浏览器测试最终 7/7 通过（含 6 个子测试）。测试显式选择英文与深色，不改变产品中文默认或浅色默认。
- 新库初始化与已有定制库升级：Docker 账本重复执行、本地 SQL 全量连续重跑均通过。
- 已部署 49_llmhub_pay_topups.sql、50_cny_preferred_currency.sql、51_cny_wallet_receipt_default.sql 文件名和内容完全不变。
- 本地浏览器：中文首页/归档/密码重置 200；无数据分享短链 404，路径保持 /s/token；Mock 支付 POST 到达 handler，缺配置 503、错误类型 415、超大 body 413。

## 未通过门禁与限制

GitHub 素材清单与 a58d5cb 相同，引用 cd69c8cb82948cd65cf00e601108dae943ee761b 等本仓库不存在的提交。无法证明祖先关系，素材发布校验保留失败，未伪造证据或关闭门禁。
因此 pnpm test:validate 整体尚未通过；其标准阶段失败后不会启动隔离阶段，隔离 Studio 集成已另行执行。发布前需要补齐真实素材提交来源证据并重新通过该门禁。
不能仅将 maxvideoaiRevision/lastReviewedRevision 替换为任意存在的祖先 SHA：应恢复实际素材来源历史，或在当前项目重新采集、审核素材，再记录与采集和审核事实对应的提交及证据。

数据库验证使用临时 PostgreSQL 17；本机 psql/FFprobe 架构不匹配，通过 /tmp 测试客户端适配器与 ARM64 二进制执行。生产迁移脚本未削弱 Neon 主机校验。

未执行生产迁移、真实支付、提供商付费生成、远程推送或部署。浏览器冒烟不代表生产 CWV 测量，也不替代真实邮件和有效分享链接上线验证。

## 回滚

需保留当前工作时优先创建回滚提交。合并提交可使用 git revert -m 1 <merge-commit>；合并前内容保存在上述备份分支。数据库迁移尚未在生产执行。

## 本地验证日志

日志保留在 /tmp：videoai-build-final.log、videoai-lint-clean.log、videoai-final-tsc.log、videoai-validation-complete.log、videoai-isolated-studio.log、videoai-isolated-browser-final.log、videoai-browser-studio.log、videoai-migrations.log、videoai-smoke.log。隔离测试旧日志中的 montage 失败已由最后一个浏览器日志替代；其余通过结果保留有效。
