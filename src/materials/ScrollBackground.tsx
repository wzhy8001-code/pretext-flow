/**
 * ScrollBackground — 横版中国卷轴背景
 *
 * 5 层叠加：
 *   1. 外部暗色背景
 *   2. 米黄宣纸卷轴主体（线性渐变 + inset shadow）
 *   3. 左侧木质轴心（径向渐变模拟圆柱）
 *   4. 右侧木质轴心
 *   5. 内边框装饰线
 *
 * ⚠️ 美化待办：
 *   - 纸纹 / 墨点细节（用 SVG filter feTurbulence 加底纹）
 *   - 卷轴边缘虚化 / 撕裂感
 *   - 木质轴心高光更立体
 *   - 暗背景换成深木色或墨黑
 */
import React from "react";

export type ScrollBackgroundOptions = {
  /** 屏幕宽（默认 1920） */
  width?: number;
  /** 屏幕高（默认 1080） */
  height?: number;
  /** 卷轴左右距屏幕边的留白（轴心外侧延伸用） */
  padX?: number;
  /** 卷轴上下距屏幕边的留白 */
  padY?: number;
  /** 纸张主色（顶到底渐变）*/
  paperGradient?: [string, string, string];
  /** 木质轴心配色 */
  rollerColors?: [string, string, string];
  /** 外层背景色 */
  outerBg?: string;
};

const DEFAULT_OPTIONS: Required<ScrollBackgroundOptions> = {
  width: 1920,
  height: 1080,
  padX: 200,
  padY: 120,
  paperGradient: ["#f0e3c4", "#ecdcb6", "#e8d4a4"],
  rollerColors: ["#2a1810", "#5b3a23", "#7a4f30"],
  outerBg: "#1a1410",
};

export const ScrollBackground: React.FC<ScrollBackgroundOptions> = (props) => {
  const opt = { ...DEFAULT_OPTIONS, ...props };
  const [pa, pb, pc] = opt.paperGradient;
  const [r0, r1, r2] = opt.rollerColors;
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: opt.outerBg,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: opt.padX,
          right: opt.padX,
          top: opt.padY,
          bottom: opt.padY,
          background: `linear-gradient(180deg, ${pa} 0%, ${pb} 50%, ${pc} 100%)`,
          boxShadow:
            "0 0 60px rgba(0,0,0,0.45) inset, 0 20px 60px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: opt.padX - 60,
          top: opt.padY - 18,
          bottom: opt.padY - 18,
          width: 60,
          background: `linear-gradient(90deg, ${r0} 0%, ${r1} 30%, ${r2} 50%, ${r1} 70%, ${r0} 100%)`,
          borderRadius: "30px / 12px",
          boxShadow: "0 0 25px rgba(0,0,0,0.7)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: opt.padX - 60,
          top: opt.padY - 18,
          bottom: opt.padY - 18,
          width: 60,
          background: `linear-gradient(90deg, ${r0} 0%, ${r1} 30%, ${r2} 50%, ${r1} 70%, ${r0} 100%)`,
          borderRadius: "30px / 12px",
          boxShadow: "0 0 25px rgba(0,0,0,0.7)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: opt.padX + 12,
          right: opt.padX + 12,
          top: opt.padY + 12,
          bottom: opt.padY + 12,
          border: "1px solid rgba(80,50,20,0.25)",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

/** 卷轴正文区参数辅助：给定 padX/padY 算出可用 column 范围 */
export function getScrollContentBox(opt: ScrollBackgroundOptions = {}) {
  const o = { ...DEFAULT_OPTIONS, ...opt };
  const innerPadX = 40;
  const titleAreaY = 70;
  const bottomMargin = 40;
  return {
    columnX: o.padX + innerPadX,
    columnY: o.padY + titleAreaY,
    columnW: o.width - 2 * (o.padX + innerPadX),
    columnH: o.height - 2 * o.padY - titleAreaY - bottomMargin,
  };
}
