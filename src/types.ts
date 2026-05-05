/**
 * pretext-flow 通用类型 — Pretext + Remotion 集成的素材接口标准
 *
 * 三类资产：
 *   1. ForegroundMaterial 前景动态素材（龙、凤凰、火箭...）
 *      必须输出视觉 + 几何包围盒（让路用）
 *   2. BackgroundMaterial 静态/参数化背景（卷轴、报纸、深空...）
 *   3. TextRenderer 文字渲染层（字符级 + Pretext 让路 + 距离场/力波等）
 */

/** 几何包围盒：圆形 (cx, cy, r)，**屏幕像素坐标** */
export type Occlusion = { cx: number; cy: number; r: number };

/** 屏幕坐标系上下文：素材内部坐标 → 屏幕坐标的转换参数 */
export type ScreenContext = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Pretext layoutColumn 输出每行 */
export type PretextLine = {
  text: string;
  /** 相对 column 顶部的 x（让路 slot 起点） */
  x: number;
  /** 相对 column 顶部的 y */
  y: number;
  /** 这一行的可用宽度（单 slot 宽，让路后） */
  width: number;
};

/** 距离场参数：字符 fontSize/wdth/wght 随距素材最近距离变化 */
export type DistanceFieldOptions = {
  /** 影响半径（屏幕像素）。距离 > 半径 → 不影响 */
  radius: number;
  /** 远处基线值 */
  base: number;
  /** 近处峰值 */
  peak: number;
};

/** 力波参数（多源累加版，遗留；建议改用 RippleSource 单源标准水波） */
export type ForceWaveOptions = {
  amplitude: number;
  frequency: number;
  decayRadius: number;
  /** 波从素材当前位置往外传播的速度（像素/帧） */
  speedPxPerFrame?: number;
};

/**
 * 单源涟漪（标准行波公式，推荐用法）
 *   phase = (front - d) / wavelength × 2π，其中 front = waveSpeed × (currentFrame - sourceFrame)
 *   wave = sin(phase)
 *   amp = amplitude × exp(-d / decayDistance) × exp(-t / decayTime)
 *   字符沿径向 (ux, uy) = (char - source) / d 位移
 *   d > front 时字符不动（波前未到）
 */
export type RippleSource = {
  /** 涟漪源屏幕坐标（如球落地点） */
  cx: number;
  cy: number;
  /** 当前帧（来自 useCurrentFrame） */
  currentFrame: number;
  /** 涟漪开始的帧（如球落地帧 landFrame） */
  sourceFrame: number;
  /** 峰值振幅（px） */
  amplitude: number;
  /** 波长（px） */
  wavelength: number;
  /** 波速（px/帧） */
  waveSpeed: number;
  /** 距离衰减常数（px）—— 越远振幅越小 */
  decayDistance: number;
  /** 时间衰减常数（帧）—— 涟漪发生越久振幅越小 */
  decayTime: number;
};
