/**
 * carveSlots — Pretext 让路核心算法
 *
 * 输入：每行 vertical band [bandTop, bandBot]，N 个圆形 occlusion，column 左右边界
 * 输出：被 occlusion 切除后剩余的"可用 slot"列表
 *
 * 范式来源：qtakmalay/PreTextExperiments dragon demo（MIT）
 *   - circleInterval: 圆与水平 band 求交，得到该圆挡住的水平区间
 *   - mergeIntervals: 多圆区间合并
 *   - carveSlots: 从基础 [colLeft, colRight] 减去合并后的 blocked 区间
 */
import type { Occlusion } from "../types";

export type Interval = { left: number; right: number };

/** 单圆与水平 band 求交，返回该圆挡住的 [left, right] 水平区间 */
export function circleInterval(
  cx: number,
  cy: number,
  r: number,
  bandTop: number,
  bandBot: number,
): Interval | null {
  if (bandTop >= cy + r || bandBot <= cy - r) return null;
  const minDy =
    cy >= bandTop && cy <= bandBot
      ? 0
      : cy < bandTop
        ? bandTop - cy
        : cy - bandBot;
  if (minDy >= r) return null;
  const dx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - dx, right: cx + dx };
}

/** 合并多个区间（重叠的合并成一个） */
export function mergeIntervals(ivs: Interval[]): Interval[] {
  if (ivs.length <= 1) return ivs.slice();
  const sorted = ivs.slice().sort((a, b) => a.left - b.left);
  const m: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = m[m.length - 1];
    const cur = sorted[i];
    if (cur.left <= last.right) last.right = Math.max(last.right, cur.right);
    else m.push({ ...cur });
  }
  return m;
}

/** 从 [baseL, baseR] 减去 blocked 区间，返回剩余的 slot 列表（过滤掉太窄的） */
export function carveSlots(
  baseL: number,
  baseR: number,
  blocked: Interval[],
  minSlotWidth = 30,
): Interval[] {
  let slots: Interval[] = [{ left: baseL, right: baseR }];
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) {
        next.push(s);
        continue;
      }
      if (b.left > s.left) next.push({ left: s.left, right: b.left });
      if (b.right < s.right) next.push({ left: b.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= minSlotWidth);
}

/**
 * 综合：给定一行 vertical band 和 column 边界 + 全部 occlusion，
 * 返回该行剩余的可用 slot 列表（已合并、已过滤）
 */
export function computeRowSlots(
  occlusion: Occlusion[],
  colLeft: number,
  colRight: number,
  bandTop: number,
  bandBot: number,
  occlusionGap = 14,
  minSlotWidth = 30,
): Interval[] {
  const blocked: Interval[] = [];
  for (const c of occlusion) {
    const iv = circleInterval(c.cx, c.cy, c.r + occlusionGap, bandTop, bandBot);
    if (iv) blocked.push(iv);
  }
  return carveSlots(colLeft, colRight, mergeIntervals(blocked), minSlotWidth);
}
