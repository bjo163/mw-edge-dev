import type { PluginManifest } from "../types.js";

export interface ExtensionBinding {
  readonly addon_id: string;
  readonly target_plugin_id: string;
  readonly extension_point: string;
}

export class ExtensionRegistry {
  readonly #points = new Map<string, string>();
  readonly #bindings: ExtensionBinding[] = [];
  #frozen = false;

  declare(plugin: PluginManifest): void {
    if (this.#frozen) throw new Error("Extension registry is frozen");
    if (plugin.kind !== "domain_plugin") return;
    for (const point of plugin.extension_points ?? []) {
      if (this.#points.has(point)) throw new Error(`Duplicate extension point ${point}`);
      this.#points.set(point, plugin.id);
    }
  }

  bind(addon: PluginManifest): void {
    if (this.#frozen) throw new Error("Extension registry is frozen");
    if (addon.kind !== "addon" || !addon.extends) return;
    for (const point of addon.uses_extension_points ?? []) {
      const owner = this.#points.get(point);
      if (!owner) throw new Error(`Unknown extension point ${point}`);
      if (owner !== addon.extends) {
        throw new Error(`Addon ${addon.id} cannot bind extension point owned by ${owner}`);
      }
      this.#bindings.push({ addon_id: addon.id, target_plugin_id: addon.extends, extension_point: point });
    }
  }

  freeze(): void {
    this.#frozen = true;
  }

  snapshot(): {
    readonly points: Readonly<Record<string, string>>;
    readonly bindings: readonly ExtensionBinding[];
    readonly frozen: boolean;
  } {
    return {
      points: Object.fromEntries([...this.#points.entries()].sort(([a], [b]) => a.localeCompare(b))),
      bindings: [...this.#bindings],
      frozen: this.#frozen,
    };
  }
}
