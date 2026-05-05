/**
 * VariableTextField — 字符级 + 距离场 + Variable Font 文字渲染器
 *
 * 输入：
 *   - lines: Pretext layoutColumn 输出（每行 text/x/y/width，相对 column 顶部）
 *   - occlusion: 屏幕坐标的让路圆（来自 ForegroundMaterial.getOcclusion）
 *   - column 顶左屏幕坐标（让字符算到 occlusion 的绝对距离）
 *
 * 工作原理：
 *   1. 每行文本拆字符，用 canvas.measureText 累加每字符 x（基础 wdth=100 时的宽度）
 *   2. 对每字符算到所有 occlusion 圆心的最小距离 d
 *   3. d → (wdth, wght) 双轴插值（线性 falloff 1 - d/radius）
 *   4. 字符位置按 widthFactor=wdth/100 经验估算字宽，邻字按 widthFactor 推开
 *   5. 渲染 absolute span，font-variation-settings 控制变形
 *
 * ⚠️ 已知限制：
 *   - canvas.measureText 不识别 font-variation-settings，
 *     所以用 widthFactor 经验估算字宽（5-10% 误差，视觉可接受）
 *   - 字符变胖时若行被让路切窄，可能溢出 line.width
 *     （目前看 Roboto Serif Variable + 距离场强度 ±45% 影响有限）
 *
 * ⚠️ 美化待办：
 *   - 距离场 falloff 改 gaussian / exponential（更平滑过渡，不那么突兀）
 *   - 字体颜色随距离变化（远处 #555 → 近处 #000）
 *   - 字符 letter-spacing 全局加 0.025em（基础态字间空气）
 *   - 力波传递（字震动）层叠加
 */
import React, { useMemo } from "react";
import type {
  DistanceFieldOptions,
  ForceWaveOptions,
  Occlusion,
  PretextLine,
  RippleSource,
} from "../types";

export type { RippleSource } from "../types";

export type VariableTextFieldProps = {
  lines: PretextLine[];
  occlusion: Occlusion[];
  /** column 在屏幕上的左上角坐标（用于把 line.x/y 转屏幕坐标算距离） */
  columnScreenX: number;
  columnScreenY: number;
  /** Pretext 排字时用的 fontFamily，必须跟渲染时一致 */
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color?: string;
  /** wdth 双轴距离场 */
  wdthField: DistanceFieldOptions;
  /** wght 双轴距离场（独立 base/peak，但共享 radius） */
  wghtField: DistanceFieldOptions;
  /** 全局 letter-spacing（CSS em 单位，默认 0） */
  letterSpacingEm?: number;
  /** 力波传递（多源累加版，与 ripple 二选一）：龙身历史轨迹累加脉冲 */
  forceWave?: ForceWaveOptions;
  /** 历史 occlusion（来自 getDragonStateWithHistory.history → getDragonOcclusion 数组） */
  occlusionHistory?: Occlusion[][];
  /** 单源涟漪（与 forceWave 二选一）：球落地从这一点向外扩散水波 */
  ripple?: RippleSource;
};

/** RippleSource 类型在 ../types 定义，本文件 re-export 给 index.ts */

type Char = { text: string; cx: number; width: number };

function splitChars(
  text: string,
  fontStr: string,
  ctx: CanvasRenderingContext2D | null,
): Char[] {
  if (!ctx) {
    return Array.from(text).map((c, i) => ({
      text: c,
      cx: i * 10 + 5,
      width: 10,
    }));
  }
  ctx.font = fontStr;
  let x = 0;
  const out: Char[] = [];
  for (const c of text) {
    const w = ctx.measureText(c).width;
    out.push({ text: c, cx: x + w / 2, width: w });
    x += w;
  }
  return out;
}

