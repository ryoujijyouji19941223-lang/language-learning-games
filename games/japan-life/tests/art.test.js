import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine.js";
import { groundHeight, safeTownPosition } from "../src/art/height.js";
import { person, posePerson } from "../src/art/characters.js";
import { dwellings } from "../src/art/layout.js";
import { residents, destinations } from "../src/data.js";
test("地形が海から丘へ上がり、宅地・入口・配送先が住宅を参照する", () => {
  assert.ok(groundHeight(0, -35) - groundHeight(0, 43) > 5);
  assert.ok(groundHeight(0, 64) < 0.2);
  assert.ok(
    destinations.every(
      (d) => dwellings.some((b) => b.id === d.buildingId) && d.unitId,
    ),
  );
  assert.ok(residents.every((p) => p.buildingId && p.unitId));
  assert.deepEqual(safeTownPosition({ x: -43, z: -26 }), { x: 0, z: -26 });
});
test("新規開始は指定した月日、旧セーブの日付・財産・家具・期限を変えず安全な道へ復帰", () => {
  const s = E.fresh(new Date(2026, 9, 19));
  assert.equal(E.calendar(s.clock).month, 10);
  assert.equal(E.calendar(s.clock).day, 19);
  assert.equal(s.rentThrough, 9);
  assert.equal(s.wear.top, "c03");
  const old = E.fresh(new Date(2026, 3, 1));
  E.chooseHome(old, "home01");
  old.scene = "town";
  old.pos = { x: -43, z: -26 };
  delete old.worldVersion;
  const restored = E.parse(JSON.stringify(old));
  for (const key of [
    "clock",
    "money",
    "furniture",
    "jobs",
    "home",
    "rentThrough",
  ])
    assert.deepEqual(restored[key], old[key]);
  assert.deepEqual(restored.pos, { x: 0, z: -26 });
});
test("歩行は実移動距離で脚・腕が逆に動き、停止中は位相を進めず、走りは歩幅を増す", () => {
  const p = person({}, {});
  posePerson(p, 0.1, false, 0.1);
  const rig = p.userData.rig,
    phase = rig.phase;
  assert.ok(rig.legs[0].rotation.x * rig.legs[1].rotation.x < 0);
  assert.ok(rig.legs[0].rotation.x * rig.arms[0].rotation.x < 0);
  posePerson(p, 0, false, 0.1);
  assert.equal(rig.phase, phase);
  const walk = person({}, {}),
    run = person({}, {});
  posePerson(walk, 0.1, false, 1);
  posePerson(run, 0.1, true, 1);
  assert.ok(
    Math.abs(run.userData.rig.legs[0].rotation.x) >
      Math.abs(walk.userData.rig.legs[0].rotation.x),
  );
});
