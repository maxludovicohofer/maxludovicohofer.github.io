import type { LiteYTEmbed } from "lite-youtube-embed";
import Quaternion from "quaternion";

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
    element.style.setProperty("--rotateY", `${yPercent * maxAngle}deg`);
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
        // Front-to-back angle at which the device is normally held
        const line = document.querySelector("span.line")!.firstElementChild!;
        const normalDeviceYAngle = 60;
        const radians = Math.PI / 180;
        return {
          deviceorientation: ({ alpha, beta, gamma }) => {
            const sideToSide = gamma ?? 0;
            const frontToBack = beta ?? 0;
            const deviceRotation = alpha ?? 0;

            const rotation = Quaternion.fromEulerLogical(
              deviceRotation * radians,
              frontToBack * radians,
              -sideToSide * radians,
              "ZXY"
            );

            const [zRot, frontRotation, sideRotation] = rotation.toEuler();

            line.innerHTML = `deviceRot: ${(zRot / radians).toFixed(0)}, xRot: ${(sideRotation / radians).toFixed(0)}, yRot: ${(
              frontRotation / radians
            ).toFixed(0)}`;

            setRotation(
              clamp(sideRotation / maxAngle),
              clamp((frontRotation + normalDeviceYAngle) / maxAngle)
            );
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
export const toTitleCase = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const toCapitalized = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

export const getLinkName = (link: string) =>
  toTitleCase(
    link.startsWith("http")
      ? new URL(link).host.split(".").at(-2)!
      : link.startsWith("mailto:")
        ? link.slice(7)
        : link
  );

//? Math

export const clamp = (value: number, min: number = -1, max: number = 1) =>
  Math.min(Math.max(value, min), max);

//? Integrations

export function isLiteYouTube(element: Element): element is LiteYTEmbed {
  return element.tagName === "LITE-YOUTUBE";
}
