/**
 * FallingBall — 一个圆球从画面顶部落到中央，单一脉冲源
 *
 * 用于"涟漪 demo"：球落地瞬间作为 ripple source，文字水波纹扩散。
 * 比 SkeletonDragon 简单得多——1 个 occlusion，1 个时间源。
 */
import React from "react";
import type { Occlusion } from "../types";

export type BallState = {
  /** 球当前屏幕坐标（圆心） */
  cx: number;
  cy: number;
  /** 球半径（屏幕像素） */
  r: number;
  /** 球已落地（用于 occlusion 是否参与让路） */
  hasLanded: boolean;
  /** 球落地的帧号（用于涟漪从该帧开始扩散） */
  landFrame: number;
  /** 用于动画的 squash（落地瞬间扁一下） */
  squashY: number;
};

export type FallingBallOptions = {
  /** 球出生屏幕坐标 */
  startX: number;
  startY: number;
  /** 球落地屏幕坐标（涟漪源） */
  landX: number;
  landY: number;
  /** 球落地的帧号 */
  landFrame: number;
  /** 球半径 */
  r: number;
};

export function getBallState(
  frame: number,
  opts: FallingBallOptions,
): BallState {
  const { startX, startY, landX, landY, landFrame, r } = opts;
  if (frame < landFrame) {
    // 抛物线下落（重力加速度感）
    const t = frame / landFrame;
    const eased = t * t;
    const cx = startX + (landX - startX) * t;
    const cy = startY + (landY - startY) * eased;
    return {
      cx,
      cy,
      r,
      hasLanded: false,
      landFrame,
      squashY: 1,
    };
  }
  // 落地后：squash 弹跳衰减（前 8 帧扁，之后稳定）
  const post = frame - landFrame;
  const squashY =
    post < 8 ? 1 - 0.3 * Math.exp(-post / 3) * Math.cos(post * 0.8) : 1;
  return {
    cx: landX,
    cy: landY,
    r,
    hasLanded: true,
    landFrame,
    squashY,
  };
}

/** 球的让路 occlusion（全程参与让路，球经过哪里哪里空，经过后自动闭合） */
export function getBallOcclusion(state: BallState): Occlusion[] {
  return [{ cx: state.cx, cy: state.cy, r: state.r }];
}

export const FallingBall: React.FC<{ state: BallState; visualR?: number }> = ({ state, visualR }) => {
  const vr = visualR ?? state.r;
  const verticalScale = state.squashY;
  const horizontalScale = 2 - verticalScale; // squash 时横向变胖
  return (
    <div
      style={{
        position: "absolute",
        left: state.cx - vr,
        top: state.cy - vr,
        width: vr * 2,
        height: vr * 2,
        transform: `scale(${horizontalScale}, ${verticalScale})`,
        transformOrigin: "center center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000 70%)",
          boxShadow:
            "0 0 22px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.9) inset",
        }}
      />
    </div>
  );
};
