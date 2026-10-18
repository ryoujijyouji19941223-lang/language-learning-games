import { places } from "../data.js";
import { dwellings } from "./layout.js";
const parcels = [...places.filter((p) => p.w), ...dwellings];
const smooth = (a, b, t) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export function baseHeight(x, z) {
  if (z > 47) return 1.55 * (1 - smooth(47, 66, z)) + 0.05;
  return (
    1.6 +
    8.4 * smooth(22, -49, z) +
    0.35 * Math.sin(x * 0.035) * smooth(25, -45, z)
  );
}
export function groundHeight(x, z) {
  let h = baseHeight(x, z);
  for (const b of parcels) {
    const outside = Math.max(
      Math.abs(x - b.x) - b.w / 2,
      Math.abs(z - b.z) - b.d / 2,
    );
    if (outside < 2.2) {
      const blend = 1 - smooth(0.5, 2.2, outside);
      h = h * (1 - blend) + baseHeight(b.x, b.z) * blend;
    }
  }
  return h;
}
export function safeTownPosition(pos) {
  const x = Math.max(-70, Math.min(70, pos.x)),
    z = Math.max(-73, Math.min(64, pos.z));
  if (
    [...places.filter((p) => p.w), ...dwellings].some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + 0.35 &&
        Math.abs(z - b.z) < b.d / 2 + 0.35,
    )
  )
    return { x: 0, z: Math.max(-59, Math.min(43, z)) };
  return { x, z };
}
