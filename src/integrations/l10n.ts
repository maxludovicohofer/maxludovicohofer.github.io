export const removeWatashiWa = (text: string) =>
  text.replaceAll(/私は、*/g, "");

export const removeWatashiNo = (text: string) => text.replaceAll(/私の/g, "");
