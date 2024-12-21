import type { RehypePlugins } from "astro";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import type { HTMLAttributes } from "astro/types";

export interface LinkProps {
  href?: string | undefined;
  className?: string | undefined;
  navigate?: boolean | undefined;
  noStyle?: boolean;
  prefetch?: "viewport" | "load" | "hover";
}

export const linkProperties = ({
  href,
  className = "",
  navigate,
  noStyle,
  prefetch = "viewport",
}: LinkProps) =>
  ({
    class: `${className} ${
      noStyle
        ? ""
        : "underline hover:text-yellow-400 active:text-yellow-600 dark:hover:text-yellow-200 dark:active:text-yellow-400 hover:scale-125 active:scale-90 duration-150"
    }`,
    href,
    "data-astro-prefetch": prefetch,
    target: navigate ? "_self" : "_blank",
    rel: navigate ? undefined : "noopener noreferrer",
  } satisfies HTMLAttributes<"a">);

export const rehypeLink: RehypePlugins[number] = () => {
  return (tree) => {
    visit(tree, "element", (element: Element) => {
      if (
        element.tagName === "a" &&
        element.properties.href?.toString().startsWith("http")
      ) {
        // Set link properties
        element.properties = linkProperties({
          href: element.properties.href.toString(),
        });
      }
    });
  };
};
