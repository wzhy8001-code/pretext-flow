# pretext-flow API 完整参考

所有 API 都从 `pretext-flow/index.ts` 导出。下面按模块分组。

---

## 1. Material（前景动态素材）

### `SkeletonDragon`
30 段链骨骼龙 React 组件。

```ts
<SkeletonDragon
  state={DragonState}        // 来自 getDragonState(frame, pathFn)
  svgWidth={number}          // SVG 容器屏幕宽度（如 1100）
  svgHeight={number}         // SVG 容器屏幕高度
  screenX={number}           // SVG 容器屏幕 X（左上角）
  screenY={number}           // SVG 容器屏幕 Y
  scale={number}             // svgWidth / 300（viewBox 内宽）
/>
```

### `getDragonState(frame, pathFn): DragonState`

frame-driven 重放法算 chain physics 状态。

```ts
type DragonPath = (frame: number) => { x: number; y: number };
// 返回 SVG 内坐标（viewBox -150~+150）

const state = getDragonState(75, myPath);
// state.segments: DragonSegment[]（30 段位置/角度/scale）
// state.frm: 当前 frame 累积值
// state.rad: 当前 radius 累积值
```

**重要**：每帧调用都是从 frame=0 重放到 current frame。性能 OK（30 段 × 150 帧 = 4500 lerp）。

### `getDragonOcclusion(state, scale, offsetX, offsetY): Occlusion[]`

把 DragonState 转成屏幕坐标圆形包围盒（让路用）。

```ts
const occlusion = getDragonOcclusion(state, 3.67, 410, -10);
// 返回 30 个 { cx, cy, r }，单位为屏幕像素
```

### 自定义运动路径

```ts
const myPath: DragonPath = (frame) => {
  const t = frame / 150;
  // SVG 内坐标 (-150 ~ +150)
  return {
    x: -200 + 400 * t,        // 左到右
    y: Math.sin(t * Math.PI * 2.5) * 100, // 波浪
  };
};
```

---

### `FallingBall`

球落地素材（涟漪源）。

```ts
<FallingBall state={BallState} />
```

```ts
const ballState = getBallState(frame, {
  startX: 960,
  startY: -38,
  landX: 960,
  landY: 570,
  landFrame: 30,
  r: 38,
});
const occlusion = getBallOcclusion(ballState);
// 落地前 occlusion 是 [] 不挡字
// 落地后 occlusion 是 [{ cx, cy, r }] 一个圆
```

**BallState 结构**：
```ts
type BallState = {
  cx: number;
  cy: number;
  r: number;
  hasLanded: boolean;
  landFrame: number;       // 涟漪源时间戳
  squashY: number;         // 落地 squash 弹跳（落地后 8 帧内 < 1）
};
```

---

## 2. Background（静态/参数化背景）

### `ScrollBackground`

横版中国卷轴。

```ts
<ScrollBackground
  width={1920}                              // 默认 1920
  height={1080}                             // 默认 1080
  padX={200}                                // 卷轴左右距屏边
  padY={120}                                // 卷轴上下距屏边
  paperGradient={["#f0e3c4", "#ecdcb6", "#e8d4a4"]}  // 纸色渐变
  rollerColors={["#2a1810", "#5b3a23", "#7a4f30"]}    // 木轴颜色
  outerBg="#1a1410"                         // 外层背景
/>
```

### `getScrollContentBox(options): { columnX, columnY, columnW, columnH }`

算卷轴正文区可用范围。

```ts
const box = getScrollContentBox({ padX: 200, padY: 120, width: 1920, height: 1080 });
// box.columnX = 240（200 padX + 40 内边距）
// box.columnY = 190（120 padY + 70 标题区）
// box.columnW = 1440
// box.columnH = 760
```

---

## 3. Layout（让路核心）

### `layoutColumn(prepared, occlusion, colL, colR, startY, endY, lineHeight, gap?, minSlot?): PretextLine[]`

Pretext 多 slot 让路布局。

```ts
const lines = layoutColumn(
  prepared,           // ReturnType<typeof prepareWithSegments>
  occlusion,          // Occlusion[]
  240,                // colLeft (screen x)
  1680,               // colRight
  190,                // startY (screen y)
  950,                // endY
  28,                 // lineHeight (px)
  14,                 // occlusionGap (默认 14, 圆扩展量)
  30,                 // minSlotWidth (默认 30, 太窄的 slot 丢弃)
);
// lines: PretextLine[]，每个 line 是被切成的可用 slot
// line.x, line.y 是相对 column 顶左 (0, 0) 的坐标
```

### `carveSlots(baseL, baseR, blocked, minSlotWidth?): Interval[]`

底层算法：从 [baseL, baseR] 减去 blocked 区间。

### `circleInterval(cx, cy, r, bandTop, bandBot): Interval | null`

底层算法：单圆与水平 band 求交。

### `mergeIntervals(ivs): Interval[]`

底层算法：重叠区间合并。

### `computeRowSlots(occlusion, colL, colR, bandTop, bandBot, gap?, minSlot?): Interval[]`

便捷函数：一行的可用 slot 计算。

---

## 4. Renderer（文字渲染）

### `VariableTextField`

字符级 + 距离场 + Variable Font 文字渲染。

