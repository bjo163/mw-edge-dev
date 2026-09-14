import { MwError } from "./errors.js";

const VALIDATOR_ID = /^[a-z][a-z0-9_.-]*$/;

export interface ValidationRule {
  readonly validator: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface FieldValidationPlan {
  readonly field: string;
  readonly rules: readonly ValidationRule[];
}

export interface ValidationPlan {
  readonly fields?: readonly FieldValidationPlan[];
  readonly domain?: readonly ValidationRule[];
}

export interface ValidationContext {
  readonly domain: string;
  readonly model: string;
  readonly record: Readonly<Record<string, unknown>>;
}

export interface FieldValidatorContext extends ValidationContext {
  readonly field: string;
  readonly value: unknown;
  readonly options: Readonly<Record<string, unknown>>;
}

export interface DomainValidatorContext extends ValidationContext {
  readonly options: Readonly<Record<string, unknown>>;
}

export interface ValidationFailure {
  readonly message: string;
  readonly details?: unknown;
}

export type FieldValidator = (context: FieldValidatorContext) => ValidationFailure | void;
export type DomainValidator = (context: DomainValidatorContext) => ValidationFailure | void;

export interface ValidationErrorDetails {
  readonly scope: "field" | "domain";
  readonly validator: string;
  readonly field?: string;
  readonly details?: unknown;
}

export class ValidationError extends MwError {
  declare readonly details: ValidationErrorDetails;

  constructor(message: string, details: ValidationErrorDetails) {
    super("VALIDATION_FAILED", message, 400, details);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class ValidationRegistry {
  readonly #field = new Map<string, FieldValidator>();
  readonly #domain = new Map<string, DomainValidator>();

  registerField(id: string, validator: FieldValidator): void {
    this.#register(this.#field, id, validator);
  }

  registerDomain(id: string, validator: DomainValidator): void {
    this.#register(this.#domain, id, validator);
  }

  fieldValidators(): readonly string[] {
    return [...this.#field.keys()].sort();
  }

  domainValidators(): readonly string[] {
    return [...this.#domain.keys()].sort();
  }

  validate(plan: ValidationPlan, context: ValidationContext): void {
    const fieldPlans = plan.fields ?? [];
    const domainRules = plan.domain ?? [];
    const ruleCount = fieldPlans.reduce((total, item) => total + item.rules.length, 0) + domainRules.length;
    if (ruleCount > 100) throw new Error("Validation plan supports at most 100 rules");

    for (const fieldPlan of fieldPlans) {
      if (!Object.hasOwn(context.record, fieldPlan.field)) {
        throw new Error(`Validation field ${fieldPlan.field} is missing from ${context.model}`);
      }
      for (const rule of fieldPlan.rules) {
        const validator = this.#field.get(rule.validator);
        if (!validator) throw new Error(`Unknown field validator ${rule.validator}`);
        const failure = validator({
          ...context,
          field: fieldPlan.field,
          value: context.record[fieldPlan.field],
          options: Object.freeze({ ...(rule.options ?? {}) }),
        });
        if (failure) {
          throw new ValidationError(failure.message, {
            scope: "field",
            validator: rule.validator,
            field: fieldPlan.field,
            ...(failure.details === undefined ? {} : { details: failure.details }),
          });
        }
      }
    }

    for (const rule of domainRules) {
      const validator = this.#domain.get(rule.validator);
      if (!validator) throw new Error(`Unknown domain validator ${rule.validator}`);
      const failure = validator({
        ...context,
        options: Object.freeze({ ...(rule.options ?? {}) }),
      });
      if (failure) {
        throw new ValidationError(failure.message, {
          scope: "domain",
          validator: rule.validator,
          ...(failure.details === undefined ? {} : { details: failure.details }),
        });
      }
    }
  }

  #register<T>(target: Map<string, T>, id: string, validator: T): void {
    if (!VALIDATOR_ID.test(id)) throw new Error(`Invalid validator id ${id}`);
    if (target.has(id)) throw new Error(`Duplicate validator ${id}`);
    target.set(id, validator);
  }
}
