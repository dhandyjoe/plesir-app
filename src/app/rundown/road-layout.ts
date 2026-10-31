// Tata letak "jalan" rundown: posisi kartu dan bentuk garis ditentukan seed, jadi stabil saat reload
// tapi berbeda tiap generate dan tiap hari.
export const CARD_W = 288;
export const CARD_H = 272;
export const MARKER_W = 112;
export const ICON = 56;

const MAX_OFFSET = 96;
const HEIGHT = CARD_H + 2 * (MAX_OFFSET + 16);
const MID_Y = HEIGHT / 2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Offset vertikal (px dari tengah) tiap kartu menurut gaya yang dipilih seed. */
function offsets(count: number, rand: () => number) {
  const style = Math.floor(rand() * 3);
  const sign = rand() < 0.5 ? 1 : -1;
  const between = (min: number, max: number) => min + rand() * (max - min);

  if (style === 0) {
    const amp = between(56, MAX_OFFSET);
    return Array.from({ length: count }, (_, i) => (i % 2 ? -sign : sign) * amp);
  }
  if (style === 1) {
    return Array.from({ length: count }, (_, i) => {
      const t = count > 1 ? i / (count - 1) : 0.5;
      return sign * (-80 + 160 * t) + between(-14, 14);
    });
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    let y = between(-MAX_OFFSET, MAX_OFFSET);
    // Selisih minimal antar kartu agar jalan tidak terlihat lurus.
    for (let tries = 0; i > 0 && Math.abs(y - result[i - 1]) < 48 && tries < 20; tries++) {
      y = between(-MAX_OFFSET, MAX_OFFSET);
    }
    result.push(y);
  }
  return result;
}

function segmentPath(ax: number, ay: number, bx: number, by: number, rand: () => number) {
  const dy = by - ay;
  const r = Math.min(24, Math.abs(dy) / 2, (bx - ax) / 4);
  if (rand() < 0.5 && Math.abs(dy) >= 40) {
    const x = (ax + bx) / 2;
    const s = Math.sign(dy);
    return {
      d: `M ${ax} ${ay} H ${x - r} Q ${x} ${ay} ${x} ${ay + s * r} V ${by - s * r} Q ${x} ${by} ${x + r} ${by} H ${bx}`,
      midX: x,
    };
  }
  const k = (bx - ax) * (0.35 + rand() * 0.35);
  return {
    d: `M ${ax} ${ay} C ${ax + k} ${ay}, ${bx - k} ${by}, ${bx} ${by}`,
    midX: (ax + bx) / 2,
  };
}

export function buildRoad(count: number, seed: number) {
  const rand = mulberry32(seed);
  const offs = offsets(count, rand);
  const startY = MID_Y + (rand() * 2 - 1) * 64;
  const endY = MID_Y + (rand() * 2 - 1) * 64;

  let x = MARKER_W + 152 + rand() * 72;
  const cards = offs.map((off) => {
    const card = { x, cy: MID_Y + off };
    x += CARD_W + 152 + rand() * 72;
    return card;
  });
  const finishX = x; // x sudah berada setelah kartu terakhir + jarak

  const points = [
    { in: 0, out: MARKER_W / 2 + ICON / 2, y: startY },
    ...cards.map((c) => ({ in: c.x, out: c.x + CARD_W, y: c.cy })),
    { in: finishX + MARKER_W / 2 - ICON / 2, out: 0, y: endY },
  ];
  const segments = points.slice(0, -1).map((from, i) => {
    const to = points[i + 1];
    const { d, midX } = segmentPath(from.out, from.y, to.in, to.y, rand);
    return { d, midX, midY: (from.y + to.y) / 2 };
  });

  return {
    width: finishX + MARKER_W,
    height: HEIGHT,
    startY,
    endY,
    cards,
    finishX,
    segments,
  };
}
