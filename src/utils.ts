//? HTML
export const activateModal = (content: HTMLElement) => {
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
};

export const getPagePosition = (element?: HTMLElement) => {
  let visitingElement = element;

  let left = 0;
  let top = 0;

  while (visitingElement) {
    left += (visitingElement.offsetLeft - visitingElement.scrollLeft + visitingElement.clientLeft);
    top += (visitingElement.offsetTop - visitingElement.scrollTop + visitingElement.clientTop);

    visitingElement = visitingElement.offsetParent as typeof visitingElement;
  }

  return { left, top };
}

//? Text
export const toTitleCase = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const removeFromClass = (className: string, remove: string[]) =>
  className.replace(
    new RegExp(
      `(^|\\s)(\\S*[:-])*(${remove.map((part) => `${part}-`).join("|")})\\S*`,
      "g"
    ),
    ""
  );

export const getCssValue = (element: Element, key: string) =>
  Array.from(element.classList)
    .find((part) => part.startsWith(key))
    ?.split("-")
    .at(-1)!
    .replace(/[[\]']+/g, "");

export const hasProperty = (property: string, className: string) =>
  className.split(" ").includes(property);
