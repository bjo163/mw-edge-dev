# Declarative validation contract

MW Edge exposes a bounded declarative validation registry for reusable field and domain rules. The public surface is exported from `src/index.ts`; the implementation lives in `src/kernel/validation.ts`.

## Registry and identifiers

`ValidationRegistry` keeps field validators and domain validators in separate registries. Validator identifiers must match `^[a-z][a-z0-9_.-]*$`. Registering an invalid identifier or registering the same identifier twice in the same registry fails immediately.

`fieldValidators()` and `domainValidators()` return their registered identifiers in sorted order. That listing order is for discovery only; validation execution order comes from the supplied plan.

## Validation plan

A `ValidationPlan` may contain field plans and domain rules. A field plan names one record field and an ordered list of rules. Each rule references a registered validator and may carry read-only options.

A single plan is limited to 100 rules across all field and domain entries. Plans above that bound fail before any validator is executed.

The validation context supplies the domain, model, and record. A field named by a field plan must exist as an own property of the record. Missing fields and unknown validator identifiers fail closed.

## Deterministic execution order

Execution is deterministic:

1. Field plans run in the order declared by the caller.
2. Rules inside each field plan run in their declared order.
3. Domain rules run only after all field rules complete successfully, in their declared order.
4. Validation stops on the first failing rule.

Validators are synchronous. A validator succeeds by returning `void`. It reports a validation failure by returning `{ message, details? }`.

## Typed validation failures

A validator-reported failure becomes `ValidationError`, which extends the MW Edge error contract with:

- code `VALIDATION_FAILED`;
- HTTP status `400`;
- `details.scope` equal to `field` or `domain`;
- the failing validator identifier;
- the field name for field-scoped failures;
- optional validator-provided details.

Registry/configuration errors such as invalid IDs, duplicates, unknown validators, missing fields, or plans above the rule bound are programming/configuration errors and are not converted into `ValidationError`.

## Safety properties

The contract intentionally provides named registered functions instead of expression evaluation or monkey-patching. Rule options are copied and frozen before they are passed to validators. A plan therefore selects from explicitly registered behavior and cannot inject executable code through rule metadata.

## Regression evidence

The focused validation regression tests introduced with issue #71 verify declared field-before-domain ordering, first-failure short-circuiting, the `VALIDATION_FAILED` typed error shape, invalid and duplicate validator rejection, unknown-validator rejection, and the 100-rule bound. Any future change to these semantics should update both those tests and this reference contract in the same review.