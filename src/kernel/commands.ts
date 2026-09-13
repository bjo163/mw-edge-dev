const COMMAND_ID = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_-]*)+$/;
const DOMAIN = /^[a-z][a-z0-9_]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

declare const commandInput: unique symbol;
declare const commandOutput: unique symbol;

export interface DomainCommand<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly version: string;
  readonly domain: string;
  readonly [commandInput]?: Input;
  readonly [commandOutput]?: Output;
}

export type CommandInput<Command> =
  Command extends DomainCommand<infer Input, infer _Output> ? Input : never;
export type CommandOutput<Command> =
  Command extends DomainCommand<infer _Input, infer Output> ? Output : never;

function validate(command: DomainCommand): void {
  if (!COMMAND_ID.test(command.id)) throw new Error(`Invalid command id ${command.id}`);
  if (!VERSION.test(command.version)) throw new Error(`Invalid command version ${command.version} for ${command.id}`);
  if (!DOMAIN.test(command.domain)) throw new Error(`Invalid command domain ${command.domain}`);
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
