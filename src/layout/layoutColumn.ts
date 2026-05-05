/**
 * layoutColumn — Pretext 多 slot 让路布局
 *
 * 把一段长文本布局到一个矩形 column 内，遇到 occlusion 圆把行切成多 slot，
 * 每 slot 喂 layoutNextLine 拿一段文字。
 *
 * 行坐标系：返回的 line.x/y **相对 column 顶部 (0, 0)**，调用方加 colLeft/startY 得屏幕坐标。
 */
import {
  layoutNextLine,
  type LayoutCursor,
  type prepareWithSegments,
} from "@chenglou/pretext";
import type { Occlusion, PretextLine } from "../types";
import { computeRowSlots } from "./carveSlots";

export function layoutColumn(
  prepared: ReturnType<typeof prepareWithSegments>,
  occlusion: Occlusion[],
  colLeft: number,
  colRight: number,
  startY: number,
  endY: number,
  lineHeight: number,
  occlusionGap = 14,
  minSlotWidth = 30,
): PretextLine[] {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = startY;
  const lines: PretextLine[] = [];
  let safety = 0;

  while (y < endY && safety++ < 200) {
    const slots = computeRowSlots(
      occlusion,
      colLeft,
      colRight,
      y,
      y + lineHeight,
      occlusionGap,
      minSlotWidth,
    );
    if (slots.length === 0) {
      y += lineHeight;
      continue;
    }
    let advanced = false;
    for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
      const slot = slots[slotIdx]!;
      const slotW = slot.right - slot.left;
      const line = layoutNextLine(prepared, cursor, slotW);
      if (line === null) break;
      // 多 slot 行的第一个 slot 右对齐：文字贴着空洞右边缘，两侧缺口对称
      const xShift = slots.length > 1 && slotIdx === 0 ? slotW - line.width : 0;
      lines.push({
        text: line.text,
        x: slot.left - colLeft + xShift,
        y: y - startY,
        width: slotW - xShift,
      });
      cursor = line.end;
      advanced = true;
    }
    if (!advanced) break;
    y += lineHeight;
  }
  return lines;
}
