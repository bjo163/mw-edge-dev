import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "../src/index.js";

async function snapshot(): Promise<{ count: number; checksum: string }> {
  const env = await boot({ profile: "business-base", memory: true });
  try {
    const units = env.orm.model("foundation.uom");
    assert.equal(units.get("uom.each")?.code, "EA");
    assert.equal(units.get("uom.kilogram")?.category, "mass");
    assert.equal(units.get("uom.liter")?.symbol, "L");

    const history = env.router.get("foundation").get<{ checksum: string }>(
      "SELECT checksum FROM mw_seed_history WHERE component_id=? AND seed_id=? AND seed_version=?",
      ["mw.foundation", "foundation.reference.uom", "1"],
    );
    assert.ok(history?.checksum);
    return { count: units.count(), checksum: history.checksum };
  } finally {
    env.close();
  }
}

test("foundation UoM pack is deterministic, checksummed and fresh-boot safe", async () => {
  const first = await snapshot();
  const second = await snapshot();
  assert.equal(first.count, 8);
  assert.deepEqual(second, first);
});
