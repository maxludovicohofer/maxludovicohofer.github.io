import Quaternion from "quaternion";
import { getTailwindClassValue } from "./tailwind";
import { clamp, toDegrees, toRadians } from "./math";

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
