export const clamp = (value: number, min: number = -1, max: number = 1) =>
  Math.min(Math.max(value, min), max);

const radianUnit = Math.PI / 180;
export const toRadians = (degrees: number) => degrees * radianUnit;

export const toDegrees = (radians: number) => radians / radianUnit;
