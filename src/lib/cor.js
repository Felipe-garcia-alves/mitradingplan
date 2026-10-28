// Mi Trading Plan - transparência de cores
//
// alfa(cor, "33") equivale ao antigo cor+"33" (hex com alfa), mas também
// funciona quando a cor é uma variável do tema, como "var(--accent)".
export function alfa(cor, hex) {
  const p = Math.round(parseInt(hex, 16) / 2.55);
  return `color-mix(in srgb, ${cor} ${p}%, transparent)`;
}
