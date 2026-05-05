/**
 * BallDropDemo — 球落入卷轴文字，涟漪从球心向外扩散
 *
 * 5 秒 / 30fps / 1920x1080
 *   - 0~30 帧：球从顶部下落到画面中央
 *   - 30 帧落地（landFrame=30）
 *   - 30~150 帧：涟漪从球心扩散，文字水波纹推开
 *
 * 核心简化（对比 InkScrollDemo）：
 *   - 1 个 occlusion（落地后的球）vs 30 段链
 *   - 1 个时间源（landFrame）vs 24 帧历史
 *   - 标准行波公式（清晰同心圆）vs 多源累加（噪音）
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
  FallingBall,
  getBallState,
  getBallOcclusion,
} from "../materials/FallingBall";
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

const BALL_RADIUS = 90;       // occlusion 半径（让路用）
const BALL_VISUAL_RADIUS = 38; // 视觉球半径（渲染用）
const LAND_FRAME = 60;
const LAND_X = 1920 / 2;
const LAND_Y = 1080 / 2 + 30;
const START_X = 1920 / 2;
const START_Y = -BALL_RADIUS;

const FIELD_RADIUS = 320;

export const BallDropDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const fontFamily = ROBOTO_SERIF_VARIABLE.family;
  const fontString = `${FONT_SIZE}px ${fontFamily}`;
  const prepared = useMemo(
    () => prepareWithSegments(ARTICLE_TEXT, fontString),
    [fontString],
  );

  const ballState = getBallState(frame, {
    startX: START_X,
    startY: START_Y,
    landX: LAND_X,
    landY: LAND_Y,
    landFrame: LAND_FRAME,
    r: BALL_RADIUS,
  });
  const occlusion = getBallOcclusion(ballState);

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
        Of Stones Dropped Upon a Page
      </div>
      <VariableTextField
        lines={lines}
        occlusion={occlusion}
        columnScreenX={box.columnX}
        columnScreenY={box.columnY}
        fontFamily={fontFamily}
        fontSize={FONT_SIZE}
        lineHeight={LINE_HEIGHT}
        wdthField={{ radius: FIELD_RADIUS, base: 100, peak: 100 }}
        wghtField={{ radius: FIELD_RADIUS, base: 400, peak: 400 }}
        ripple={{
          cx: LAND_X,
          cy: LAND_Y,
          currentFrame: frame,
          sourceFrame: LAND_FRAME,
          amplitude: 14,
          wavelength: 100,
          waveSpeed: 12,
          decayDistance: 400,
          decayTime: 40,
        }}
      />
      <FallingBall state={ballState} visualR={BALL_VISUAL_RADIUS} />
    </AbsoluteFill>
  );
};
