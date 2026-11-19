# 入库指南 · PDF 圈选、A1 槽与闭包

[一分钟定位](#一分钟定位) · [沿聊天时间线看灵感](#沿聊天时间线看灵感) · [从代码反查来由](#从代码反查来由) · [走读与维护记录](#走读与维护记录)

## 一分钟定位

这是 Docuverse 的交互推理试点。从 PDF 或 OCR 先登记 A1 槽（带页码、形状和文字的证据对象），用户圈选或按问句召回槽，再形成推理输入。输入与历史方向匹配时，界面可回放已保存的结论。运行入口在 [docuverse/](https://github.com/18926119195/hypertext-interact/tree/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse)。基线为 [main · d625541](https://github.com/18926119195/hypertext-interact/commit/d6255411736dd2e4cc80047a5be90c2a1b30a51a)。

## 沿聊天时间线看灵感

**如何读状态。** 已实现表示在所列版本找到与灵感相符的代码路径。部分实现表示已有其中一段。未实现表示已查的入口尚无对应实现。证据不足时标待确认。归档与设计文稿按资料本身的状态描述。

本库公开可达分支与交付 ZIP 中未找到带发言人的完整原始聊天。根目录「我的理念」为空文件。下表从 Git 提交与厂商规格重建沿革。提交日期对应代码或文件入库。提出想法的准确时间无法判定。后续 fanout 对话是独立实验资料。见 [开发时间线 HYP-01–HYP-10](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/DEVELOPMENT_HISTORY.txt)。

| 编号与时间（2026 年，北京） | 原始线索与想法 | 基线状态 | 实现证据 |
| --- | --- | --- | --- |
| <a name="idea-i01"></a>I01 · 08-09 09:04 | 初始文献工作区用球面连接页面、标注和导航。 [初始提交](https://github.com/18926119195/hypertext-interact/commit/034ebe5fbbec5b4a17092f57aae2012561a9530e) | **已实现**。默认入口仍以球面视图及 HUD 为底座。 | [App 根视图](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/App.tsx#L14-L29) |
| <a name="idea-i02"></a>I02 · 08-09 11:05 | 平面原页标注，并用微缩球显示联结。 [平面分支提交](https://github.com/18926119195/hypertext-interact/commit/36f3fee15691046c095da08f4358fcd8ef4f7516) | **已实现于历史分支**。该分支曾支持平面和球面切换，当前默认入口走球面 Pilot。 | [历史工作台选择](https://github.com/18926119195/hypertext-interact/blob/36f3fee15691046c095da08f4358fcd8ef4f7516/docuverse/src/App.tsx#L14-L50) · [当前 App](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/App.tsx#L14-L29) |
| <a name="idea-i03"></a>I03 · 08-16 | 圈选锁定预先登记的 A1，模型接收该对象组装的证据。 [试点提交](https://github.com/18926119195/hypertext-interact/commit/0afde81901228443c804bf8503c6fdac41f1632e) | **已实现**。圈选返回原 A1 槽，客户端按 Bundle 走文本请求或 Mock。 | [A1 圈选](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/pipelineA.ts#L660-L699) · [模型客户端](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/llmClient.ts#L55-L85) |
| <a name="idea-i04"></a>I04 · 08-17 | 用统一槽键和几何关系，让 PDF/OCR 候选能返回原页原框。 [流水线提交](https://github.com/18926119195/hypertext-interact/commit/3995fc9e8fd5b48e0d072d0a26a647a9e5e55a1a) | **部分实现**。检索和圈选可回放同一框，混排 OCR 页仍可能出现导出键和 A1 键不同。 | [导出编号](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/slotDatasetExport.ts#L40-L69) · [A1 编号](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/pipelineA.ts#L293-L330) · [混排样本](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/scripts/check-system.mjs) |
| <a name="idea-i05"></a>I05 · 08-17 | 通过对话闭包将已核对方向与证据槽关联，支持旧方向复用和排除。 [开发时间线 HYP-06](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/DEVELOPMENT_HISTORY.txt) | **已实现**。夹具验证命中后复用结论，fetch 次数为 0，排除项能进入下一 Bundle。 | [闭包状态](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/closureStore.ts) · [复验段](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/scripts/check-system.mjs#L82-L112) |
| <a name="idea-i06"></a>I06 · 08-17 快照 | 厂商规格提出视觉证据或服务侧的推理控制。 [厂商规格](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docs/%E5%86%85%E7%A6%80%E5%9D%90%E6%A0%87%E4%B8%8E%E6%8C%87%E5%90%91%E6%80%A7%E6%8E%A8%E7%90%86%E6%8E%A7%E5%88%B6-%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%8E%82%E5%95%86%E5%B7%A5%E7%A8%8B%E8%A7%84%E6%A0%BC.md) | **未落地**于当前正常模型入口。图脸以文本引用进入提示，出站请求无独立视觉输入段，也未见 Attention Mask 编译。 | [图脸格式化](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/bundle.ts#L81-L109) · [出站载荷](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/llmClient.ts#L55-L85) |
| <a name="idea-i07"></a>I07 · 08-24 后续对话入库 | 用户在 fanout 追问这个旁路实验和 `diergbanben-` 的关系。 [后续对话](https://github.com/18926119195/diergbanben-fanout/blob/716939b9be634b2e4b53ab5644ef70942a5e20a4/chat%20history#L749) | **无法判定**本仓更早的原始讨论。当前主入口有 Pilot，可据 Git 与后续对话分别核验沿革。 | [当前应用](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/App.tsx#L14-L29) · [来源范围 HYP-10](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/DEVELOPMENT_HISTORY.txt) |

## 从代码反查来由

| 第一次读到的代码 | 它来自哪段想法 |
| --- | --- |
| [ReasoningPilotPanel.tsx](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/ui/ReasoningPilotPanel.tsx) 的圈选、组包和槽导出 | [I03](#idea-i03) 解释先登记再锁定，[I04](#idea-i04) 解释导出与回溯为什么都要带槽号。 |
| [closureStore.ts](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/closureStore.ts) 的历史方向与保存状态 | [I05](#idea-i05) 解释为什么一次新问可能返回旧结论并跳过模型。 |
| [bundle.ts](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/bundle.ts) 的图脸描述 | [I06](#idea-i06) 解释应用的证据对象和模型真正收到的载荷之间的边界。 |

## 走读与维护记录

在 [离线检查](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/scripts/check-system.mjs) 找到混排页的 `OBSERVED`，沿 [导出](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/slotDatasetExport.ts#L40-L69) 和 [A1 注册](https://github.com/18926119195/hypertext-interact/blob/d6255411736dd2e4cc80047a5be90c2a1b30a51a/docuverse/src/reasoning/pipelineA.ts#L293-L330) 各追一次。`docuverse/` 中 `npm run check:system` 可在安装依赖后复现。读完应能解释两个键为何可能是 `k1` 和 `k0`，以及一次闭包命中为什么不发模型请求。本轮 Node 24 构建与检查通过。若后续找到更早的原始对话或代码反例，按 I 编号登记来源、提交和修正理由。

**指南如何更新。** 以仓库和版本划定范围，从聊天提取原始目标，再用代码与产物校正对当时决策的理解。新证据出现时，回到原编号修订记录。这种读法借鉴了钱学森的系统工程和工程控制论。 [《组织管理的技术——系统工程》](https://doi.org/10.13255/j.cnki.jusst.2011.06.020) · [《工程控制论》](https://openlibrary.org/books/OL49218199M/Engineering_cybernetics)
