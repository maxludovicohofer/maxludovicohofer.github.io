export const clamp = (value: number, min = -1, max = 1) =>
  Math.min(Math.max(value, min), max);

const radianUnit = Math.PI / 180;
export const toRadians = (degrees: number) => degrees * radianUnit;

export const toDegrees = (radians: number) => radians / radianUnit;

export const remap = (
  value: number,
  fromMax = 1,
  toMax = 1,
  fromMin = 0,
  toMin = 0,
) => toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin);

export const roundTo = (
  value: number,
  step: number,
  roundFunction = Math.round,
) => {
  const inverse = 1 / step;
  return (roundFunction ?? Math.round)(value * inverse) / inverse;
};

export const lerp = (from = 0, to = 0, blend = 0) => from + blend * (to - from);
