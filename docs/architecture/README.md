# Architecture

Start with the [system overview](overview.md). It explains the current MW Edge boundaries before deeper implementation-specific material.

Current architecture source anchors:

- [plugin host and profile composition](../../src/kernel/plugins/host.ts)
- [component registry](../../src/kernel/plugins/registry.ts)
- [model types](../../src/kernel/types.ts)
- [domain database router](../../src/kernel/database/router.ts)
- [metadata generation](../../src/kernel/metadata.ts)
- [HTTP application](../../src/http/app.ts)

Future architecture pages should specialize these topics rather than duplicating the system overview.
