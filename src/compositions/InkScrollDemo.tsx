/**
 * InkScrollDemo — 卷轴 + 骨骼龙穿梭让路 + 字符级 Variable Font 距离场
 *
 * 这是一个"瘦组件"——所有重活在 pretext-flow/{layout,fonts,materials,renderers}
 *
 * 5 秒 / 30fps / 1920x1080
 *
 * ⚠️ 美化待办（交给后续美化窗口）：
 *   - 字间距还感觉挤（v9 反馈）→ 减文字 / 加 letterSpacingEm / 调温和距离场
 *   - 龙身水墨化（用 SVG filter feTurbulence）暂未启用
 *   - 卷轴细节（纸纹/木质高光）见 ScrollBackground 注释
 *   - 标题美化（位置/字号/装饰）
 *   - 距离场 falloff 改 gaussian / exp（视觉过渡更柔和）
 */
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { prepareWithSegments } from "@chenglou/pretext";

import {
  ScrollBackground,
  getScrollContentBox,
} from "../materials/ScrollBackground";
import {
  getDragonStateWithHistory,
  getDragonOcclusion,
  SkeletonDragon,
  type DragonPath,
} from "../materials/SkeletonDragon";
import { layoutColumn } from "../layout/layoutColumn";
import { VariableTextField } from "../renderers/VariableTextField";
import {
  ensureVariableFontLoaded,
  ROBOTO_SERIF_VARIABLE,
} from "../fonts/variableFontLoader";

const { fontFamily: titleFamily } = loadPlayfair();
ensureVariableFontLoaded(ROBOTO_SERIF_VARIABLE);

const PASSAGE_A = [
  "There are old tales that begin with a single line on a page and end with the page itself in motion.",
  "The scribes of the river kingdoms wrote of a creature long as a column of smoke, lithe as a flame leaning toward water.",
  "It moved between sentences without disturbing the dust of them, and where its body passed the words leaned aside as reeds before a quiet wind.",
  "Travelers said the ink remembered. That if you set the parchment in lamplight late enough, the letters would shift again, parting along the same hidden seam.",
  "What we read on the surface, they argued, was only the calm version of a more restless text underneath.",
].join(" ");
const PASSAGE_B = [
  "Whether the creature lived or was simply a property of the writing, the chroniclers could not agree.",
  "Some swore they had seen its tail curl around a footnote, slow and luminous as a fish in dim water.",
  "Others said it was nothing but a discipline of the eye, a way of teaching the reader that meaning is never quite where you left it.",
  "And yet the descriptions are unusually consistent across centuries, in a dozen languages and a hundred libraries.",
  "A long sinuous body, no wings, a head that tilts as if listening, and a habit of choosing the densest paragraphs to swim through.",
].join(" ");
const PASSAGE_C = [
  "It does not arrive in pictures, only in margins. It does not announce itself.",
  "The first sign is always a small parting in the line you happen to be reading, a soft inhalation in the prose, and then the slow understanding that the page itself has briefly grown deeper.",
  "By the time you look up, the room is exactly as it was, and the text has settled, and you cannot say with any certainty that anything has moved at all.",
  "But the words are arranged a little differently now, and you have a feeling that you have been read in return.",
  "There is a particular silence after the encounter, neither comfortable nor frightening, the silence of a sentence that has just remembered why it was written.",
].join(" ");
const PASSAGE_D = [
  "The oldest manuscript known to mention the body in the margins is held in a glass case in a small inland city, displayed alongside notes by readers who reported similar visitations.",
  "Each note is dated. Each one describes the same brief feeling of an indrawn breath beneath the words.",
  "Scholars have tried, with varying patience, to find a pattern. They have looked for time of day, for season, for the temperament of the reader, for the proximity of certain other books on the shelf.",
  "Nothing predictive has ever been found. The visitations are courteous, irregular, and entirely uninterested in being studied.",
  "Which is, perhaps, the most accurate description we will ever have of any reading worth the name.",
].join(" ");
const PASSAGE_E = [
  "Some have gone so far as to claim that the page itself is the body, and that what they call the creature is only the page becoming briefly aware of being read.",
  "This theory is widely dismissed, and yet there is something compelling in it, a tidy reversal that makes the reader the visited rather than the visitor.",
  "We who turn the leaves, who run our eyes along the lines, who underline a clause and write a question in the white space — perhaps we are the ones who pass through.",
  "Perhaps the body in the margins is the patient, attentive thing, and we are the brief flickers it watches go by.",
  "It is not a comforting idea, but neither is it cruel. It is a polite reminder that in any honest exchange between mind and text, the traffic moves both ways.",
].join(" ");
const PASSAGE_F = [
  "I have read this manuscript four times now, in four different rooms, with four different teas growing cold beside me.",
  "On the second reading, I am almost certain that I felt a small parting between two of the lines on the seventh page, like the soft yielding of long grass to a hand pressed flat through it.",
  "By the third reading I had decided I was imagining things. By the fourth I was no longer sure that the distinction between imagining and noticing was useful here.",
  "The text settles back, of course. It always does. The lines close again, and the words sit where they have always sat, and one is left with a faint impression that something companionable has just turned a corner out of sight.",
  "Which, I have come to believe, is what reading was always meant to feel like, before we hurried it into something simpler.",
].join(" ");
const ARTICLE_TEXT = [
  PASSAGE_A,
  PASSAGE_B,
  PASSAGE_C,
  PASSAGE_D,
  PASSAGE_E,
  PASSAGE_F,
].join(" ");

