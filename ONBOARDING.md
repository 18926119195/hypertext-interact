# 入库指南 · PDF 圈选、A1 证据与闭包

核验基线为 [main · d625541](https://github.com/18926119195/hypertext-interact/commit/d6255411736dd2e4cc80047a5be90c2a1b30a51a)，2026-11-19。

## 从哪里接手

本库是证据约束的交互 Pilot。正常主链为「PDF/OCR → A1 槽与页框 → 用户圈选或 V_q 召回 → 证据 Bundle → 模型或 Mock → 闭包保存与匹配」。协作者接手的首要不变量是同一个 PDF 槽在检索、圈选、导出和回放中都能定位回同一页、同一框。

| 任务 | 从这里读 |
| --- | --- |
| 跑主界面 | [应用入口](docuverse/src/App.tsx) · [推理面板](docuverse/src/ui/ReasoningPilotPanel.tsx) · [克隆与启动](docs/CLONE.md) |
| 查索引、召回、槽键 | [pipelineA.ts](docuverse/src/reasoning/pipelineA.ts) · [ocrSlot.ts](docuverse/src/reasoning/ocrSlot.ts) · [slotDatasetExport.ts](docuverse/src/reasoning/slotDatasetExport.ts) |
| 查请求与旧结论复用 | [bundle.ts](docuverse/src/reasoning/bundle.ts) · [llmClient.ts](docuverse/src/reasoning/llmClient.ts) · [closureStore.ts](docuverse/src/reasoning/closureStore.ts) |
| 查词汇和分支沿革 | [历史 HYP-01–HYP-10](DEVELOPMENT_HISTORY.txt) · [维护入口](MAINTAINERS.txt) |

```sh
cd docuverse
npm ci --ignore-scripts
npm run build
npm run check:system
npm run dev
```

Node 24.22.1 下构建及 [离线检查](docuverse/scripts/check-system.mjs) 通过。夹具覆盖 A1 几何、PDF 和图片回退、混合检索、圈选、Mock、闭包零 fetch 复用、排除方向与文本请求体，并输出混排 OCR 页的键差异。实际 OCR、远端模型和浏览器全流程需要另做集成验收。

## 沿时间线核对

公开分支的可达历史和交付 ZIP 未定位本库带发言人和轮次的原始聊天。以下是 Git 时间线。fanout 的 [2026-08-24 对话导出](https://github.com/18926119195/diergbanben-fanout/blob/716939b9be634b2e4b53ab5644ef70942a5e20a4/chat%20history) 对应后续实验。详见 [HYP-10](DEVELOPMENT_HISTORY.txt)。

| 时间（北京时间） | 目标与实现状态 | 证据 |
| --- | --- | --- |
| 08-09 | 球面工作区进入历史基线。平面标注及微缩球保留在历史分支 `v2-flat-minisphere`。 | [球面入口](https://github.com/18926119195/hypertext-interact/commit/034ebe5fbbec5b4a17092f57aae2012561a9530e) · [平面分支提交](https://github.com/18926119195/hypertext-interact/commit/36f3fee15691046c095da08f4358fcd8ef4f7516) |
| 08-16 至 08-17 | A1 先登记、圈选后锁定，混合召回返回原槽和框。闭包匹配可输出已保存结论并跳过模型调用。图脸在当前出站请求中以文本描述表达。 | [圈选试点](https://github.com/18926119195/hypertext-interact/commit/0afde81901228443c804bf8503c6fdac41f1632e) · [OCR 槽与回放](https://github.com/18926119195/hypertext-interact/commit/3995fc9e8fd5b48e0d072d0a26a647a9e5e55a1a) |
| 11-19 | 整理历史导航并增加可执行回归。混排 OCR 测试观察到导出槽 `p0/k1` 与 A1 槽 `p0/k0` 仍有偏差。 | [PR #1](https://github.com/18926119195/hypertext-interact/pull/1) · [离线检测脚本](docuverse/scripts/check-system.mjs) |

模型侧视觉输入、Attention Mask 及服务级多 Agent 调度尚缺本库实现证据。B1 再入具备若干状态和装配函数，端到端回退与前提绑定需要验证。

## 下一项工作 · 消除混排 OCR 槽键漂移

按钱学森《工程控制论》的反馈思想，用同一输入观察编号误差，再选择纠偏和回归路径。

1. 用现有混排 OCR 样本固定页序、块序、原框和文字类别。记录导出 key、A1 key、检索返回 key 和历史闭包引用。再加入一份旧 localStorage 样本，作为兼容约束。
2. 比较 `collectPageSlotRows` 的 slotK 回退和 `pipelineA.ts` 注册槽键的过程。由维护者选定权威编号和已有闭包的迁移方式，再改生成或映射路径。
3. 验收要求同一块四处能解析为同一稳定 key 和框，旧记录仍定位到原块。保留不命中和重复块反例。闭包命中时重新断言模型 fetch 次数为 0。任何旧引用失效即暂停合入。
4. PR 附 HYP-04、HYP-06、同夹具修正前后日志及可回退的提交。通过后将验收结果和迁移决定回写时间线。

## 方法依据

本指南把总体设计落实为边界、目标和任务接口，把工程控制中的反馈落实为观测、判据和纠偏。维护者用原始协作记录、代码和固定样本共同核验定性判断与量化结果，据此决定下一轮行动。[《工程控制论》](https://openlibrary.org/books/OL49218199M/Engineering_cybernetics) · [《组织管理的技术——系统工程》](https://doi.org/10.13255/j.cnki.jusst.2011.06.020) · [《一个科学新领域——开放的复杂巨系统及其方法论》](https://cnki.istiz.org.cn/kcms/detail/detail.aspx?dbcode=CPFD&dbname=cpfd1999&filename=ZGXC199008001001)
