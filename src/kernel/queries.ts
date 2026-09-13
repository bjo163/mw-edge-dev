const QUERY_ID = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_-]*)+$/;
const DOMAIN = /^[a-z][a-z0-9_]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

declare const queryInput: unique symbol;
declare const queryOutput: unique symbol;

export interface DomainQuery<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly version: string;
  readonly domain: string;
  readonly [queryInput]?: Input;
  readonly [queryOutput]?: Output;
}

export type QueryInput<Query> =
  Query extends DomainQuery<infer Input, infer _Output> ? Input : never;
export type QueryOutput<Query> =
  Query extends DomainQuery<infer _Input, infer Output> ? Output : never;

function validate(query: DomainQuery): void {
  if (!QUERY_ID.test(query.id)) throw new Error(`Invalid query id ${query.id}`);
  if (!VERSION.test(query.version)) throw new Error(`Invalid query version ${query.version} for ${query.id}`);
  if (!DOMAIN.test(query.domain)) throw new Error(`Invalid query domain ${query.domain}`);
  if (!query.id.startsWith(`${query.domain}.`)) {
    throw new Error(`Query domain mismatch for ${query.id}: expected owner ${query.domain}`);
  }
}

export class QueryRegistry {
  readonly #queries = new Map<string, DomainQuery>();

  register(query: DomainQuery): void {
    validate(query);
    if (this.#queries.has(query.id)) throw new Error(`Duplicate query ${query.id}`);
    this.#queries.set(query.id, Object.freeze({ ...query }));
  }

  get(id: string): DomainQuery {
    const query = this.#queries.get(id);
    if (!query) throw new Error(`Unknown query ${id}`);
    return query;
  }

  has(id: string): boolean {
    return this.#queries.has(id);
  }

  list(): readonly DomainQuery[] {
    return [...this.#queries.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}
