/**
 * SkeletonDragon — 段拼装骨骼龙素材模块（基座的第一块）
 *
 * 范式来源：naborajs/DRAGON-FOLLOWS-YOU (MIT)
 *   - 30 段 chain physics（去 Aletas 翅膀）
 *   - 每段独立 SVG <use> 引用 Cabeza/Espina
 *   - 每段 transform = translate + rotate + scale
 *
 * 改造点：
 *   - 鼠标 → frame-driven 贝塞尔路径
 *   - mutable state → 重放法（每帧从 frame=0 重算到当前帧）
 *   - 暴露 getDragonState(frame) 给视觉渲染
 *   - 暴露 getDragonOcclusion(frame) 给 Pretext 让路
 */
import React, { useMemo } from "react";
import type { Occlusion as OcclusionType } from "../types";

const N = 30;
const VIEWBOX_W = 300;
const VIEWBOX_H = 300;
const VIEWBOX_X_MIN = -150;
const VIEWBOX_Y_MIN = -150;

export type DragonSegment = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  type: "head" | "spine";
  scale: number;
  angleRad: number;
};

export type DragonState = {
  segments: DragonSegment[];
  frm: number;
  rad: number;
};

export type DragonPath = (frame: number) => { x: number; y: number };

const RAD_M = Math.min(VIEWBOX_W, VIEWBOX_H) / 6 - 20;

/** 把当前 segs[] 快照成 DragonSegment[] */
function snapshotSegments(segs: { x: number; y: number }[]): DragonSegment[] {
  const result: DragonSegment[] = [];
  for (let i = 0; i < N; i++) {
    const e = segs[i];
    const ep = i === 0 ? e : segs[i - 1];
    const a = i === 0 ? 0 : Math.atan2(e.y - ep.y, e.x - ep.x);
    const s = (162 + 4 * (1 - i)) / 300;
    result.push({
      x: e.x,
      y: e.y,
      prevX: ep.x,
      prevY: ep.y,
      type: i === 0 ? "head" : "spine",
      scale: s,
      angleRad: a,
    });
  }
  return result;
}

export function getDragonState(
  frame: number,
  pathFn: DragonPath,
): DragonState {
  return getDragonStateWithHistory(frame, pathFn, 0).current;
}

/**
 * 重放法升级版：返回当前 state + 过去 historyDepth 帧的快照。
 * 用于力波传递（每字符累加历史 impulse 涟漪）。
 *
 * history[0] = 最早的（最久之前），history[length-1] = 最新（即上一帧）
 * current = 当前帧 state
 *
 * 性能：O(frame)，重放循环里顺手记录，几乎零额外成本。
 */
export function getDragonStateWithHistory(
  frame: number,
  pathFn: DragonPath,
  historyDepth: number,
): { current: DragonState; history: DragonState[] } {
  const segs = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  let rad = 0;
  let frm = 0.123;
  const history: DragonState[] = [];
  const historyStart = Math.max(0, frame - historyDepth);

  for (let f = 0; f <= frame; f++) {
    const target = pathFn(f);
    const ax = (Math.cos(3 * frm) * rad * VIEWBOX_W) / VIEWBOX_H;
    const ay = (Math.sin(4 * frm) * rad * VIEWBOX_H) / VIEWBOX_W;
    segs[0].x += (ax + target.x - segs[0].x) / 10;
    segs[0].y += (ay + target.y - segs[0].y) / 10;
    for (let i = 1; i < N; i++) {
      const e = segs[i];
      const ep = segs[i - 1];
      const a = Math.atan2(e.y - ep.y, e.x - ep.x);
      e.x += (ep.x - e.x + (Math.cos(a) * (100 - i)) / 22) / 4;
      e.y += (ep.y - e.y + (Math.sin(a) * (100 - i)) / 22) / 4;
    }
    if (rad < RAD_M) rad++;
    frm += 0.003;

    if (f >= historyStart && f < frame && historyDepth > 0) {
      history.push({
        segments: snapshotSegments(segs),
        frm,
        rad,
      });
    }
  }

  return {
    current: { segments: snapshotSegments(segs), frm, rad },
    history,
  };
}

export type Occlusion = OcclusionType;

export function getDragonOcclusion(
  state: DragonState,
  svgScreenScale: number,
  svgScreenX: number,
  svgScreenY: number,
): Occlusion[] {
  const segOuterR: Record<DragonSegment["type"], number> = {
    head: 30,
    spine: 22,
  };
  return state.segments.map((seg) => {
    const cxSvg = (seg.x + seg.prevX) / 2;
    const cySvg = (seg.y + seg.prevY) / 2;
    const cxScreen = svgScreenX + (cxSvg - VIEWBOX_X_MIN) * svgScreenScale;
    const cyScreen = svgScreenY + (cySvg - VIEWBOX_Y_MIN) * svgScreenScale;
    const r = segOuterR[seg.type] * seg.scale * svgScreenScale;
    return { cx: cxScreen, cy: cyScreen, r };
  });
}

