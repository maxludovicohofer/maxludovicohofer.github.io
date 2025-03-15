type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
};

const definedLocales = ["en", "ja"] as const;
export const locales = definedLocales as Mutable<typeof definedLocales>;
export const defaultLocale = locales[0];

export const myName = { name: "Max Ludovico", surname: "Hofer" };

export const getShortName = (fullName: string[]) =>
  fullName.map((part) => part.split(" ")[0]);
