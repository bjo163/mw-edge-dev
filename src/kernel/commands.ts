const COMMAND_ID = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_-]*)+$/;
const DOMAIN = /^[a-z][a-z0-9_]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

declare const commandInput: unique symbol;
declare const commandOutput: unique symbol;

export type CommandIdempotency = "optional" | "required";

export interface DomainCommand<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly version: string;
  readonly domain: string;
  readonly idempotency?: CommandIdempotency;
  readonly [commandInput]?: Input;
  readonly [commandOutput]?: Output;
}

export type CommandInput<Command> =
  Command extends DomainCommand<infer Input, infer _Output> ? Input : never;
export type CommandOutput<Command> =
  Command extends DomainCommand<infer _Input, infer Output> ? Output : never;

export interface IdempotencyScope {
  readonly command_id: string;
  readonly key: string;
}

/**
 * Implementations must serialize each command_id/key pair and return the first
 * committed result without invoking operation again after a successful commit.
 * Durable adapters should bind this operation to the same transaction as the
 * domain write whenever possible.
 */
export interface IdempotencyStore {
  execute<Output>(scope: IdempotencyScope, operation: () => Output): Output;
}

function normalizeIdempotencyKey(key: string | undefined): string | undefined {
  if (key === undefined) return undefined;
  if (key.length === 0 || key.length > 200 || key.trim() !== key) {
    throw new Error("Idempotency key must be 1-200 non-whitespace-trimmed characters");
  }
  return key;
}

export function executeIdempotently<Command extends DomainCommand>(
  command: Command,
  operation: () => CommandOutput<Command>,
  options: { readonly key?: string; readonly store?: IdempotencyStore } = {},
): CommandOutput<Command> {
  const key = normalizeIdempotencyKey(options.key);

  if (command.idempotency === undefined) {
    if (key !== undefined) {
      throw new Error(`Command ${command.id} does not declare idempotency semantics`);
    }
    return operation();
  }

  if (command.idempotency === "required" && key === undefined) {
    throw new Error(`Idempotency key required for ${command.id}`);
  }

  if (key === undefined) return operation();
  if (!options.store) throw new Error(`Idempotency store required for ${command.id}`);

  return options.store.execute({ command_id: command.id, key }, operation);
}

function validate(command: DomainCommand): void {
  if (!COMMAND_ID.test(command.id)) throw new Error(`Invalid command id ${command.id}`);
  if (!VERSION.test(command.version)) throw new Error(`Invalid command version ${command.version} for ${command.id}`);
  if (!DOMAIN.test(command.domain)) throw new Error(`Invalid command domain ${command.domain}`);
  if (command.idempotency !== undefined && command.idempotency !== "optional" && command.idempotency !== "required") {
    throw new Error(`Invalid idempotency policy for ${command.id}`);
  }
  if (!command.id.startsWith(`${command.domain}.`)) {
    throw new Error(`Command domain mismatch for ${command.id}: expected owner ${command.domain}`);
  }
}

export class CommandRegistry {
  readonly #commands = new Map<string, DomainCommand>();

  register(command: DomainCommand): void {
    validate(command);
    if (this.#commands.has(command.id)) throw new Error(`Duplicate command ${command.id}`);
    this.#commands.set(command.id, Object.freeze({ ...command }));
  }

  get(id: string): DomainCommand {
    const command = this.#commands.get(id);
    if (!command) throw new Error(`Unknown command ${id}`);
    return command;
  }

  has(id: string): boolean {
    return this.#commands.has(id);
  }

  list(): readonly DomainCommand[] {
    return [...this.#commands.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}