export const DragonDefs: React.FC = () => (
  <defs>
    <g id="dragon-Cabeza">
      <path
        style={{ fill: "#ffffff", fillOpacity: 1 }}
        d="M-28.9,-1.1L-28.55 -1.95Q-28.1 -3.1 -27.25 -2.95L-26.7 -2.95Q-27.7 -1.65 -28.9 -1.1M-18.35,-1.8Q-15.1 -10.3 -9.6 -6.05Q-15.1 -6.2 -18.35 -1.8M-18.35,1.1Q-15.1 5.45 -9.6 5.35Q-15.1 9.55 -18.35 1.1M-26.7,2.2L-27.25 2.25Q-28.1 2.4 -28.55 1.2L-28.9 0.35Q-27.7 0.9 -26.7 2.2"
      />
      <path
        style={{ fill: "#000000", fillOpacity: 1 }}
        d="M-21.05,-8.25Q-13.6 -15.95 -1.3 -12.1Q-7.85 -8.5 -5.85 -4.35Q-2.3 -4.85 10.5 0.15Q0 4.35 -5.85 3.65Q-7.85 7.75 -1.25 12.45Q-13.6 15.2 -21.05 7.5Q-29.55 4.05 -30.2 -0.35Q-29.55 -4.8 -21.05 -8.25M-26.7,-2.95L-27.25 -2.95Q-28.1 -3.1 -28.55 -1.95L-28.9 -1.1Q-27.7 -1.65 -26.7 -2.95M-9.6,-6.05Q-15.1 -10.3 -18.35 -1.8Q-15.1 -6.2 -9.6 -6.05M-9.6,5.35Q-15.1 5.45 -18.35 1.1Q-15.1 9.55 -9.6 5.35M-28.9,0.35L-28.55 1.2Q-28.1 2.4 -27.25 2.25L-26.7 2.2Q-27.7 0.9 -28.9 0.35"
      />
    </g>
    <g id="dragon-Espina">
      <path
        style={{ fill: "#000000", fillOpacity: 1 }}
        d="M-18.8,0Q-17.85 -5.7 -12.3 -9.6Q-11.2 -5.35 -6.5 -8.25L-6.45 -8.2L-6.2 -8.3Q1.25 -16.25 6.65 -12.4Q0.05 -12.55 0 -5.95Q2.7 -2.4 7.75 -4.1Q18 -1.45 18.8 0L-18.8 0"
      />
      <path
        style={{ fill: "#000000", fillOpacity: 1 }}
        d="M18.8,0Q18 1.45 7.75 4.1Q2.7 2.4 0 5.95Q0.05 12.55 6.65 12.4Q1.25 16.25 -6.2 8.35Q-6.35 8.25 -6.45 8.25L-6.5 8.25Q-11.2 5.35 -12.3 9.6Q-17.85 5.7 -18.8 0L18.8 0"
      />
    </g>
  </defs>
);

export const SkeletonDragon: React.FC<{
  state: DragonState;
  svgWidth: number;
  svgHeight: number;
  screenX: number;
  screenY: number;
  scale: number;
}> = ({ state, svgWidth, svgHeight, screenX, screenY, scale }) => {
  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`${VIEWBOX_X_MIN} ${VIEWBOX_Y_MIN} ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: svgWidth,
        height: svgHeight,
        pointerEvents: "none",
      }}
    >
      <DragonDefs />
      <g>
        {state.segments
          .slice()
          .reverse()
          .map((seg, idx) => {
            const i = N - 1 - idx;
            if (i === 0 || i === 1) return null;
            const cx = (seg.x + seg.prevX) / 2;
            const cy = (seg.y + seg.prevY) / 2;
            const deg = (180 / Math.PI) * seg.angleRad;
            return (
              <use
                key={i}
                href="#dragon-Espina"
                transform={`translate(${cx},${cy}) rotate(${deg}) scale(${seg.scale},${seg.scale})`}
              />
            );
          })}
        {(() => {
          const head = state.segments[1];
          if (!head) return null;
          const cx = (head.x + head.prevX) / 2;
          const cy = (head.y + head.prevY) / 2;
          const deg = (180 / Math.PI) * head.angleRad;
          return (
            <use
              href="#dragon-Cabeza"
              transform={`translate(${cx},${cy}) rotate(${deg}) scale(${head.scale},${head.scale})`}
            />
          );
        })()}
      </g>
      <g style={{ display: "none" }}>
        {scale}
        {svgWidth}
        {svgHeight}
      </g>
    </svg>
  );
};
