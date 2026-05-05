/**
 * variableFontLoader — Variable Font 加载器
 *
 * 为什么要这个：
 *   @remotion/google-fonts 加载的是单字重静态字体（如 Roboto Serif wght 400），
 *   不带 wdth/opsz 等 axis。要用 variable font 必须直接 link Google Fonts 完整 axis URL。
 *
 * 用法（在组件文件 module-level 调用一次）：
 *   ensureVariableFontLoaded({
 *     family: "Roboto Serif",
 *     googleFontsCss2Url: "https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wdth,wght@8..144,50..150,100..900&display=block",
 *   });
 *
 * 内部用 Remotion delayRender + document.fonts.ready 保证渲染前字体加载完。
 */
import { continueRender, delayRender } from "remotion";

const promiseByUrl = new Map<string, Promise<void>>();
const handleByUrl = new Map<string, number>();

export type VariableFontSpec = {
  /** 字体的 family name，如 "Roboto Serif" */
  family: string;
  /** Google Fonts css2 URL（带 axis 范围） */
  googleFontsCss2Url: string;
};

export function ensureVariableFontLoaded(spec: VariableFontSpec): void {
  if (typeof document === "undefined") return;
  const url = spec.googleFontsCss2Url;
  if (promiseByUrl.has(url)) return;

  const handle = delayRender(`Variable font: ${spec.family}`);
  handleByUrl.set(url, handle);

  const p = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => resolve());
      } else {
        resolve();
      }
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });

  promiseByUrl.set(url, p);
  p.then(() => continueRender(handle));
}

/** 预设：Roboto Serif Variable，支持 opsz + wdth + wght */
export const ROBOTO_SERIF_VARIABLE: VariableFontSpec = {
  family: "Roboto Serif",
  googleFontsCss2Url:
    "https://fonts.googleapis.com/css2?family=Roboto+Serif:opsz,wdth,wght@8..144,50..150,100..900&display=block",
};

/** 预设：Roboto Flex（13 轴 sans-serif） */
export const ROBOTO_FLEX_VARIABLE: VariableFontSpec = {
  family: "Roboto Flex",
  googleFontsCss2Url:
    "https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=block",
};
