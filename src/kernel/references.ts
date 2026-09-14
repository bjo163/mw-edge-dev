const REFERENCE_KIND = /^[a-z][a-z0-9_.-]*$/;

export interface ReferenceResolution {
  readonly ref: string;
  readonly label: string;
  readonly description?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface ReferenceResolveRequest {
  readonly search?: string;
  readonly refs?: readonly string[];
  readonly limit?: number;
}

export interface ReferenceResolveContext {
  readonly kind: string;
  readonly search?: string;
  readonly refs?: readonly string[];
  readonly limit: number;
  readonly signal: AbortSignal;
}

export type ReferenceResolver =
  (context: ReferenceResolveContext) =>
    readonly ReferenceResolution[] | Promise<readonly ReferenceResolution[]>;

export interface ReferenceResolverRegistryOptions {
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
  readonly timeoutMs?: number;
}

function boundedInteger(name: string, value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export class ReferenceResolverRegistry {
  readonly #resolvers = new Map<string, ReferenceResolver>();
  readonly defaultLimit: number;
  readonly maxLimit: number;
  readonly timeoutMs: number;

  constructor(options: ReferenceResolverRegistryOptions = {}) {
    this.maxLimit = boundedInteger("maxLimit", options.maxLimit ?? 100, 1, 1000);
    this.defaultLimit = boundedInteger("defaultLimit", options.defaultLimit ?? Math.min(20, this.maxLimit), 1, this.maxLimit);
    this.timeoutMs = boundedInteger("timeoutMs", options.timeoutMs ?? 1000, 1, 30000);
  }

  register(kind: string, resolver: ReferenceResolver): void {
    if (!REFERENCE_KIND.test(kind)) throw new Error(`Invalid reference kind ${kind}`);
    if (this.#resolvers.has(kind)) throw new Error(`Duplicate reference resolver ${kind}`);
    this.#resolvers.set(kind, resolver);
  }

  has(kind: string): boolean {
    return this.#resolvers.has(kind);
  }

  kinds(): readonly string[] {
    return [...this.#resolvers.keys()].sort();
  }

  async resolve(kind: string, request: ReferenceResolveRequest = {}): Promise<readonly ReferenceResolution[]> {
    const resolver = this.#resolvers.get(kind);
    if (!resolver) throw new Error(`Unknown reference resolver ${kind}`);

    const limit = request.limit ?? this.defaultLimit;
    boundedInteger("Reference resolve limit", limit, 1, this.maxLimit);

    const search = request.search?.trim();
    if (search && search.length > 200) throw new Error("Reference search is limited to 200 characters");

    const refs = request.refs ? [...new Set(request.refs)] : undefined;
    if (refs && refs.length > this.maxLimit) {
      throw new Error(`Reference lookup is limited to ${this.maxLimit} refs`);
    }
    if (refs?.some((ref) => ref.length === 0 || ref.length > 200)) {
      throw new Error("Reference values must be between 1 and 200 characters");
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Reference resolver timeout for ${kind}`));
      }, this.timeoutMs);
    });

    try {
      const resolved = await Promise.race([
        Promise.resolve(resolver({
          kind,
          ...(search ? { search } : {}),
          ...(refs ? { refs } : {}),
          limit,
          signal: controller.signal,
        })),
        timeout,
      ]);

      if (resolved.length > limit) {
        throw new Error(`Reference resolver ${kind} returned ${resolved.length} results above limit ${limit}`);
      }

      const seen = new Set<string>();
      for (const item of resolved) {
        if (!item.ref || item.ref.length > 200) throw new Error(`Invalid reference value from ${kind}`);
        if (!item.label || item.label.length > 500) throw new Error(`Invalid reference label from ${kind}`);
        if (seen.has(item.ref)) throw new Error(`Duplicate reference result ${item.ref} from ${kind}`);
        seen.add(item.ref);
      }
      return Object.freeze([...resolved]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
