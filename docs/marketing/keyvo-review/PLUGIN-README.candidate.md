# Keyvo 集成源码

此目录保留 MaxVideoAI 上游插件源码及兼容标识。Keyvo 的网页应用位于 [app.keyvo.cn](https://app.keyvo.cn)。

![Keyvo 实际生产首页的创作入口与导航](assets/keyvo-home.png)

## 当前交付范围

| 项目 | 状态 |
| --- | --- |
| Keyvo 网页应用 | 已有生产站点，可直接访问 |
| 本目录插件协议标识 | 保留上游 `maxvideoai` 兼容标识 |
| Keyvo 插件安装与发布 | 未由当前网页截图建立证据 |
| Claude / ChatGPT / Codex 等主机连接 | 需要分别核验；不继承上游主机证明 |

现阶段通过网页选择模型、查看报价并操作账户作品。服务端功能与公开 MCP 库存、主机认证和安装包发布属于不同的验收边界。

## 维护与来源

| 文档 | 用途 |
| --- | --- |
| 本目录 `AGENTS.md` | 插件维护约束 |
| 原仓库 `LICENSE` 与 `NOTICE` | 许可证和原作者归属 |
| `docs/engineering/mcp-client-experience.md` | 主机验证及能力发布边界 |

此说明不改动协议 ID、技能名或冻结的旧资源，也不发布新的插件安装包。上游资料应作为历史来源阅读，不能当作 Keyvo 主机已验证的声明。
