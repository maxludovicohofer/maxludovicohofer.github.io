import Quaternion from "quaternion";
import { clamp, toDegrees, toRadians } from "./math";
import { getTailwindClassValue } from "./tailwind";

//? HTML
type Rotate3DFunctions = {
  [K in Extract<
    keyof (WindowEventMap & DocumentEventMap),
    "deviceorientation" | "pointermove"
  >]?: (
    e: K extends keyof WindowEventMap
      ? WindowEventMap[K]
      : K extends keyof DocumentEventMap
        ? DocumentEventMap[K]
        : never,
  ) => void;
};

const rotatingElements = new WeakMap<
  Element | (Window & typeof globalThis) | Document,
  Rotate3DFunctions
>();

let hasGyroscope: boolean;

export const rotate3D = async (
  element: HTMLElement,
  pointerListener?: Element | Document,
) => {
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
        Number(getTailwindClassValue(firstRotationDuration)) + 200,
      );
    }

    element.style.setProperty("--rotateX", `${xPercent * maxAngle}deg`);
    element.style.setProperty("--rotateY", `${-yPercent * maxAngle}deg`);
  };

  // Check once for gyroscope support
  if (hasGyroscope === undefined) {
    hasGyroscope = false;

    if (typeof DeviceOrientationEvent === "function") {
      // Check for gyroscope
      const workingGyroscope = new Promise<boolean>((resolve) =>
        window.addEventListener(
          "deviceorientation",
          ({ gamma, beta }) => resolve(gamma !== null || beta !== null),
          {
            once: true,
          },
        ),
      );

      if (await workingGyroscope) {
        interface SafariDeviceOrientationEvent extends DeviceOrientationEvent {
          requestPermission: () => Promise<"granted" | "denied">;
        }

        function isSafariGyroscope(
          device: DeviceOrientationEvent | SafariDeviceOrientationEvent,
        ): device is SafariDeviceOrientationEvent {
          return !!(device as SafariDeviceOrientationEvent).requestPermission;
        }

        const gyroscope =
          DeviceOrientationEvent as unknown as DeviceOrientationEvent;

        const response = isSafariGyroscope(gyroscope)
          ? await gyroscope.requestPermission()
          : "granted";

        hasGyroscope = response === "granted";
      }
    }
  }

  if (hasGyroscope) {
    if (!rotatingElements.has(window)) {
      // Angle at which the device is normally held
      const normalDeviceRotation = Quaternion.fromAxisAngle(
        [0, -1, 0],
        toRadians(50),
      );

      const rotateWithDeviceOrientation: NonNullable<
        Rotate3DFunctions["deviceorientation"]
      > = ({ gamma, beta }) => {
        const [, sideRotation, frontRotation] = Quaternion.fromEulerLogical(
          toRadians(screen.orientation.angle),
          toRadians(gamma ?? 0),
          toRadians(beta ?? 0),
          "ZXY",
        )
          .mul(normalDeviceRotation)
          .toEuler();

        setRotation(
          clamp(toDegrees(sideRotation) / maxAngle),
          clamp(toDegrees(frontRotation) / maxAngle),
        );
      };

      addEventListener("deviceorientation", rotateWithDeviceOrientation);
      rotatingElements.set(window, {
        deviceorientation: rotateWithDeviceOrientation,
      });
    }
  } else {
    const listener = pointerListener ?? element;
    if (!rotatingElements.has(listener)) {
      const rotateWithPointer: NonNullable<
        Rotate3DFunctions["pointermove"]
      > = ({ x, y }) =>
        setRotation(x / (innerWidth / 2) - 1, y / (innerHeight / 2) - 1);

      listener.addEventListener(
        "pointermove",
        rotateWithPointer as EventListener,
      );
      rotatingElements.set(listener, {
        pointermove: rotateWithPointer,
      });
    }
  }
};

export const stopRotate3D = (
  element: HTMLElement,
  pointerListener?: Element | Document,
) => {
  const windowRotate = rotatingElements.get(window);
  if (windowRotate) {
    if (windowRotate.deviceorientation) {
      removeEventListener("deviceorientation", windowRotate.deviceorientation);
    }
    rotatingElements.delete(window);
  }

  const listener = pointerListener ?? element;
  const listenerRotate = rotatingElements.get(listener);
  if (listenerRotate) {
    if (listenerRotate.pointermove) {
      listener.removeEventListener(
        "pointermove",
        listenerRotate.pointermove as EventListener,
      );
    }
    rotatingElements.delete(listener);
  }

  element.style.setProperty("--rotateX", "0deg");
  element.style.setProperty("--rotateY", "0deg");
};

export const activateModal = async (
  content: HTMLElement,
  noAnimation?: boolean,
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
    "",
  );
  content.classList.add("pointer-events-auto");

  if (!noAnimation) {
    await rotate3D(
      modal.classList.contains("rotate-3d")
        ? modal
        : modal.closest<HTMLElement>(".rotate-3d")!,
      document,
    );
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

  stopRotate3D(
    modal.classList.contains("rotate-3d")
      ? modal
      : modal.closest<HTMLElement>(".rotate-3d")!,
    document,
  );
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

export const debounce = <F extends (...args: any) => any>(
  func: F,
  timeout = 300,
) => {
  let timer: NodeJS.Timeout;

  return (...args: Parameters<typeof func>) => {
    clearTimeout(timer);

    return new Promise<Awaited<ReturnType<F>>>((resolve) => {
      timer = setTimeout(async () => {
        resolve(await func.apply(this, args));
      }, timeout);
    });
  };
};
