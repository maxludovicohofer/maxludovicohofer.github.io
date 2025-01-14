import type { LiteYTEmbed } from "lite-youtube-embed";

//? HTML
export const rotate3D = async (
  element: HTMLElement
): Promise<{
  [K in Extract<
    keyof (WindowEventMap & DocumentEventMap),
    "deviceorientation" | "mousemove"
  >]?: (
    e: K extends keyof WindowEventMap
      ? WindowEventMap[K]
      : K extends keyof DocumentEventMap
      ? DocumentEventMap[K]
      : never
  ) => void;
}> => {
  const maxAngle = 15;

  const setRotation = (xPercent: number, yPercent: number) => {
    element.style.setProperty("--rotateX", `${xPercent * maxAngle}deg`);
    element.style.setProperty("--rotateY", `${yPercent * maxAngle}deg`);
  };

  // Check for gyroscope
  const gyroscope = DeviceOrientationEvent as unknown as
    | DeviceOrientationEvent
    | undefined;

  if (gyroscope) {
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

      const response = isSafariGyroscope(gyroscope)
        ? await gyroscope.requestPermission()
        : "granted";

      if (response === "granted") {
        // Front-to-back angle at which the device is normally held
        const normalDeviceYAngle = 30;
        return {
          deviceorientation: ({ gamma, beta }) => {
            const sideToSide = gamma ?? 0;
            const frontToBack = beta ?? 0;

            if (screen.orientation.type.startsWith("portrait")) {
              setRotation(
                clamp(sideToSide / maxAngle),
                clamp(-(frontToBack - normalDeviceYAngle) / maxAngle)
              );
            } else {
              setRotation(
                clamp(-frontToBack / maxAngle),
                clamp((sideToSide - normalDeviceYAngle) / maxAngle)
              );
            }
          },
        };
      }
    }
  }

  return {
    mousemove: ({ clientX, clientY }) =>
      setRotation(
        clientX / (innerWidth / 2) - 1,
        -(clientY / (innerHeight / 2) - 1)
      ),
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
    } else {
      document.addEventListener("mousemove", modalMoveFunction.mousemove!);
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
    } else {
      document.removeEventListener("mousemove", modalMoveFunction.mousemove!);
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

export const getTailwindValue = (element: Element, key: string) =>
  Array.from(element.classList)
    .find((part) => part.startsWith(key))
    ?.split("-")
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
export const toTitleCase = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const toCapitalized = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

export const getLinkName = (link: string) =>
  toTitleCase(new URL(link).host.split(".").at(-2)!);

//? Math

export const clamp = (value: number, min: number = -1, max: number = 1) =>
  Math.min(Math.max(value, min), max);

//? Integrations

export function isLiteYouTube(element: Element): element is LiteYTEmbed {
  return element.tagName === "LITE-YOUTUBE";
}
