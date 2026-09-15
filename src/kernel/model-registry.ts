import { MODEL_NAME } from "./util.js";
import type { ModelAuthority, ModelDefinition } from "./types.js";

const TYPES = new Set([
  "String",
  "Text",
  "Integer",
  "Decimal",
  "Boolean",
  "DateTime",
  "Enum",
  "Reference",
  "Relation",
  "Json",
]);

const AUTHORITIES = new Set<ModelAuthority>([
  "CANONICAL",
  "PROJECTION",
  "CACHE",
  "OBSERVATION",
  "REFERENCE",
  "LOCAL_ONLY",
]);

export interface ModelOwnershipMetadata {
  readonly owner_component: string;
  readonly authority_class: ModelAuthority;
  readonly source_of_truth: boolean;
  readonly mutation_owner: string | null;
  readonly tenant_scope: "TENANT" | "GLOBAL";
}

export type RegisteredModel = ModelDefinition & {
  readonly owner: string;
  readonly ownership: ModelOwnershipMetadata;
};

function ownershipMetadata(model: ModelDefinition, owner: string): ModelOwnershipMetadata {
  const sourceOfTruth = model.authority === "CANONICAL" || model.authority === "REFERENCE" || model.authority === "LOCAL_ONLY";
  const tenantScoped = Object.values(model.fields).some(
    (field) => field.type === "Reference" && field.ref_kind === "tenant_scope",
  );

  return Object.freeze({
    owner_component: owner,
    authority_class: model.authority,
    source_of_truth: sourceOfTruth,
    mutation_owner: sourceOfTruth ? owner : null,
    tenant_scope: tenantScoped ? "TENANT" : "GLOBAL",
  });
}

export class ModelRegistry {
  readonly #models = new Map<string, RegisteredModel>();

  register(model: ModelDefinition, owner: string): void {
    if (!MODEL_NAME.test(model.name)) throw new Error(`Invalid model name ${model.name}`);
    if (this.#models.has(model.name)) throw new Error(`Duplicate model ${model.name}`);
    if (model.domain !== model.name.split(".")[0]) throw new Error(`Domain mismatch for ${model.name}`);
    if (!AUTHORITIES.has(model.authority)) throw new Error(`Unknown authority ${model.authority} for ${model.name}`);
    if (typeof model.component !== "string" || model.component.trim().length === 0) {
      throw new Error(`Missing model ownership for ${model.name}`);
    }
    if (typeof owner !== "string" || owner.trim().length === 0) {
      throw new Error(`Missing registration owner for ${model.name}`);
    }
    if (model.component !== owner) {
      throw new Error(`Ambiguous model ownership for ${model.name}: component ${model.component} registered by ${owner}`);
    }

    for (const [name, field] of Object.entries(model.fields)) {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`Invalid field ${model.name}.${name}`);
      if (!TYPES.has(field.type)) throw new Error(`Unknown type ${field.type} for ${model.name}.${name}`);
      if (field.type === "Enum" && (!field.enum || field.enum.length === 0)) {
        throw new Error(`Enum values required for ${model.name}.${name}`);
      }
      if (field.type === "Relation" && !field.target) {
        throw new Error(`Relation target required for ${model.name}.${name}`);
      }
    }

    this.#models.set(
      model.name,
      Object.freeze({ ...model, owner, ownership: ownershipMetadata(model, owner) }),
    );
  }

  finalize(): this {
    for (const model of this.#models.values()) {
      for (const [fieldName, field] of Object.entries(model.fields)) {
        if (field.type !== "Relation" || !field.target) continue;
        const parts = field.target.split(".");
        const targetField = parts.pop();
        const targetName = parts.join(".");
        if (!targetField) throw new Error(`Invalid relation target ${field.target}`);
        const target = this.#models.get(targetName);
        if (!target) throw new Error(`Missing relation target ${field.target} from ${model.name}.${fieldName}`);
        if (target.domain !== model.domain) {
          throw new Error(`Cross-domain Relation forbidden: ${model.name}.${fieldName} -> ${field.target}`);
        }
        if (!target.fields[targetField]) throw new Error(`Missing relation field ${field.target}`);
      }
    }
    return this;
  }

  get(name: string): RegisteredModel {
    const model = this.#models.get(name);
    if (!model) throw new Error(`Unknown model ${name}`);
    return model;
  }

  has(name: string): boolean {
    return this.#models.has(name);
  }

  list(): readonly RegisteredModel[] {
    return [...this.#models.values()];
  }
}