```ts
<VariableTextField
  lines={PretextLine[]}            // 来自 layoutColumn
  occlusion={Occlusion[]}          // 来自 getXxxOcclusion
  columnScreenX={number}           // column 屏幕左
  columnScreenY={number}           // column 屏幕顶
  fontFamily="Roboto Serif"        // Variable Font family（与 ensureVariableFontLoaded 加载的一致）
  fontSize={18}                    // px
  lineHeight={28}                  // px
  color="#1a1108"                  // 默认 #1a1108
  wdthField={{ radius: 400, base: 100, peak: 145 }}  // wdth 距离场
  wghtField={{ radius: 400, base: 400, peak: 900 }}  // wght 距离场
  letterSpacingEm={0}              // 全局字间距（默认 0）
/>
```

**距离场参数说明**：
- `radius`: 影响半径（屏幕像素）。距离 > radius → 字符为基础态
- `base`: 远处的轴值（wdth 通常 100，wght 通常 400）
- `peak`: 近处的峰值（wdth 100~150，wght 400~900）

### `RippleSource`（单源标准水波）

```ts
ripple={{
  cx: 960, cy: 570,                  // 涟漪源屏幕坐标（球落地处）
  currentFrame: frame,               // 当前帧
  sourceFrame: 30,                   // 涟漪开始帧（球落地帧）
  amplitude: 14,                     // 峰值 px ⚠️ 待调
  wavelength: 100,                   // 波长 px ⚠️ 待调
  waveSpeed: 12,                     // 波速 px/帧 ⚠️ 待调
  decayDistance: 600,                // 距离衰减常数 ⚠️ 待调（建议 350-450）
  decayTime: 90,                     // 时间衰减帧数 ⚠️ 待调
}}
```

**公式**：
```
t = currentFrame - sourceFrame                    // 球落地后经过帧数
front = waveSpeed × t                             // 波前到达的距离
if d > front: 字符不动（波还没到）
phase = (front - d) / wavelength × 2π
wave = sin(phase)
amp = amplitude × exp(-d/decayDist) × exp(-t/decayTime)
char_dx = ((charX - cx) / d) × wave × amp
char_dy = ((charY - cy) / d) × wave × amp
```

**特点**：字符沿径向被波推 → 同心圆涟漪。
跟 `forceWave`（多源累加）二选一，**推荐用 ripple**。

---

## 5. Fonts（Variable Font 加载）

### `ensureVariableFontLoaded(spec)`

模块加载时调用一次，确保 Variable Font 完整 axis 加载。

```ts
ensureVariableFontLoaded({
  family: "Roboto Serif",
  googleFontsCss2Url: "https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wdth,wght@8..144,50..150,100..900&display=block",
});
```

### 预设

```ts
ROBOTO_SERIF_VARIABLE   // 衬线 + opsz/wdth/wght 三轴（推荐用于卷轴/古典氛围）
ROBOTO_FLEX_VARIABLE    // 无衬线 + 13 轴（更激进的字符变形）
```

---

## 6. Types

```ts
type Occlusion = { cx: number; cy: number; r: number };

// 注意：ScreenContext 是概念分组，**不作为参数对象传递**。
// 所有 API（如 getDragonOcclusion）把 scale/offsetX/offsetY 展开成独立参数。
// 保留此类型仅作语义参考。
type ScreenContext = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type PretextLine = {
  text: string;
  x: number;        // 相对 column (0,0) 的 x
  y: number;        // 相对 column (0,0) 的 y
  width: number;    // 该 slot 可用宽
};

type DistanceFieldOptions = {
  radius: number;
  base: number;
  peak: number;
};

// ⚠️ ForceWaveOptions（多源累加力波，遗留）和 RippleSource（单源涟漪，推荐）
// 字段名不同，**绝对不要混用**。建议直接用 RippleSource。
type ForceWaveOptions = {
  amplitude: number;
  frequency: number;          // 时间相位频率
  decayRadius: number;        // 距离衰减半径
  speedPxPerFrame?: number;
};

// 单源标准水波涟漪（推荐）
// 公式：phase = (front - d) / wavelength × 2π，front = waveSpeed × (currentFrame - sourceFrame)
//      wave = sin(phase)，d > front 时字符不动（波前未到）
//      amp = amplitude × exp(-d / decayDistance) × exp(-t / decayTime)
//      字符沿径向 (char - source)/d 位移
type RippleSource = {
  cx: number;                 // 涟漪源屏幕坐标
  cy: number;
  currentFrame: number;       // 当前帧（来自 useCurrentFrame）
  sourceFrame: number;        // 涟漪开始帧（如球落地 landFrame）
  amplitude: number;          // 峰值振幅 px
  wavelength: number;         // 波长 px
  waveSpeed: number;          // 波速 px/帧
  decayDistance: number;      // 距离衰减常数 px
  decayTime: number;          // 时间衰减常数 帧
};

type DragonState = {
  segments: DragonSegment[];
  frm: number;
  rad: number;
};

type DragonSegment = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  type: "head" | "spine";
  scale: number;
  angleRad: number;
};

type BallState = {
  cx: number;
  cy: number;
  r: number;
  hasLanded: boolean;
  landFrame: number;
  squashY: number;
};
```
