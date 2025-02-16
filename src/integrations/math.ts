export const clamp = (value: number, min: number = -1, max: number = 1) =>
  Math.min(Math.max(value, min), max);

const radianUnit = Math.PI / 180;
export const toRadians = (degrees: number) => degrees * radianUnit;

export const toDegrees = (radians: number) => radians / radianUnit;

export const remap = (
  value: number,
  fromMax: number = 1,
  toMax: number = 1,
  fromMin: number = 0,
  toMin: number = 0
) => toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin);
