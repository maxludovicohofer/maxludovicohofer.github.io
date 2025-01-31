import type { LiteYTEmbed } from "lite-youtube-embed";

export function isLiteYouTube(element: Element): element is LiteYTEmbed {
  return element.tagName === "LITE-YOUTUBE";
}
