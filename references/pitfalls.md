# pretext-flow 完整踩坑清单

本文档存所有历经验证的踩坑。每个坑包含：症状、原因、解法、相关 commit/版本。

---

## P1. chain physics 状态化 vs 重放法

**症状**：龙身位置每帧累加，Remotion 渲染时帧间不一致 / 闪烁。

**原因**：原 dragon.ts 用 `requestAnimationFrame` mutable state（每帧基于上一帧）。Remotion **无状态渲染**——每帧组件独立 render，`useState` 不跨帧持久化。

**解法**：重放法。`getDragonState(frame, pathFn)` 内部从 `f=0` 跑到 `f=frame` 完整重放 chain physics，每次得到确定结果。性能成本：30 段 × 150 帧 = 4500 lerp/视频，毫秒级。

**位置**：`SkeletonDragon.tsx::getDragonState`

---

## P2. chain 初始位置影响动作形态

**症状**：v1 初始化在 (0, 0) → 龙在屏幕中央"组装散开"前 30 帧；v3 我改成沿 path 反方向延伸 → 龙开场已经拉伸成大 S，**失去了 v1 那种"小钩→拉伸"的动作感**。

**原因**：chain physics 的"展开过程"本身就是视觉资产。

**解法**：根据视觉需求选：
- 想要"中央散开成圈/8字" → segs 全初始化 `(0, 0)`
- 想要"屏外飞入排好队" → segs 沿 `pathFn(0) - pathFn(8)` 方向延伸

**位置**：`SkeletonDragon.tsx::getDragonState` 头几行

---

## P3. canvas.measureText 不识别 font-variation-settings

**症状**：variable font wdth=145 时字符自身变宽 45%，但 `canvas.measureText` 仍返回 wdth=100 的字宽。导致字符位置算错。

**原因**：`canvas.font` 字符串是 CSS shorthand（如 `'18px Inter'`），不识别 `font-variation-settings`（这是独立的 CSS property）。canvas 2D API 没有暴露 variable axis。

**解法**：用 `widthFactor = wdth / 100` 经验估算字宽：
```ts
const charDisplayWidth = ch.width * (wdth / 100);
```
误差 5-10% 视觉可接受。

**精确方案**（不推荐）：用 OffscreenCanvas + 临时 DOM `<span>` getBoundingClientRect 测量。慢且复杂。

**位置**：`VariableTextField.tsx::splitChars` + items.map widthFactor 逻辑

---

## P4. @remotion/google-fonts 的 RobotoFlex 是静态版

**症状**：`import { loadFont } from '@remotion/google-fonts/RobotoFlex'`，渲染出来 wdth/wght 不生效。

**原因**：`@remotion/google-fonts` 内部加载的 URL 是 `https://fonts.googleapis.com/css2?family=Roboto+Flex:ital,wght@0,400`——**只有 wght 400 单字重静态版**，没有 axis 范围。

**解法**：用 `ensureVariableFontLoaded(ROBOTO_SERIF_VARIABLE)`，内部手动 inject `<link>` 完整 axis URL：
```
https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wdth,wght@8..144,50..150,100..900&display=block
```
+ `delayRender` + `document.fonts.ready` 保证渲染前字体加载完。

**位置**：`fonts/variableFontLoader.ts`

---

## P5. 字符变胖撞 line.width 边界

**症状**：let me see... v8 frame 75 字符放大后部分字符跑到龙身上去了。v9 同样有但更轻微。

**原因**：Pretext `layoutColumn` 用"未变形"的字宽算让路 slot；字符变胖/放大后位置间距按 widthFactor 推开邻字，但行总宽超过 line.width 设定，最后字符跑出 line 容器（line 是 `position: absolute` + `width: line.width`）。

**解法**（美化待办）：
- 让 `layoutColumn` 的 maxWidth × 0.75（预留 25% 余量给字符放大）
- 距离场温和（peak 145→125, peak 900→700）
- 减文字数 + 字号大

**当前 patch**：widthFactor 推开是 100% 跟随（不像 v8 的 50%），但仍可能撞墙。

---

## P6. SVG `<use>` 段拼接的渲染顺序

**症状**：龙身段层叠错乱，头部被尾巴遮住。

