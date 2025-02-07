import type Video from "@components/ui/Video.astro";
import type { ComponentProps } from "astro/types";

export const makeHighlight = (discrete?: boolean) => {
  return {
    highlightClass: `col-span-full ${
      discrete ? "" : "lg:h-[22.6rem] lg:max-h-none"
    }`,
    importance: (discrete ? "h1" : "content-list-highlight") as TextImportance,
  };
};

export type TextTag =
  | "p"
  | "div"
  | "b"
  | "u"
  | "em"
  | "span"
  | "h1"
  | "h2"
  | "h3"
  | "h4";

export type TextImportance =
  | "content-list-highlight"
  | "small"
  | "container"
  | "button"
  | "button-cta"
  | "markdown";

export const getTextClass = (
  size: TextTag | TextImportance,
  format?: "heading" | "detail" | "base"
) => {
  const headings = [
    "text-zinc-950 dark:text-zinc-100 print:text-cyan-700",
    "prose-headings:text-zinc-950 prose-headings:dark:text-zinc-100 prose-headings:print:text-cyan-700",
  ] as const;

  const formats: Record<NonNullable<typeof format>, string> = {
    heading: headings[0],
    detail: "text-zinc-400 leading-6",
    base: "text-zinc-500 dark:text-zinc-300",
  };

  const realHeadingFormat = "font-semibold print:font-normal text-balance";

  const elements: Record<
    Exclude<typeof size, "markdown">,
    { classes?: string; prose?: string; format?: keyof typeof formats }
  > = {
    p: {
      classes: "text-xl 2xl:text-3xl",
      prose: "prose-p:text-xl prose-p:2xl:text-3xl empty:prose-p:hidden",
    },
    div: {},
    span: {},
    b: { classes: "font-normal" },
    u: {},
    em: {},
    h1: {
      classes: `text-3xl 2xl:text-4xl ${realHeadingFormat}`,
      prose:
        "prose-h1:text-3xl prose-h1:2xl:text-4xl prose-h1:-mb-2 prose-h1:font-semibold prose-h1:print:font-normal prose-h1:text-balance",
    },
    h2: {
      classes: `text-2xl 2xl:text-3xl ${realHeadingFormat}`,
      prose:
        "prose-h2:text-2xl prose-h2:2xl:text-3xl prose-h2:mt-10 prose-h2:mb-2 prose-h2:font-semibold prose-h2:print:font-normal prose-h2:text-balance",
    },
    h3: {
      classes: realHeadingFormat,
      prose:
        "prose-h3:text-xl prose-h3:2xl:text-2xl prose-h3:mt-0 prose-h3:mb-2 prose-h3:font-semibold prose-h3:print:font-normal prose-h3:text-balance",
    },
    h4: { classes: "italic font-normal", prose: "prose-h4:font-normal" },
    container: {
      classes: `text-2xl lg:text-3xl 2xl:text-4xl ${realHeadingFormat}`,
      format: "heading",
    },
    "content-list-highlight": {
      classes: `text-3xl lg:text-4xl 2xl:text-5xl ${realHeadingFormat}`,
      format: "heading",
    },
    small: {
      classes: "text-sm 2xl:text-xl",
    },
    button: {
      classes: "text-base 2xl:text-3xl",
    },
    "button-cta": {
      classes: "text-xl 2xl:text-3xl",
    },
  };

  if (size === "markdown") {
    return `max-w-full prose dark:prose-invert ${headings[1]} ${Object.values(
      elements
    )
      .map(({ prose }) => prose)
      .join(
        " "
      )} prose-li:list-[kannada] prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-500 prose-pre:rounded-3xl prose-pre:whitespace-pre-wrap prose-pre:text-xs prose-pre:sm:text-base prose-pre:2xl:text-2xl`;
  }

  return [
    elements[size].classes,
    formats[
      format ??
        elements[size].format ??
        (size.startsWith("h") ? "heading" : "base")
    ],
  ].join(" ");
};

export const removeFromClasses = (className: string, remove: string[]) =>
  className.replace(
    new RegExp(
      `(^|\\s)(\\S*[:-])*(${remove.map((part) => `${part}-`).join("|")})\\S*`,
      "g"
    ),
    ""
  );

export const getTailwindValue = (element: Element, key: string) => {
  const tailwindClass = Array.from(element.classList).find((part) =>
    part.startsWith(key)
  );

  return tailwindClass && getTailwindClassValue(tailwindClass);
};

export const getTailwindClassValue = (tailwindClass: string) =>
  tailwindClass
    .split("-")
    .at(-1)!
    .replace(/[[\]']+/g, "");

export const hasClass = (property: string, className: string) =>
  className.split(" ").includes(property);

export const switchClasses = (
  element: Element,
  condition: boolean,
  trueClasses: string[],
  falseClasses: string[]
) => {
  element.classList.remove(...trueClasses, ...falseClasses);
  element.classList.add(...(condition ? trueClasses : falseClasses));
};

export const getAspectClass = (
  aspect: NonNullable<ComponentProps<typeof Video>["youTubeInfo"]["aspect"]>
) => {
  switch (aspect) {
    case "16/10":
      return "aspect-[16/10]";
    case "16/9":
      return "aspect-video";
    case "1/1":
      return "aspect-square";
  }
};

export const getAspectRatio = (aspect: string) =>
  aspect
    .split("/")
    .map(Number)
    .reduce((a, b) => a / b);
