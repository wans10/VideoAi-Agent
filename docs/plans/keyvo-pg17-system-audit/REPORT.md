# PostgreSQL 17 远程程序化核查（进行中）

候选提交 `350ffe0a00336db7d386d0ef48637912c97a0f7a`，分支 `audit/keyvo-completeness-d0acb5e`。未推送、未部署。报告为检查点，完整 lane 尚未全部结束，不能作为最终发布结论。

## 已执行与新增缺陷

1. 真实 PostgreSQL 17.11 空库：仓库 Docker bootstrap、真实 `psql` 普通/重复/concurrent/重复迁移成功，83+1 个迁移，账本84条。真实CNY钱包、三档Sol套餐、幂等重试、事务回滚、账户隔离及混合币种拒绝成功。
2. 新发现并修复：旧Studio付费预算分支仍以USD调用CNY钱包，且两种退款路径写死USD。新扣款在钱包边界换算，冻结USD费率与供应商事实不变；退款验证原收据及冻结兑换依据，历史USD退款保留USD。专项包含结算/重复结算、异常退款/重复退款、历史币种、损坏兑换依据拒绝、混合币种拒绝。
3. 新发现并修复：固定商品只校验换算前INTEGER边界，CNY换算可能溢出数据库字段。现检查最终客户金额，测试保留最大合法边界并拒绝越界。
4. 新发现并修复：后台live工具报价未换算，与实际客户计费不同。live接入共享客户转换；historical审计保持USD。Audio/Storyboard/finishing预览直接与实际计费比较。
5. Linux测试夹具问题：临时esbuild产物找不到lucide-react，改用真实安装的绝对依赖路径；保留全部CNY金额断言。Studio夹具资金与Audio币种断言按当前客户配置设置。

## 已完成程序化结果

- PG17计费/恢复组合37/37通过；第二轮修复47/47通过；工具live与实际报价及CNY退款24/24通过；旧USD账本/恢复兼容25/25通过；默认USD后台与CI分组契约78/78通过。各组重叠，不累计为覆盖率。
- TypeScript通过；完整ESLint 0 errors、10 warnings；public exposure通过；git diff whitespace通过。一次远程命令从根目录找不到tsc，改为frontend入口后验证通过，该命令失败保留在日志。
- 四树/AST/JSON核查：上游和定制祖先均包含；3258差异路径，零基线回退、零新增导出缺失、零JSON解析错误、零未解释JSON差异。18品牌差异已解释，38调用数量变化继续保留，不视为自动等价证明。

## 素材来源门禁

只读取回原仓库真实Git历史，28份素材字节均找到原仓库历史中的匹配提交，清单摘要均匹配。28项引用均不是当前候选祖先，因此原发布门禁仍不通过。详见`source-provenance.json`及可复验脚本`scripts/qa/keyvo-source-provenance-audit.mjs`。补充字节证据不替代祖先/审批门禁，没有伪造SHA、合并假祖先或改弱检查器。

## 全量检查状态

全量CNY探索曾揭示上述新业务问题及多处冻结USD测试预期差异；已保留部分原始日志，明确中止该探索，未标记通过。正式default全部lane与专门CNY CI门禁分别验证，完整财务矩阵不抽样。正式lane尚在运行；最终结果必须补录，包括新失败及取消项。

远程测试副本位于`/opt/keyvo-audit/repo`，日志位于`/opt/keyvo-audit/`。未将数据库密码或SSH密钥写入版本库、报告或测试日志。1Panel现有服务未重启或部署替换；新增host测试工具、keyvoaudit用户及2GB临时swap仍保留供核查。