function distMin(absX: number, absY: number, occlusion: Occlusion[]): number {
  let minD2 = Infinity;
  for (const c of occlusion) {
    const dx = absX - c.cx;
    const dy = absY - c.cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

function lerpField(d: number, f: DistanceFieldOptions): number {
  if (d > f.radius) return f.base;
  const k = 1 - d / f.radius;
  return f.base + (f.peak - f.base) * k;
}

/**
 * 标准水面涟漪：单源 + 行波公式
 *   phase = (d - waveSpeed × t) / wavelength × 2π
 *   wave = sin(phase)
 *   字符沿径向 (ux, uy) = (char - source) / d 位移
 *   amp = baseAmp × exp(-d/decayDist) × exp(-t/decayTime)
 *
 * 可视化：球落地后，水波从球向外扩散，先到的字符先动，远处字符晚动。
 * 字符沿径向被波"推开 / 拉回"，看起来是同心圆涟漪。
 */
function computeRippleDisturbance(
  charX: number,
  charY: number,
  source: RippleSource,
): { dx: number; dy: number } {
  const t = source.currentFrame - source.sourceFrame;
  if (t < 0) return { dx: 0, dy: 0 };
  const ddx = charX - source.cx;
  const ddy = charY - source.cy;
  const d = Math.sqrt(ddx * ddx + ddy * ddy);
  if (d < 0.5) return { dx: 0, dy: 0 };
  const ux = ddx / d;
  const uy = ddy / d;
  // 波前截断：波还没到这里 → 字符不动
  const front = source.waveSpeed * t;
  const distFromFront = front - d;
  if (distFromFront < 0) return { dx: 0, dy: 0 };
  // 相位由"波前到达后经过的时间距离"决定 → 波从中心向外扩散
  const phase = (distFromFront / source.wavelength) * 2 * Math.PI;
  const wave = Math.sin(phase);
  const amp =
    source.amplitude *
    Math.exp(-d / source.decayDistance) *
    Math.exp(-t / source.decayTime);
  return { dx: ux * wave * amp, dy: uy * wave * amp };
}

/**
 * 力波 disturbance（多源累加版，遗留）：累加所有历史 occlusion 对该字符的脉冲影响。
 *   每个历史段贡献一个相位偏移 (dx, dy)，沿距离衰减 + 沿时间衰减
 *   ⚠️ 多源叠加容易"扭曲噪音"，不是清晰水波。建议用 ripple 单源。
 */
function computeForceWaveDisturbance(
  charX: number,
  charY: number,
  history: Occlusion[][],
  opts: ForceWaveOptions,
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  const decayR2 = opts.decayRadius * opts.decayRadius;
  const timeDecay = Math.max(1, history.length / 2);
  for (let f = 0; f < history.length; f++) {
    const timeAgo = history.length - f;
    const tDecay = Math.exp(-timeAgo / timeDecay);
    if (tDecay < 0.02) continue;
    const phase = timeAgo * opts.frequency;
    const occl = history[f];
    for (const c of occl) {
      const ddx = charX - c.cx;
      const ddy = charY - c.cy;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > decayR2 * 4) continue;
      const dDecay = Math.exp(-d2 / decayR2);
      const amp = opts.amplitude * dDecay * tDecay;
      dx += amp * Math.cos(phase);
      dy += amp * Math.sin(phase);
    }
  }
  return { dx, dy };
}

export const VariableTextField: React.FC<VariableTextFieldProps> = ({
  lines,
  occlusion,
  columnScreenX,
  columnScreenY,
  fontFamily,
  fontSize,
  lineHeight,
  color = "#1a1108",
  wdthField,
  wghtField,
  letterSpacingEm = 0,
  forceWave,
  occlusionHistory,
  ripple,
}) => {
  const fontString = `${fontSize}px ${fontFamily}`;

  const measureCtx = useMemo<CanvasRenderingContext2D | null>(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("canvas").getContext("2d");
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: columnScreenX,
        top: columnScreenY,
        width: "auto",
        height: "auto",
        fontFamily,
        fontSize,
        color,
        overflow: "visible",
        letterSpacing: letterSpacingEm ? `${letterSpacingEm}em` : undefined,
      }}
    >
      {lines.map((line, i) => {
        const chars = splitChars(line.text, fontString, measureCtx);
        let unscaledX = 0;
        let placedX = 0;
        const items = chars.map((ch) => {
          const baseAbsX = columnScreenX + line.x + unscaledX + ch.width / 2;
          const baseAbsY = columnScreenY + line.y + lineHeight / 2;
          const d = distMin(baseAbsX, baseAbsY, occlusion);
          const wdth = lerpField(d, wdthField);
          const wght = lerpField(d, wghtField);
          const widthFactor = wdth / wdthField.base;
          const charDisplayWidth = ch.width * widthFactor;
          const placedCx = placedX + charDisplayWidth / 2;
          placedX += charDisplayWidth;
          unscaledX += ch.width;
          let waveDx = 0;
          let waveDy = 0;
          if (ripple) {
            const w = computeRippleDisturbance(baseAbsX, baseAbsY, ripple);
            waveDx += w.dx;
            waveDy += w.dy;
          }
          if (forceWave && occlusionHistory && occlusionHistory.length > 0) {
            const w = computeForceWaveDisturbance(
              baseAbsX,
              baseAbsY,
              occlusionHistory,
              forceWave,
            );
            waveDx += w.dx;
            waveDy += w.dy;
          }
          return {
            ch,
            wdth,
            wght,
            placedCx,
            displayWidth: charDisplayWidth,
            waveDx,
            waveDy,
          };
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: line.x,
              top: line.y,
              width: line.width,
              height: lineHeight,
            }}
          >
            {items.map((it, j) => (
              <span
                key={j}
                style={{
                  position: "absolute",
                  left: it.placedCx - it.displayWidth / 2,
                  top: 0,
                  width: it.displayWidth,
                  height: lineHeight,
                  lineHeight: `${lineHeight}px`,
                  textAlign: "center",
                  display: "inline-block",
                  fontVariationSettings: `"wdth" ${it.wdth.toFixed(1)}, "wght" ${it.wght.toFixed(0)}`,
                  transform:
                    it.waveDx || it.waveDy
                      ? `translate(${it.waveDx.toFixed(2)}px, ${it.waveDy.toFixed(2)}px)`
                      : undefined,
                  whiteSpace: "pre",
                }}
              >
                {it.ch.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};
