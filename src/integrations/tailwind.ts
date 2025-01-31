import type Video from "@components/ui/Video.astro";
import type { ComponentProps } from "astro/types";

export const makeHighlight = (discrete?: boolean) => {
  return {
    highlightClass: `col-span-full ${
      discrete ? "" : "lg:h-[22.6rem] lg:max-h-none"
    }`,
    importance: (discrete
      ? "content-list-item"
      : "content-list-highlight") as Parameters<typeof getTextClass>[0],
  };
};

export const getTextClass = (
  importance:
    | "low"
    | "medium"
    | "high"
    | "post-title"
    | "content-list-item"
    | "content-list-highlight"
    | "button"
    | "button-cta"
) => {
  switch (importance) {
    case "content-list-item":
      return "text-3xl 2xl:text-4xl";
    case "content-list-highlight":
      return "text-3xl lg:text-4xl 2xl:text-5xl";
    case "post-title":
      return "text-3xl 2xl:text-4xl";
    case "button":
      return "text-base 2xl:text-3xl";
    case "button-cta":
      return "text-xl 2xl:text-3xl";
    case "low":
      return "text-2xl 2xl:text-3xl";
    case "medium":
      return "text-2xl lg:text-3xl 2xl:text-4xl";
    case "high":
      return "text-3xl lg:text-5xl 2xl:text-8xl";
  }
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
) =>
  aspect === "16/10"
    ? "aspect-[16/10]"
    : aspect === "16/9"
      ? "aspect-video"
      : "aspect-square";

export const getAspectRatio = (aspect: string) =>
  aspect
    .split("/")
    .map(Number)
    .reduce((a, b) => a / b);
