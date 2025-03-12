export const removeWatashiWa = (text: string) =>
  text.replaceAll(/私は、*/g, "");
