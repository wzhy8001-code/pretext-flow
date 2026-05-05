/**
 * pretext-flow 公共 API
 *
 * 这是 Pretext + Remotion 集成 feature 的对外入口。
 * 父级（Root.tsx 或别的 composition）只能通过这个 index 拿东西，
 * 不要直接 import pretext-flow 内部子文件。
 */

// === Composition（注册到 Root.tsx 的成品） ===
export { InkScrollDemo } from "./compositions/InkScrollDemo";
export { BallDropDemo } from "./compositions/BallDropDemo";
export { NewspaperFlowDemo } from "./compositions/NewspaperFlowDemo";
export { PretextConnectTest } from "./compositions/PretextConnectTest";

// === Material（前景动态素材） ===
export {
  SkeletonDragon,
  getDragonState,
  getDragonStateWithHistory,
  getDragonOcclusion,
  type DragonPath,
  type DragonState,
  type DragonSegment,
} from "./materials/SkeletonDragon";

// === Background（静态/参数化背景） ===
export {
  ScrollBackground,
  getScrollContentBox,
  type ScrollBackgroundOptions,
} from "./materials/ScrollBackground";

// === FallingBall（球涟漪源素材） ===
export {
  FallingBall,
  getBallState,
  getBallOcclusion,
  type BallState,
  type FallingBallOptions,
} from "./materials/FallingBall";

// === Layout（Pretext 让路核心算法） ===
export { layoutColumn } from "./layout/layoutColumn";
export {
  carveSlots,
  mergeIntervals,
  circleInterval,
  computeRowSlots,
  type Interval,
} from "./layout/carveSlots";

// === Renderer（文字渲染层） ===
export {
  VariableTextField,
  type VariableTextFieldProps,
  type RippleSource,
} from "./renderers/VariableTextField";

// === Fonts（Variable Font 加载器） ===
export {
  ensureVariableFontLoaded,
  ROBOTO_SERIF_VARIABLE,
  ROBOTO_FLEX_VARIABLE,
  type VariableFontSpec,
} from "./fonts/variableFontLoader";

// === Types ===
export type {
  Occlusion,
  ScreenContext,
  PretextLine,
  DistanceFieldOptions,
  ForceWaveOptions,
} from "./types";
