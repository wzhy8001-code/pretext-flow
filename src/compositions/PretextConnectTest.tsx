/**
 * PretextConnectTest — Pretext + Remotion 连接性验证组件
 *
 * 目标：3 秒动画，Lorem ipsum 英文 + 黑方块从底部向上飞，文字让路
 *
 * 验证点：
 *   (A) Pretext 在 Remotion headless chrome 里能否测出正确字宽
 *   (B) layoutNextLine 每帧不同 maxWidth 让路逻辑能否跑通
 *   (C) 渲染速度是否可接受
 */
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
} from "@chenglou/pretext";

const { fontFamily } = loadFont();

const ARTICLE_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. " +
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. " +
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

const FONT_SIZE = 28;
const LINE_HEIGHT_PX = 42;
const TEXT_WIDTH = 1200;
const TEXT_X = (1920 - TEXT_WIDTH) / 2;
const TEXT_Y = 80;
const BLOCK_SIZE = 200;
const GAP = 16;

type Obstacle = { y: number; height: number; left: number; right: number };
type Line = { text: string; x: number; y: number; width: number };

function getLines(
  prepared: ReturnType<typeof prepareWithSegments>,
  obstacle: Obstacle,
  totalWidth: number,
  lineHeight: number,
): Line[] {
  const lines: Line[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = 0;
  let safety = 0;

  while (safety++ < 200) {
    const overlapsObstacle =
      y + lineHeight > obstacle.y && y < obstacle.y + obstacle.height;

    if (overlapsObstacle) {
      const leftWidth = Math.max(0, obstacle.left - GAP);
      if (leftWidth > 20) {
        const left = layoutNextLine(prepared, cursor, leftWidth);
        if (!left) break;
        lines.push({ text: left.text, x: 0, y, width: leftWidth });
        cursor = left.end;
      }
      const rightWidth = Math.max(0, totalWidth - obstacle.right - GAP);
      if (rightWidth > 20) {
        const right = layoutNextLine(prepared, cursor, rightWidth);
        if (!right) break;
        lines.push({
          text: right.text,
          x: obstacle.right + GAP,
          y,
          width: rightWidth,
        });
        cursor = right.end;
      }
    } else {
      const line = layoutNextLine(prepared, cursor, totalWidth);
      if (!line) break;
      lines.push({ text: line.text, x: 0, y, width: totalWidth });
      cursor = line.end;
    }
    y += lineHeight;
  }
  return lines;
}

export const PretextConnectTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fontString = `${FONT_SIZE}px ${fontFamily}`;
  const prepared = useMemo(
    () => prepareWithSegments(ARTICLE_TEXT, fontString),
    [fontString],
  );

  const blockY = interpolate(
    frame,
    [0, durationInFrames - 1],
    [1080, -BLOCK_SIZE],
    { extrapolateRight: "clamp" },
  );

  const blockScreenX = (1920 - BLOCK_SIZE) / 2;
  const obstacle: Obstacle = {
    y: blockY - TEXT_Y,
    height: BLOCK_SIZE,
    left: blockScreenX - TEXT_X,
    right: blockScreenX - TEXT_X + BLOCK_SIZE,
  };

  const lines = getLines(prepared, obstacle, TEXT_WIDTH, LINE_HEIGHT_PX);

  return (
    <AbsoluteFill style={{ backgroundColor: "#fafaf5" }}>
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          top: TEXT_Y,
          width: TEXT_WIDTH,
          fontFamily,
          fontSize: FONT_SIZE,
          color: "#111",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: line.x,
              top: line.y,
              width: line.width,
              height: LINE_HEIGHT_PX,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: blockScreenX,
          top: blockY,
          width: BLOCK_SIZE,
          height: BLOCK_SIZE,
          backgroundColor: "#000",
        }}
      />
    </AbsoluteFill>
  );
};
