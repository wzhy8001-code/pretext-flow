/**
 * NewspaperFlowDemo — 报纸版面 + 龙飞起 + 文字让路 + 翻页转场
 *
 * 6 秒 @ 30fps:
 *   0-5s: 龙(Flame 占位)从底部向上飞过报纸版面，正文文字遇龙让路
 *   5-6s: CSS 3D 翻页 rotateY 0→180，翻到背面太空场景
 */
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
} from "@chenglou/pretext";
import { Flame } from "lucide-react";

const { fontFamily: playfairFamily } = loadPlayfair();
const { fontFamily: interFamily } = loadInter();

const ARTICLE_TEXT =
  "CAPE CANAVERAL — In a development that has stunned the aerospace community, " +
  "engineers at the orbital launch facility confirmed yesterday that the prototype " +
  "vehicle achieved sustained autonomous flight for the first time. The breakthrough " +
  "comes after eighteen months of iterative testing, with each attempt providing " +
  "critical data about thermal management and propellant flow under acceleration. " +
  "Lead systems architect Dr. Mira Tanaka described the moment as the culmination " +
  "of decades of theoretical work, finally validated by hardware that performed " +
  "exactly as the simulations had predicted. Industry analysts note that the " +
  "implications extend far beyond the immediate technical milestone, potentially " +
  "reshaping the economics of low-orbit logistics for the next generation of " +
  "commercial operators. Several competing firms have already announced plans to " +
  "accelerate their own programs in response to the demonstration, though none " +
  "have publicly committed to a specific timeline. The vehicle returned to the pad " +
  "with minimal observable damage, which engineers say is itself a vindication of " +
  "the new heat-shield composite material introduced earlier this year.";

const FONT_SIZE = 22;
const LINE_HEIGHT_PX = 34;
const COLUMN_WIDTH = 1200;
const COLUMN_X = (1920 - COLUMN_WIDTH) / 2;
const COLUMN_Y = 360;
const DRAGON_SIZE = 220;
const GAP = 18;

const FLIP_START_FRAME = 150;
const FLIP_DURATION = 30;

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

const NewspaperFront: React.FC<{ frame: number }> = ({ frame }) => {
  const fontString = `${FONT_SIZE}px ${interFamily}`;
  const prepared = useMemo(
    () => prepareWithSegments(ARTICLE_TEXT, fontString),
    [fontString],
  );

  const dragonY = interpolate(frame, [0, 150], [1080, -DRAGON_SIZE], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dragonX = (1920 - DRAGON_SIZE) / 2;

  const obstacle: Obstacle = {
    y: dragonY - COLUMN_Y,
    height: DRAGON_SIZE,
    left: dragonX - COLUMN_X,
    right: dragonX - COLUMN_X + DRAGON_SIZE,
  };
  const lines = getLines(prepared, obstacle, COLUMN_WIDTH, LINE_HEIGHT_PX);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#f3eedf",
        color: "#111",
        overflow: "hidden",
      }}
    >
      {/* Masthead */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: playfairFamily,
          fontWeight: 900,
          fontSize: 88,
          letterSpacing: 4,
          borderBottom: "3px double #111",
          paddingBottom: 12,
          marginLeft: 80,
          marginRight: 80,
        }}
      >
        THE COURIER
      </div>
      {/* Sub-meta line */}
      <div
        style={{
          position: "absolute",
          top: 158,
          left: 80,
          right: 80,
          fontFamily: interFamily,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          color: "#444",
        }}
      >
        <span>Vol. CXLVII · No. 2,389</span>
        <span>Wednesday, April 29, 2026</span>
        <span>Price: 50¢</span>
      </div>
      {/* Breaking strip */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 80,
          right: 80,
          backgroundColor: "#111",
          color: "#f3eedf",
          padding: "8px 16px",
          fontFamily: interFamily,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Breaking · Special Report
      </div>
      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: 246,
          left: 80,
          right: 80,
          fontFamily: playfairFamily,
          fontWeight: 700,
          fontSize: 52,
          lineHeight: "60px",
          textAlign: "center",
        }}
      >
        Prototype Vehicle Clears First Autonomous Orbit
      </div>
      {/* Byline */}
      <div
        style={{
          position: "absolute",
          top: 318,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: playfairFamily,
          fontStyle: "italic",
          fontSize: 18,
          color: "#555",
        }}
      >
        By J. Halloway, Aerospace Correspondent
      </div>
      {/* Body — Pretext-laid out around the dragon */}
      <div
        style={{
          position: "absolute",
          left: COLUMN_X,
          top: COLUMN_Y,
          width: COLUMN_WIDTH,
          fontFamily: interFamily,
          fontSize: FONT_SIZE,
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
      {/* Dragon (Flame placeholder) */}
      <div
        style={{
          position: "absolute",
          left: dragonX,
          top: dragonY,
          width: DRAGON_SIZE,
          height: DRAGON_SIZE,
          color: "#c0392b",
          filter: "drop-shadow(0 0 28px rgba(231,76,60,0.6))",
        }}
      >
        <Flame size={DRAGON_SIZE} strokeWidth={1.4} fill="#e74c3c" />
      </div>
      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 80,
          right: 80,
          fontFamily: interFamily,
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#666",
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #999",
          paddingTop: 10,
        }}
      >
        <span>Page 1 of 24</span>
        <span>© 2026 The Courier · All Rights Reserved</span>
      </div>
    </div>
  );
};

const SpaceBack: React.FC = () => {
  const stars = useMemo(() => {
    const arr: { x: number; y: number; r: number; o: number }[] = [];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 220; i++) {
      arr.push({
        x: rand() * 1920,
        y: rand() * 1080,
        r: rand() * 1.8 + 0.4,
        o: rand() * 0.7 + 0.3,
      });
    }
    return arr;
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at 30% 30%, #1a2b48 0%, #050a18 70%)",
      }}
    >
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={s.o}
          />
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: playfairFamily,
          fontSize: 64,
          fontStyle: "italic",
          color: "#cfd8e8",
          letterSpacing: 6,
        }}
      >
        ad astra
      </div>
    </div>
  );
};

export const NewspaperFlowDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const flipProgress = interpolate(
    frame,
    [FLIP_START_FRAME, FLIP_START_FRAME + FLIP_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const rotateY = flipProgress * 180;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", perspective: "1700px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `rotateY(-${rotateY}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
          }}
        >
          <NewspaperFront frame={frame} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <SpaceBack />
        </div>
      </div>
      {/* suppress unused var warning — durationInFrames reserved for future use */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