const FONT_SIZE = 18;
const LINE_HEIGHT = 28;
const SCROLL_PAD_X = 200;
const SCROLL_PAD_Y = 120;

const DRAGON_SVG_W = 1100;
const DRAGON_SVG_H = 1100;
const DRAGON_SVG_X = (1920 - DRAGON_SVG_W) / 2;
const DRAGON_SVG_Y = (1080 - DRAGON_SVG_H) / 2;
const DRAGON_SCREEN_SCALE = DRAGON_SVG_W / 300;

const TOTAL_FRAMES = 150;

const dragonPath: DragonPath = (frame: number) => {
  const t = frame / TOTAL_FRAMES;
  const xRange = 200;
  const yRange = 100;
  const x = -xRange + 2 * xRange * t + Math.sin(t * Math.PI * 2.5) * 30;
  const y = Math.sin(t * Math.PI * 2.5) * yRange;
  return { x, y };
};

const FIELD_RADIUS = 400;
const FORCE_HISTORY_DEPTH = 24;

export const InkScrollDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const fontFamily = ROBOTO_SERIF_VARIABLE.family;
  const fontString = `${FONT_SIZE}px ${fontFamily}`;
  const prepared = useMemo(
    () => prepareWithSegments(ARTICLE_TEXT, fontString),
    [fontString],
  );

  const { current: dragonState, history: dragonHistory } =
    getDragonStateWithHistory(frame, dragonPath, FORCE_HISTORY_DEPTH);
  const occlusion = getDragonOcclusion(
    dragonState,
    DRAGON_SCREEN_SCALE,
    DRAGON_SVG_X,
    DRAGON_SVG_Y,
  );
  const occlusionHistory = useMemo(
    () =>
      dragonHistory.map((h) =>
        getDragonOcclusion(
          h,
          DRAGON_SCREEN_SCALE,
          DRAGON_SVG_X,
          DRAGON_SVG_Y,
        ),
      ),
    [dragonHistory],
  );

  const box = getScrollContentBox({
    padX: SCROLL_PAD_X,
    padY: SCROLL_PAD_Y,
    width: 1920,
    height: 1080,
  });

  const lines = layoutColumn(
    prepared,
    occlusion,
    box.columnX,
    box.columnX + box.columnW,
    box.columnY,
    box.columnY + box.columnH,
    LINE_HEIGHT,
  );

  return (
    <AbsoluteFill>
      <ScrollBackground padX={SCROLL_PAD_X} padY={SCROLL_PAD_Y} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: SCROLL_PAD_Y + 18,
          textAlign: "center",
          fontFamily: titleFamily,
          fontSize: 38,
          fontStyle: "italic",
          color: "#3a2410",
          letterSpacing: 2,
        }}
      >
        Of the Long Body in the Margins
      </div>
      <VariableTextField
        lines={lines}
        occlusion={occlusion}
        columnScreenX={box.columnX}
        columnScreenY={box.columnY}
        fontFamily={fontFamily}
        fontSize={FONT_SIZE}
        lineHeight={LINE_HEIGHT}
        wdthField={{ radius: FIELD_RADIUS, base: 100, peak: 145 }}
        wghtField={{ radius: FIELD_RADIUS, base: 400, peak: 900 }}
        forceWave={{
          amplitude: 3,
          frequency: 0.45,
          decayRadius: 220,
        }}
        occlusionHistory={occlusionHistory}
      />
      <SkeletonDragon
        state={dragonState}
        svgWidth={DRAGON_SVG_W}
        svgHeight={DRAGON_SVG_H}
        screenX={DRAGON_SVG_X}
        screenY={DRAGON_SVG_Y}
        scale={DRAGON_SCREEN_SCALE}
      />
    </AbsoluteFill>
  );
};
