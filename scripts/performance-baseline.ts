import { performance } from "node:perf_hooks";
import { boot } from "../src/index.js";
import { CommandRegistry } from "../src/kernel/commands.js";
import { QueryRegistry } from "../src/kernel/queries.js";
import { presentResourceValue } from "../web/src/resource/presentation.js";
import type { ResourceFieldMetadata } from "../web/src/api.js";

interface Measurement {
  readonly name: string;
  readonly elapsed_ms: number;
  readonly budget_ms: number;
  readonly operations: number;
}

function elapsed(start: number): number {
  return Number((performance.now() - start).toFixed(2));
}

function assertBudget(measurement: Measurement): void {
  if (measurement.elapsed_ms > measurement.budget_ms) {
    throw new Error(
      `${measurement.name} exceeded regression budget: ${measurement.elapsed_ms}ms > ${measurement.budget_ms}ms`,
    );
  }
}

async function main(): Promise<void> {
  const measurements: Measurement[] = [];

  let start = performance.now();
  const full = await boot({ profile: "full", memory: true });
  JSON.stringify(full.metadata);
  measurements.push({
    name: "full_boot_and_metadata",
    elapsed_ms: elapsed(start),
    budget_ms: 5000,
    operations: 1,
  });
  full.close();

  const example = await boot({ profile: "example", memory: true });
  try {
    const items = example.orm.model("example.item");
    start = performance.now();
    for (let index = 0; index < 200; index += 1) {
      const ref = `perf-${index}`;
      items.create({ item_ref: ref, name: `Performance ${index}`, rank: 1000 + index });
      items.get(ref);
    }
    items.find({
      comparisons: [{ field: "rank", op: "gte", value: 1000 }],
      sort: [{ field: "rank", direction: "desc" }],
      pagination: { mode: "page", page: 1, pageSize: 100 },
    });
    measurements.push({
      name: "orm_mixed_200",
      elapsed_ms: elapsed(start),
      budget_ms: 3000,
      operations: 401,
    });
  } finally {
    example.close();
  }

  start = performance.now();
  const commands = new CommandRegistry();
  const queries = new QueryRegistry();
  for (let index = 0; index < 500; index += 1) {
    commands.register({ id: `perf.command_${index}`, version: "1.0.0", domain: "perf" });
    queries.register({ id: `perf.query_${index}`, version: "1.0.0", domain: "perf" });
  }
  for (let index = 0; index < 500; index += 1) {
    commands.get(`perf.command_${index}`);
    queries.get(`perf.query_${index}`);
  }
  commands.list();
  queries.list();
  measurements.push({
    name: "command_query_registry_1000",
    elapsed_ms: elapsed(start),
    budget_ms: 1000,
    operations: 2002,
  });

  const numberField: ResourceFieldMetadata = {
    type: "Decimal",
    label: "Amount",
    help: null,
    placeholder: null,
    widget: "number",
    format: "number",
    currency_field: null,
    read_only: false,
    generated: false,
    sortable: true,
    filterable: true,
  };
  start = performance.now();
  for (let index = 0; index < 5000; index += 1) {
    presentResourceValue({ field: numberField, value: index + 0.25, locale: index % 2 === 0 ? "en" : "id" });
  }
  measurements.push({
    name: "ui_presentation_5000",
    elapsed_ms: elapsed(start),
    budget_ms: 2000,
    operations: 5000,
  });

  for (const measurement of measurements) assertBudget(measurement);
  console.log(JSON.stringify({
    status: "ok",
    node: process.version,
    measurements,
    policy: "fixed regression envelopes; lower is better; budgets are CI portability ceilings, not throughput claims",
  }));
}

await main();
