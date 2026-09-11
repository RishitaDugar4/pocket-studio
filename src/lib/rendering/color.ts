/** Approximate black-body colour for a colour temperature, for light controls. */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.min(Math.max(kelvin, 1000), 15000) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (t - 60) ** -0.1332047592;
    g = 288.1221695283 * (t - 60) ** -0.0755148492;
    b = 255;
  }

  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return [clamp(r), clamp(g), clamp(b)];
}

export function kelvinToHex(kelvin: number): string {
  const [r, g, b] = kelvinToRgb(kelvin);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}
