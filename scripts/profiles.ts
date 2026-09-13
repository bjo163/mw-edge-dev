import { readdir, readFile } from "node:fs/promises";

const directory = new URL("../profiles/", import.meta.url);
for (const file of (await readdir(directory)).filter((name) => name.endsWith(".json")).sort()) {
  const profile = JSON.parse(await readFile(new URL(file, directory), "utf8")) as {
    readonly id: string;
    readonly components: readonly string[];
    readonly description: string;
  };
  console.log(
    `${profile.id.padEnd(26)} ${String(profile.components.length).padStart(2)} components  ${profile.description}`,
  );
}