**原因**：原 dragon.ts 用 `prepend` 把每段插到 `#screen` 最前面（i=1 head 最后插入 = DOM 最后 child = 最上层）。如果 React 用 `for(i=1; i<N; i++) push` 顺序渲染，结果是 head 在底层。

**解法**：React 中 `state.segments.slice().reverse().map(...)` 反向渲染——尾巴先渲染（底层），头最后渲染（顶层）。

**位置**：`SkeletonDragon.tsx` 渲染部分

---

## P7. SVG `<use>` 段 i=0 是逻辑头不渲染

**症状**：N=30 但 SVG 里只有 29 个段，因为 i=0 是逻辑"头之前"的虚拟点。

**原因**：原 dragon.ts 的 chain physics segs[0] 是头追目标的"目标点"位置（lerp 0.1 平滑），segs[1] 才是真正的 head（Cabeza）。i>=2 是脊椎（Espina）。

**解法**：渲染时跳过 i=0 + i=1（i=1 在 reverse map 里跳过，单独 IIFE 渲染头到顶层）。

**位置**：`SkeletonDragon.tsx::SkeletonDragon` 组件

---

## P8. SkeletonDragon SVG viewBox 缩放复杂

**症状**：龙在屏幕上的位置/大小算不对。

**原因**：SVG viewBox 是 `-150 -150 300 300`（300×300 内部坐标系），`<svg width={1100}>` 用 `preserveAspectRatio="xMidYMid meet"`。所以 SVG 内坐标 (0,0) 对应屏幕的 SVG 容器中心，而 chain physics 用 SVG 内坐标。

**解法**：getDragonOcclusion 用以下转换：
```ts
const cxScreen = svgScreenX + (cxSvg - VIEWBOX_X_MIN) * svgScreenScale;
// svgScreenScale = 实际渲染宽 / viewBox 宽 = 1100/300 = 3.67
```

**位置**：`SkeletonDragon.tsx::getDragonOcclusion`

---

## P9. 字体加载竞速 / 重复加载

**症状**：多个 composition 同时调 `ensureVariableFontLoaded` 重复加载字体；或者首帧渲染时字体还没好。

**解法**：`variableFontLoader.ts` 内部用 `promiseByUrl` map 去重：
```ts
if (promiseByUrl.has(url)) return; // 已经在加载了
```
+ `delayRender` 保证渲染前字体 ready。

---

## P10. Pretext 0.0.5 → 0.0.6 API 兼容性

**症状**：从 0.0.5 升级到 0.0.6 担心 API 变。

**实测**：完全兼容。0.0.6 仅加 letterSpacing 和修 CJK+开括号换行。`prepareWithSegments` / `layoutNextLine` / `LayoutCursor` 全部不变。

---

## P11. Remotion API 内容过滤

**症状**：API 输出大段中文古文（洛神赋全文）时被 Anthropic API "Output blocked by content filtering policy" 拦截。

**解法**：把文本内容拆到独立 `.ts` 文件用 import；或者改用英文文本。代码本身不要内联大段中文文学。

---

## P12. Remotion CLI bunx 偶尔失效

**症状**：`bunx remotion render ...` 报 `could not determine executable to run for package remotion`。

**解法**：直接调 `./node_modules/.bin/remotion render ...`。

---

## P13. SVG filter 的 inkSeed 与 Remotion 帧间一致性

**症状**：SVG `<feTurbulence>` 用 seed 做随机噪声。如果 seed 不变，每帧 noise 一样（静态膜感）；如果 seed 改变太快，闪烁。

**解法**：`seed = Math.floor(frame / 4)` 让 seed 每 4 帧变一次，"墨气流动"感自然。

**位置**：当前 `SkeletonDragon` 已去掉 filter；如果美化窗口加回水墨 filter 时需注意此点。

---

## P14. Composition 注册顺序

**症状**：新加 `<Composition>` 影响其他 composition 的渲染（不会，但担心）。

**实测**：Remotion 按 id 选择 composition 渲染。`Root.tsx` 里 Composition 注册顺序无影响。但**新加的 component 如果 import 报错会让整个 Root.tsx 加载失败，所有 composition 都跑不动**——所以 import 链要干净。

---

最后更新：本次重构（feature folder 化）之后。
