# Keyvo 展示素材审核

本包准备替换仓库根 README 与插件 README 的产品展示。请审核六张截图及两份文案草稿；图片均为 app.keyvo.cn 的公开页面，无登录、支付订单或私人账户信息。

## 采集内容

| 编号 | 页面 | 文件 |
| --- | --- | --- |
| 1 | 首页 | assets/keyvo-home.png |
| 2 | 模型目录 | assets/keyvo-models.png |
| 3 | 定价 | assets/keyvo-pricing.png |
| 4 | 案例 | assets/keyvo-examples.png |
| 5 | 模型比较 | assets/keyvo-comparison.png |
| 6 | 工具 | assets/keyvo-tools.png |

README.candidate.md 是根 README 文案；PLUGIN-README.candidate.md 是插件目录的说明文案。index.html 可打开逐张审核，review-overview.jpg 提供缩略总览。草稿里的图片路径以本审核目录为基准；正式替换时将改为仓库对应路径。

## 已批准的具体改动

1. 根 README 改为 Keyvo，使用真实站点链接及已审核截图；此次先申请首页、模型、比较、工具四张，定价与案例截图暂缓发布。
2. 插件 README 改为准确的 Keyvo 集成源码说明，不声称已发布 Keyvo 安装包或已验证 Claude/ChatGPT/Codex 主机连接。保留上游协议标识、许可证与署名。
3. 现有 17 份发布素材和 1 份设计草稿保留字节与原始来源字段，改为历史参考用途，退出当前 README / 社交推广 / 目录证明，不删除原作者材料。
4. 新截图登记真实源版本（用户报告的生产源 638ee295）、文件摘要、采集时间和本次实际审核记录。未独立确认生产镜像身份的限制继续保留。
5. 更新以原 MaxVideoAI 展示为目标的 README/视觉契约，保留图片解码、摘要、真实祖先、时效和审核门禁；再跑素材 release 检查及相关完整契约。
6. 用户已明确批准文案及首页、模型、比较、工具四张截图，暂缓定价与案例。正式批准记录见 approval.json；capture-evidence.json 保留采集当时的 pending 状态，不回写历史。

## 本次采集问题

首轮 networkidle 等待未完成，结束截图专用浏览器后重跑。第二轮截图发现 Cookie 提示延迟出现；第三轮在截图前通过真实“全部拒绝”按钮关闭提示后重采。最终文件摘要以 capture-evidence.json 为准。未用图像编辑遮挡或修改实际页面。

本次网页截图证明页面展示，不证明全部供应商模式、付款回调、失败退款或插件主机连接已验收。

## 新发现，暂缓批准的项目

- 定价页本次记录到 React #418 hydration 错误；尚不能确认原因，需独立复现。
- 案例页当前显示“No videos are available in this gallery yet.”，图片仅记录空状态，不能宣传为已有案例的证明。
- 这两项均保留在审核包，不用旧截图或伪造素材替代。

定价页独立重复访问 3 次均无 page/console error，截图摘要完全相同。原 #418 未稳定复现，根因仍未知；复验通过不等于错误已修复，原异常记录继续保留。

## 正式落地与打包边界

正式 README 已采用上述四张图。插件 README 使用指向 GitHub 图片的文字链接，避免把仓库外路径当作独立插件包内图片。旧 README 与素材清单的精确副本保存在 ../upstream-maxvideoai/，历史展示契约对这些副本继续验证；当前 Keyvo 发布清单由独立契约验证。历史插件打包与镜像同步安全测试显式使用原清单，不授权新插件发布；当前清单仍拒绝导出旧 reference_only 素材。
