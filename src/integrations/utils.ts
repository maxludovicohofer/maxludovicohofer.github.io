import type { AstroGlobal } from "astro";
import { getRelativeLocaleUrl } from "astro:i18n";
import type { LiteYTEmbed } from "lite-youtube-embed";
import Quaternion from "quaternion";

//? Astro
export const saveScrollPosition = () => {
  const state: {
    index: number;
    scrollX: number;
    scrollY: number;
  } | null = history.state;

  if (!state) return;

  sessionStorage.setItem(
    location.pathname,
    JSON.stringify({
      left: state.scrollX,
      top: state.scrollY,
    } satisfies ScrollToOptions)
  );
};

export const imageExtensions = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
] as const;

export const localizeHref = (astro: AstroGlobal, link?: string) => {
  const locale = astro.currentLocale ?? astro.preferredLocale;

  return locale
    ? getRelativeLocaleUrl(locale, link).replace(/\/$/, "")
    : `/${link}`;
};

//? Tailwind
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

//? HTML
export const rotate3D = async (
  element: HTMLElement
): Promise<{
  [K in Extract<
    keyof (WindowEventMap & DocumentEventMap),
    "deviceorientation" | "pointermove"
  >]?: (
    e: K extends keyof WindowEventMap
      ? WindowEventMap[K]
      : K extends keyof DocumentEventMap
      ? DocumentEventMap[K]
      : never
  ) => void;
}> => {
  const maxAngle = 40;

  const firstRotationDuration = "duration-75";
  element.classList.add(firstRotationDuration);
  let firstRotationTimeout: NodeJS.Timeout;
  const setRotation = (xPercent: number, yPercent: number) => {
    if (
      !firstRotationTimeout &&
      element.classList.contains(firstRotationDuration)
    ) {
      firstRotationTimeout = setTimeout(
        () => element.classList.remove(firstRotationDuration),
        Number(getTailwindClassValue(firstRotationDuration)) + 200
      );
    }

    element.style.setProperty("--rotateX", `${xPercent * maxAngle}deg`);
    element.style.setProperty("--rotateY", `${-yPercent * maxAngle}deg`);
  };

  if (typeof DeviceOrientationEvent === "function") {
    // Check for gyroscope
    const workingGyroscope = new Promise<boolean>((resolve) =>
      window.addEventListener(
        "deviceorientation",
        ({ gamma, beta }) => resolve(gamma !== null || beta !== null),
        {
          once: true,
        }
      )
    );

    if (await workingGyroscope) {
      interface SafariDeviceOrientationEvent extends DeviceOrientationEvent {
        requestPermission: () => Promise<"granted" | "denied">;
      }

      function isSafariGyroscope(
        device: DeviceOrientationEvent | SafariDeviceOrientationEvent
      ): device is SafariDeviceOrientationEvent {
        return !!(device as SafariDeviceOrientationEvent).requestPermission;
      }

      const gyroscope =
        DeviceOrientationEvent as unknown as DeviceOrientationEvent;

      const response = isSafariGyroscope(gyroscope)
        ? await gyroscope.requestPermission()
        : "granted";

      if (response === "granted") {
        // Angle at which the device is normally held
        const normalDeviceRotation = Quaternion.fromAxisAngle(
          [0, -1, 0],
          toRadians(50)
        );

        return {
          deviceorientation: ({ gamma, beta }) => {
            const [, sideRotation, frontRotation] = Quaternion.fromEulerLogical(
              toRadians(screen.orientation.angle),
              toRadians(gamma ?? 0),
              toRadians(beta ?? 0),
              "ZXY"
            )
              .mul(normalDeviceRotation)
              .toEuler();

            setRotation(
              clamp(toDegrees(sideRotation) / maxAngle),
              clamp(toDegrees(frontRotation) / maxAngle)
            );
          },
        };
      }
    }
  }

  return {
    pointermove: ({ x, y }) =>
      setRotation(x / (innerWidth / 2) - 1, y / (innerHeight / 2) - 1),
  };
};

let modalMoveFunction: Awaited<ReturnType<typeof rotate3D>>;

export const activateModal = async (
  content: HTMLElement,
  noAnimation?: boolean
) => {
  const modalSlot = document.querySelector<HTMLDivElement>("div.modal-slot")!;
  modalSlot.classList.add("!pointer-events-auto");

  const backdrop = modalSlot.querySelector<HTMLDivElement>("div.modal-back")!;
  backdrop.classList.add("!opacity-100");

  const backButton =
    modalSlot.querySelector<HTMLButtonElement>("button.modal-back")!;
  backButton.classList.add("!opacity-100");

  const modal = modalSlot.querySelector<HTMLDivElement>("div.modal")!;
  modal.append(content);

  content.className = content.className.replace(
    /(^|\s)(\S*-)*(pointer-events-)\S*/g,
    ""
  );
  content.classList.add("pointer-events-auto");

  if (!noAnimation) {
    modalMoveFunction = await rotate3D(modal);

    if (modalMoveFunction.deviceorientation) {
      addEventListener(
        "deviceorientation",
        modalMoveFunction.deviceorientation
      );
    }

    if (modalMoveFunction.pointermove) {
      document.addEventListener("pointermove", modalMoveFunction.pointermove);
    }
  }
};

