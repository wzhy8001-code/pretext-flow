# pretext-flow — Pretext + Remotion 集成 feature

> **目的**：用 [@chenglou/pretext](https://github.com/chenglou/pretext) 把"东西穿过文字让路 + 文字距离场响应"做成 mp4 视频。
>
> **公共入口**：`./index.ts` —— 父级（Root.tsx）只能从这里 import。
>
> **已验证基座**：龙穿过卷轴文字 + 字符级 wdth/wght 双轴变形。`InkScrollDemo` 是参考实现。

---

## 1. 文件结构

```
pretext-flow/
├── README.md                  ← 本文件（用法+踩坑）
├── index.ts                   ← 公共 API
├── types.ts                   ← Material 接口、Occlusion、PretextLine
├── layout/
│   ├── carveSlots.ts          ← 圆形包围盒切水平 slot 算法
│   └── layoutColumn.ts        ← Pretext 多 slot 让路布局
├── fonts/
│   └── variableFontLoader.ts  ← Variable Font 加载（绕过 @remotion/google-fonts 静态限制）
├── materials/
│   ├── SkeletonDragon.tsx     ← 30 段链骨骼龙（chain physics + 历史轨迹）
│   ├── FallingBall.tsx        ← 落球（重力下落 + 落地 squash + 单 occlusion）
│   └── ScrollBackground.tsx   ← 横版中国卷轴
├── renderers/
│   └── VariableTextField.tsx  ← 字符级 + 距离场 + 力波/涟漪叠加
└── compositions/
    ├── InkScrollDemo.tsx      ★ 龙穿字让路（distance field 字符变胖+变粗）
    ├── BallDropDemo.tsx       ★ 球落地涟漪（标准水波，清晰同心圆）
    ├── NewspaperFlowDemo.tsx  ← 早期 demo（lucide Flame 占位）
    └── PretextConnectTest.tsx ← 最小连接性测试（黑方块 + Lorem ipsum）
```

---

## 2. 核心数据流（5 步管线）

```
┌─────────────────────────────────────────────────────────────────┐
│  frame ──→ getDragonState(frame, pathFn) ──→ DragonState         │
│                                                                   │
│  DragonState ──→ getDragonOcclusion(state, ctx) ──→ Occlusion[]  │
│                                                                   │
│  Occlusion[] ──→ layoutColumn(prepared, occl, box, lh)            │
│                  ──→ PretextLine[]（每行被切成多 slot 的位置）        │
│                                                                   │
│  PretextLine[] + Occlusion[] ──→ VariableTextField               │
│                                  渲染每字符 absolute span +        │
│                                  font-variation-settings 距离场    │
│                                                                   │
│  并列渲染：SkeletonDragon（视觉）+ ScrollBackground（背景）          │
└─────────────────────────────────────────────────────────────────┘
```

**关键洞察**：素材的"视觉"和"几何包围盒"**共用同一份位置数据**（`getDragonState` → `getDragonOcclusion`），所以视觉龙和让路圆**永远同步**——这就是不"廉价"的根源。

---

## 3. 怎么写新 Composition（参考 InkScrollDemo.tsx）

```tsx
import {
  ScrollBackground,
  getScrollContentBox,
  SkeletonDragon,
  getDragonState,
  getDragonOcclusion,
  layoutColumn,
  VariableTextField,
  ensureVariableFontLoaded,
  ROBOTO_SERIF_VARIABLE,
  type DragonPath,
} from "../"; // pretext-flow/index.ts

// 1. 模块加载时确保 variable font 已加载
ensureVariableFontLoaded(ROBOTO_SERIF_VARIABLE);

// 2. 设计素材的运动路径
const myPath: DragonPath = (frame) => ({
  x: -200 + frame * 2,        // SVG 内坐标
  y: Math.sin(frame * 0.05) * 100,
});

// 3. 在 React 组件里组装
export const MyComposition = () => {
  const frame = useCurrentFrame();

  // 算龙身位置
  const dragonState = getDragonState(frame, myPath);
  // 算让路包围盒
  const occlusion = getDragonOcclusion(dragonState, scale, offsetX, offsetY);
  // Pretext 排字（让路）
  const lines = layoutColumn(prepared, occlusion, colL, colR, startY, endY, lineH);

  return (
    <AbsoluteFill>
      <ScrollBackground padX={200} padY={120} />
      <VariableTextField
        lines={lines}
        occlusion={occlusion}
        columnScreenX={...}
        columnScreenY={...}
        fontFamily="Roboto Serif"
        fontSize={18}
        lineHeight={28}
        wdthField={{ radius: 400, base: 100, peak: 145 }}
        wghtField={{ radius: 400, base: 400, peak: 900 }}
      />
      <SkeletonDragon state={dragonState} {...} />
    </AbsoluteFill>
  );
};
```

---

## 4. 怎么写新 Material（在 materials/ 目录）

每个 Material 必须暴露三件套（看 SkeletonDragon.tsx 实现）：

```ts
// 1. State 计算（frame-driven，无状态）
export function getXxxState(frame: number, pathFn): XxxState {
  // 重放法：每帧 from 0 to current 算 chain physics
  for (let f = 0; f <= frame; f++) {
    // 累积位置 / 角度 / 摆动
  }
  return state;
}

// 2. Occlusion 计算（state → 屏幕坐标的圆形包围盒）
export function getXxxOcclusion(
  state: XxxState,
  scale: number,
  offsetX: number,
  offsetY: number,
): Occlusion[] {
  return state.segments.map(seg => ({
    cx: offsetX + seg.localX * scale,
    cy: offsetY + seg.localY * scale,
    r: seg.localRadius * scale,
  }));
}

// 3. React 组件
export const Xxx: React.FC<{ state: XxxState; ... }> = ({ state }) => (
  <svg>{ /* 用 state 渲染视觉 */ }</svg>
);
```

---

## 5. 已知踩坑

### 5.1 Pretext API（chain physics 重放法）

- **原 dragon.ts 用 mutable state 累积**（`requestAnimationFrame` 每帧加一帧物理）
- **Remotion 必须无状态**：每帧从 frame=0 重放整条物理
- 30 段 × 150 帧 = 4500 次 lerp，毫秒级，性能无压力

### 5.2 字符级渲染必须自己测每字符宽度

- Pretext `layoutNextLine` 返回整行字符串，**不给每字符 x 坐标**
- 用 `canvas.measureText` 累加每字符宽度（`splitChars` 函数）
- ⚠️ canvas.measureText **不识别 `font-variation-settings`**，所以 wdth=145 时实际字宽不是 measureText 给的值
- **缓解**：用 `widthFactor = wdth / 100` 经验估算字宽（5-10% 误差视觉可接受）

### 5.3 Variable Font 加载

- `@remotion/google-fonts/RobotoFlex` 加载的是**单字重静态**字体（wght 400），不带 wdth 轴
- 必须用 `ensureVariableFontLoaded()` 手动 link 完整 axis 版本
- 内部用 `delayRender` 等字体加载完才允许渲染（避免首帧用 fallback 字体）

### 5.4 字符变胖会让行总宽超出 line.width

- Pretext 让路按"未变形"宽度算，字符放大/变胖后会撞 line 边界
- 当前 VariableTextField 用 `widthFactor` 累加位置，邻字按宽推开
- **可能撞龙身边界**（v8/v9 反馈"挤"的根源）
- 修补方向（美化窗口做）：
  - layoutColumn 给 slotW 预留 25-30% 余量（`slotW × 0.75`），字符变胖后填满原 slot
  - 距离场强度调温和（peak 145→125, peak 900→700）
  - 减文字数 + 字号变大

### 5.5 SVG `<use>` 段拼接时 i=0 是逻辑头部不渲染

- chain physics segs[0] 是逻辑头位置；segs[1] 才是渲染的"头"（Cabeza）
- segs[i>=2] 渲染脊椎段（Espina），不渲染翅膀
- 见 `SkeletonDragon` 的 reverse map + 跳过 i=0/1

### 5.6 字体加载竞速

- `delayRender` + `document.fonts.ready` 在 module-level 调用一次
- 多个 composition 加载同一字体不冲突（`promiseByUrl` map 缓存）

---

## 6. 美化待办（留给后续美化窗口）

### 6.1 字符 / 距离场调优
- [ ] **字间距挤压**（v9 反馈）：建议预留 layoutColumn 余量 + 减文字 + 字号变大
- [ ] **距离场过渡突兀**：linear falloff → gaussian / exponential，更柔和
- [ ] **字符颜色随距离变**：远 #555 → 近 #000，加层级感
- [ ] **letter-spacing 全局加 0.025em**：基础态字间空气

### 6.2 ✅ ripple 单源涟漪算法（可用）

**状态**：算法本身**可用**——单源标准水波公式（`renderers/VariableTextField.tsx::computeRippleDisturbance`），落地后字符径向扩散视觉清晰。

**当前锁定参数**（BallDropDemo.tsx）：
```ts
ripple: {
  amplitude: 14,
  wavelength: 100,
  waveSpeed: 12,
  decayDistance: 400,
  decayTime: 40,
}
```

**单独取出 `ripple` prop 用没问题**——给 `VariableTextField` 加这个 prop，落地帧后字符按公式径向扩散。

### 6.3 ⛔ BallDropDemo 整体有重大 BUG（2026-05-01 标记）

**结论**：`BallDropDemo` 球+让路+涟漪整体集成存在结构性问题，**全天调参/重构都没解决**。

**症状**（用户原话）：
- "右侧椭圆的空白" / "球不在空圈中央"
- "球像投影" / "整个画面 3D 的"
- "代码里一定有 3D 内容" / "完全没让路"

**已排除的原因**（试过都无效）：
- ❌ trail 多圆 occlusion（违反 SKILL §4 红线）
- ❌ ripple 关闭/恢复
- ❌ wdth/wght 距离场 peak=base/peak>base
- ❌ layoutColumn xShift 加/删
- ❌ leftSlotPadRight=30
- ❌ 卷轴 ScrollBackground 删除
- ❌ 球渲染 div+borderRadius / SVG circle / SVG crispEdges / Math.round 整数像素 / box-shadow 各种值
- ❌ 球→方块→龙 形状测试（都歪）
- ❌ Chromium 3D（Remotion 没 3D）

**剩余怀疑**（未验证）：
- VariableTextField 字符级 absolute span 在让路区累积合成层 halo
- H.264 视频压缩 deblock filter 平滑硬边
- pretext layoutNextLine 给左/右 slot 的 line.width 不对称

**新窗口接手要点**：
- 不要再调参（v9~v23 至少 15 个版本都失败）
- 起点是 git `bf55df4`（昨晚 20:42 commit）
- 整体重新设计或放弃 BallDropDemo，只保留 `ripple` 算法作为可复用模块

**遗留 forceWave 模块**（多源累加力波）：算法上是噪音不是清晰水波，建议直接弃用，用 ripple。

### 6.3 视觉细节
- [ ] **龙水墨化**：feTurbulence + feDisplacementMap 边缘溶散
- [ ] **卷轴细节**：纸纹（feTurbulence 底纹）、木质轴心高光、边缘虚化
- [ ] **标题美化**：位置/字号/装饰
- [ ] **球外观**：当前是黑色径向渐变球；可改成水滴/石块/书页等更主题化的形态

---

## 7. 关键参考资料

- [Pretext 官方](https://github.com/chenglou/pretext)
- [aiia.ro 鼠标版龙 demo](https://aiia.ro/pretext/)（基础灵感来源）
- [qtakmalay/PreTextExperiments dragon.ts](https://github.com/qtakmalay/PreTextExperiments/blob/main/pages/demos/dragon.ts)（80 段球链 chain physics 范式）
- [naborajs/DRAGON-FOLLOWS-YOU](https://github.com/naborajs/DRAGON-FOLLOWS-YOU)（30 段 SVG `<use>` 拼接范式，本项目龙采用此范式去翅膀）
- [Fancy Components - Variable Font Cursor Proximity](https://www.fancycomponents.dev/docs/components/text/variable-font-cursor-proximity)（字符级 wdth/wght 距离场范式）
- [Bulletproof React - Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)（feature-based 文件夹）

---

## 8. Git 历史关键节点

- **tag `pretext-v8-pre-variable-font`** — scale 距离场（v1 路径 + 中央散开 + 字符 scale 缩放）
- **tag `pretext-v9-feature-refactor`** — feature folder 重构 + variable font wdth/wght 双轴
- **tag `pretext-v10-force-wave`** — 龙力波（多源累加，"扭曲"，不推荐）
- **tag `pretext-v11-ball-ripple`** ★ 当前 — 球涟漪（标准水波公式，清晰同心圆）

回滚：`git checkout <tag> -- src/pretext-flow/`

## 9. 参考输出

- `~/.claude/skills/pretext-flow/baseline-outputs/ink_dragon_v9.mp4` — 龙穿字 + 距离场 variable font
- `~/.claude/skills/pretext-flow/baseline-outputs/ball_drop_v1.mp4` — 球落地涟漪（⛔ **整体集成有重大 BUG**，详见 §6.3，**仅作历史参考**）
