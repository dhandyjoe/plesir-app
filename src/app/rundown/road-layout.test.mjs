import assert from "node:assert/strict";
import test from "node:test";
import { CARD_W, MARKER_W, buildRoad } from "./road-layout.ts";

test("buildRoad: seed sama menghasilkan tata letak identik", () => {
  assert.deepEqual(buildRoad(4, 123), buildRoad(4, 123));
});

test("buildRoad: seed berbeda menghasilkan tata letak berbeda", () => {
  assert.notDeepEqual(buildRoad(4, 1), buildRoad(4, 2));
});

test("buildRoad: satu ruas per sambungan (stop + penanda awal/akhir)", () => {
  for (const count of [0, 1, 2, 6]) {
    const road = buildRoad(count, 7);
    assert.equal(road.cards.length, count);
    assert.equal(road.segments.length, count + 1);
  }
});

test("buildRoad: kartu berurutan tanpa tumpang tindih dan masuk ke area gambar", () => {
  for (let seed = 0; seed < 50; seed++) {
    const road = buildRoad(5, seed);
    road.cards.forEach((card, i) => {
      if (i > 0) assert.ok(card.x >= road.cards[i - 1].x + CARD_W, `seed ${seed} kartu ${i}`);
      assert.ok(card.cy > 0 && card.cy < road.height);
    });
    assert.ok(road.finishX >= road.cards.at(-1).x + CARD_W);
    assert.equal(road.width, road.finishX + MARKER_W);
    assert.ok(road.startY > 0 && road.startY < road.height);
    assert.ok(road.endY > 0 && road.endY < road.height);
  }
});

test("buildRoad: path ruas valid dan nilai numerik terbatas", () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const seg of buildRoad(3, seed).segments) {
      assert.match(seg.d, /^M [\d.\- ]+ (H|C) /);
      assert.ok(!/NaN|undefined|Infinity/.test(seg.d), seg.d);
      assert.ok(Number.isFinite(seg.midX) && Number.isFinite(seg.midY));
    }
  }
});