export const deactivateModal = () => {
  const modalSlot = document.querySelector<HTMLDivElement>("div.modal-slot")!;
  modalSlot.classList.remove("!pointer-events-auto");

  const backButton =
    modalSlot.querySelector<HTMLButtonElement>("button.modal-back")!;
  backButton.classList.remove("!opacity-100");

  const modal = modalSlot.querySelector<HTMLDivElement>("div.modal")!;
  modal.replaceChildren();

  const backdrop = modalSlot.querySelector<HTMLDivElement>("div.modal-back")!;
  backdrop.classList.remove("!opacity-100");

  if (modalMoveFunction) {
    if (modalMoveFunction.deviceorientation) {
      removeEventListener(
        "deviceorientation",
        modalMoveFunction.deviceorientation
      );
    }

    if (modalMoveFunction.pointermove) {
      document.removeEventListener(
        "pointermove",
        modalMoveFunction.pointermove
      );
    }

    modal.style.setProperty("--rotateX", "0deg");
    modal.style.setProperty("--rotateY", "0deg");
  }
};

export const getPagePosition = (element?: HTMLElement) => {
  let visitingElement = element;

  let left = 0;
  let top = 0;

  while (visitingElement) {
    left +=
      visitingElement.offsetLeft -
      visitingElement.scrollLeft +
      visitingElement.clientLeft;
    top +=
      visitingElement.offsetTop -
      visitingElement.scrollTop +
      visitingElement.clientTop;

    visitingElement = visitingElement.offsetParent as typeof visitingElement;
  }

  return { left: Math.max(left, 0), top: Math.max(top, 0) };
};

//? Tailwind
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

export const getAspectClass = (aspect: string) =>
  aspect === "16/10" ? "aspect-[16/10]" : "aspect-video";

export const getAspectRatio = (aspect: string) =>
  aspect
    .split("/")
    .map(Number)
    .reduce((a, b) => a / b);

//? Markdown

export const cleanMarkdown = (markdown: string) =>
  markdown.replace(/{\/\*.*\*\/}/g, "").trim();

//? Text
export const toSentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

export const toTitleCase = (text: string) =>
  text.split(" ").map(capitalize).join(" ");

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const isRemoteLink = (link: string) => link.startsWith("http");

export const getLinkName = (link: string) => {
  let linkName = "";

  if (isRemoteLink(link)) {
    linkName = new URL(link).host.split(".").at(-2)!;
  } else if (link.startsWith("mailto:")) {
    linkName = link.slice(7);
  } else {
    linkName = link
      .replace(/(^\/+)|(\/+$)/g, "")
      .split("/")
      .at(-1)!
      .replaceAll("-", " ")
      .split(".")[0]!;
  }

  return toSentenceCase(linkName);
};

export const getMaximumWordsInLimit = (text: string, limit: number) => {
  let shortened = text;

  if (shortened.length < limit) return shortened;

  // Shorten page name
  const words = shortened.split(" ");
  shortened = words[0]!;

  // Is one word, must slice
  if (shortened.length > limit) return shortened.slice(0, limit);

  // Multiple words, select the most that can fit
  let index = 1;
  while (true) {
    const joinedWords = `${shortened} ${words[index]}`;
    if (joinedWords.length < limit) shortened = joinedWords;
    else break;
    index++;
  }

  return shortened;
};

//? Math

export const clamp = (value: number, min: number = -1, max: number = 1) =>
  Math.min(Math.max(value, min), max);

const radianUnit = Math.PI / 180;
export const toRadians = (degrees: number) => degrees * radianUnit;

export const toDegrees = (radians: number) => radians / radianUnit;

//? Arrays

export const partition = <T>(
  array: T[],
  filter: (element: T) => any
): [filtered: typeof array, filteredOut: typeof array] => {
  const filtered: typeof array = [];
  const filteredOut: typeof array = [];

  array.forEach((e) => (filter(e) ? filtered : filteredOut).push(e));

  return [filtered, filteredOut];
};

export const groupBy = <T, K extends string>(
  array: T[],
  predicate: (item: T) => K
) =>
  array.reduce((groups, item) => {
    const group = predicate(item);
    groups[group] ??= [];
    groups[group].push(item);
    return groups;
  }, {} as Partial<Record<K, T[]>>);

//? Integrations

export function isLiteYouTube(element: Element): element is LiteYTEmbed {
  return element.tagName === "LITE-YOUTUBE";
}
