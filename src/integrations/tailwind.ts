import type Video from "@components/ui/Video.astro";
import type { ComponentProps } from "astro/types";

export const makeHighlight = (discrete?: boolean) => {
  return {
    highlightClass: `col-span-full ${
      discrete ? "" : "lg:h-[23.4rem] 2xl:h-[33.6rem] lg:max-h-none"
    }`,
    importance: (discrete
      ? ("h1" as const)
      : ("content-list-highlight" as const)) satisfies Parameters<
      typeof getTextClass
    >[0],
  };
};

export type TextTag =
  | "p"
  | "div"
  | "b"
  | "u"
  | "li"
  | "em"
  | "span"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5";

export type TextSize =
  | "content-list-highlight"
  | "small"
  | "container"
  | "button"
  | "button-icon"
  | "markdown";

export type TextFormat =
  | "heading"
  | "subheading"
  | "detail"
  | "base"
  | "branded"
  | "branded-button"
  | "none";

export const getTextClass = (size: TextTag | TextSize, format?: TextFormat) => {
  const headingsBase = [
    "text-zinc-950 dark:text-zinc-100 print:break-after-avoid",
    "prose-headings:text-zinc-950 dark:prose-headings:text-zinc-100 prose-headings:print:break-after-avoid",
  ] as const;

  const formats: Record<NonNullable<typeof format>, string> = {
    heading: `${headingsBase[0]} font-semibold text-balance`,
    subheading: `${headingsBase[0]} font-normal italic`,
    detail: "text-zinc-400 leading-6",
    base: "text-zinc-500 dark:text-zinc-300",
    branded:
      "text-transparent [text-shadow:_0_0_0_var(--tw-shadow-color)] shadow-yellow-600 dark:shadow-yellow-200 print:shadow-black",
    ["branded-button"]:
      "text-transparent [text-shadow:_0_0_0_var(--tw-shadow-color)] shadow-yellow-200 dark:shadow-yellow-600 print:shadow-black",
    none: "",
  };

  const blockClasses = "text-xl 2xl:text-3xl print:text-base";

  const elements: Record<
    typeof size,
    { classes?: string; prose?: string; format?: keyof typeof formats }
  > = {
    p: {
      classes: `${blockClasses} print:break-inside-avoid-page`,
      prose:
        "prose-p:text-xl prose-p:2xl:text-3xl prose-p:print:text-xs prose-p:empty:hidden prose-p:print:break-inside-avoid-page",
    },
    div: { classes: blockClasses },
    markdown: {
      prose: blockClasses,
    },
    span: {},
    b: { classes: "font-normal" },
    u: {},
    li: {
      classes: "marker:text-zinc-400 dark:marker:text-zinc-500",
      prose: "prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-500",
    },
    em: {},
    h1: {
      classes: "text-3xl 2xl:text-4xl",
      prose:
        "prose-h1:text-3xl prose-h1:2xl:text-4xl prose-h1:-mb-2 prose-h1:font-semibold prose-h1:text-balance",
    },
    h2: {
      classes: "text-2xl 2xl:text-3xl",
      prose:
        "prose-h2:text-2xl prose-h2:2xl:text-3xl prose-h2:mt-10 prose-h2:mb-2 prose-h2:font-semibold prose-h2:text-balance",
    },
    h3: {
      prose:
        "prose-h3:text-xl prose-h3:2xl:text-2xl prose-h3:mt-0 prose-h3:mb-2 prose-h3:font-medium prose-h3:text-balance",
    },
    h4: {
      classes: "-mt-2",
      prose: "prose-h4:-mt-2 prose-h4:italic prose-h4:font-normal",
      format: "subheading",
    },
    h5: {
      prose: "prose-h5:font-semibold prose-h5:text-balance",
    },
    container: {
      classes: "text-2xl lg:text-3xl 2xl:text-4xl",
      format: "heading",
    },
    "content-list-highlight": {
      classes: "text-3xl lg:text-4xl 2xl:text-5xl",
      format: "heading",
    },
    small: {
      classes: "text-sm 2xl:text-xl",
    },
    button: {
      classes: "text-base 2xl:text-3xl",
      format: "none",
    },
    "button-icon": {
      classes: "text-4xl lg:text-3xl 2xl:text-4xl",
      format: "none",
    },
  };

  if (size === "markdown") {
    return `max-w-full prose dark:prose-invert ${
      headingsBase[1]
    } ${Object.values(elements)
      .map(({ prose }) => prose)
      .filter((text) => !!text)
      .join(" ")} ${
      formats.base
    } prose-pre:rounded-3xl prose-pre:whitespace-pre-wrap prose-pre:text-xs prose-pre:sm:text-base prose-pre:2xl:text-2xl prose-p:has-[code]:prose-code:bg-[#24292e] prose-p:has-[code]:prose-code:text-[#e1e4e8] prose-p:has-[code]:prose-code:rounded-3xl prose-p:has-[code]:prose-code:before:hidden prose-p:has-[code]:prose-code:after:hidden prose-p:has-[code]:prose-code:font-normal prose-p:has-[code]:prose-code:px-1.5 prose-p:has-[code]:prose-code:2xl:px-2.5 prose-p:has-[code]:prose-code:py-0.5 prose-ul:print:break-inside-avoid-page prose-ul:print:has-[li:nth-child(6)]:break-inside-auto prose-ol:print:break-inside-avoid-page prose-ol:print:has-[li:nth-child(6)]:break-inside-auto prose-th:border-2 prose-th:py-2 prose-th:px-4 prose-td:border-2 prose-td:px-4 prose-tr:print:break-inside-avoid-page`;
  }

  return `${elements[size].classes ?? ""} ${
    formats[
      format ??
        elements[size].format ??
        (size.startsWith("h") ? "heading" : "base")
    ]
  }`;
};

export const removeFromClasses = (className: string, remove: string[]) =>
  className.replace(
    new RegExp(
      `(^|\\s)(\\S*[:-])*(${remove.map((part) => `${part}-`).join("|")})\\S*`,
      "g",
    ),
    "",
  );

export const getTailwindValue = (element: Element, key: string) =>
  getTailwindValueFromClassList(Array.from(element.classList), key);

export const getTailwindValueFromClass = (
  className: string | null,
  key: string,
) => getTailwindValueFromClassList(className?.split(" ") ?? [], key);

export const getTailwindValueFromClassList = (
  classList: string[],
  key: string,
) => {
  const tailwindClass = classList.find((part) => part.startsWith(key));

  return tailwindClass && getTailwindClassValue(tailwindClass);
};

export const getTailwindClassValue = (tailwindClass: string) => {
  const classParts = tailwindClass.split("-");
  return classParts[classParts.length - 1]!.replaceAll(/[[\]']+/g, "");
};

export const hasClass = (property: string, className: string) =>
  className.split(" ").includes(property);

export const switchClasses = (
  element: Element,
  condition: boolean,
  trueClasses: string[],
  falseClasses: string[],
) => {
  element.classList.remove(...trueClasses, ...falseClasses);
  element.classList.add(...(condition ? trueClasses : falseClasses));
};

export const getAspectClass = (
  aspect: NonNullable<ComponentProps<typeof Video>["youTubeInfo"]["aspect"]>,
) => {
  switch (aspect) {
    case "16/9":
      return "aspect-video";
    case "16/10":
      return "aspect-[16/10]";
    case "1/1":
      return "aspect-square";
    case "3/4":
      return "aspect-[3/4]";
    default:
      return "aspect-video";
  }
};

export const getAspectRatio = (aspect: string) =>
  aspect
    .split("/")
    .map(Number)
    .reduce((a, b) => a / b);
