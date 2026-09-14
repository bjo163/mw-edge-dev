# Changelog

## v0.11.0 - 2026-09-14

- Merge pull request #431 from bjo163/dev (c9cac01)
- test(steward): guard canonical health issue resolution (71c5b12)
- feat(db): add domain-local transactional outbox (f937c37)
- fix(web): preserve safe read failure evidence (f50a605)
- docs(environment): avoid false script references (c93486a)
- feat(web): harden reload-safe route contract (fda527f)
- fix(web): preserve URL context across resource navigation (1e86ce2)
- docs(environment): define reproducible runtime contract (47604ba)
- ci: degrade gracefully when Actions cannot create PRs (d4bda95)
- test(ui): prove fail-closed registry and currency-aware formats (6114fbb)
- feat(ui): provide currency context to detail renderers (b5927ea)
- fix(ui): bind filter labels and row currency context (730f9b8)
- feat(ui): render money with record-bound currency metadata (af6e428)
- feat(web): validate renderer metadata and consume money bindings (85f282c)
- feat(metadata): bind money fields to explicit currency references (2abe195)
- feat(metadata): add explicit money format currency binding (84fe634)
- feat(ui): add fail-closed metadata renderer registry (72adee4)


## v0.10.0 - 2026-09-14

- Merge dev into main: metadata workbench v2 (145d069)
- fix(ui): make serialization import NodeNext-safe (2b20175)
- test(ui): import non-JSX form serialization contract (5738a19)
- refactor(ui): consume non-JSX form serialization (0a137ad)
- refactor(ui): isolate form serialization contract (2aa58c7)
- ci: cancel obsolete dev and PR validation runs (8507bf4)
- test(ui): prove metadata v2 query detail and form contracts (d995471)
- feat(steward): wire plugin lock findings into canonical health (21c0ad4)
- feat(ui): style metadata workbench surfaces (9d21173)
- fix(ui): omit undefined Field props under exact optional typing (99670b8)
- feat(web): compose list detail and form workbench (1185c62)
- feat(web): add metadata-driven record detail floorplan (2d733d4)
- feat(web): add URL-backed bounded resource grid (076106a)
- feat(web): add metadata-driven typed form engine (a06fb30)
- feat(web): add typed resource value renderer (e18af2d)
- fix(metadata): fail closed for generic relation and json editing (7375daa)
- feat(ui): complete accessible workbench primitives (e1bbf4c)
- feat(web): consume ResourceMetadata v2 with v1 fallback (c8077b1)
- ci(perf): retain baseline and SQLite soak evidence (2182e83)
- chore(deps): bump zizmor workflow audit action (d1d2aaa)
- chore(deps): bump CodeQL SARIF uploader (c647188)
- feat(api): expose bounded resource query and detail contracts (a1477d3)
- chore(deps): bump checkout in branch sync (c1d4ebc)
- chore(deps): bump checkout in dev PR automation (bd8babc)
- chore(deps): refresh checkout and CodeQL actions (dfdb7ba)
- chore(deps): bump zizmor workflow audit action (cf073f8)
- chore(deps): bump CodeQL SARIF uploader (7465495)
- feat(metadata): materialize safe UI intent in v2 (15da8fb)
- chore(deps): bump checkout in branch sync (4e5d7d3)
- chore(deps): bump checkout in dev PR automation (58466ff)
- chore(deps): refresh checkout and CodeQL actions (74b0d33)
- feat(metadata): define safe ResourceMetadata v2 contract (d356f3a)
- fix(security): add dependency audit fallback (fbdd320)


## v0.9.0 - 2026-09-14

- chore: sync dev into main (420cca5)
- feat(schema): support composite unique indexes (a6d0a1f)
- feat(web): distinguish resource loading and empty states (dc18a4b)
- test(contracts): pin inventoried contract set (d0bc578)


## v0.8.0 - 2026-09-14

- chore(integration): promote dev to main (#427) (7b760ae)
- feat(steward): emit freshness findings (ec91bb2)
- fix(schema): reject duplicate declarative index ids (2ed9622)
- feat(web): move focus on route transitions (8bdfb84)
- test(contracts): validate evidence path classes (6309be6)
- feat(steward): emit canonical plugin lock findings (b4f6816)
- feat(schema): materialize owned indexes deterministically (000b5a9)
- feat(web): add safe read retry evidence (45d9e3f)
- docs(contracts): document evidence gap review policy (878a985)


## v0.7.0 - 2026-09-13

- chore: sync dev into main (#419) (084aecf)
- feat(steward): add scheduled workflow freshness analyzer (157ca24)
- feat(schema): add declarative index metadata (fbd39f3)
- fix(web): satisfy exact optional request evidence typing (bfc03cf)
- fix(kernel): keep decoded rows outside database row contract (4513a8c)
- feat(web): wire shared chrome to locale messages (6b8ba8d)
- fix(kernel): restore database row contract (5b4903e)
- feat(web): preserve request evidence on API failures (8176dc9)
- feat(steward): add read-only plugin lock probe (657864b)
- fix(kernel): validate model authority classes (a80e121)
- feat(web): introduce accessible shared primitives (12baa0f)
- test(contracts): harden public catalog drift checks (3f63785)


## v0.6.0 - 2026-09-13

- Merge dev into main: platform hardening and UI foundations (636285f)
- feat(nightly): gate and retain SQLite integrity evidence (979e111)
- test(db): cover read-only SQLite integrity probe (7405cc0)
- test(steward): gate scheduled failure fixtures (feafb4d)
- feat(steward): analyze repeated scheduled failures (1ff3e7b)
- fix(security): schedule privileged Dependabot merge guard (#132) (d15a8c1)
- feat(security): add verified Dependabot merge handoff (e3ac271)
- fix(security): split Dependabot policy from privileged merge (7622d0e)
- fix(ui): guard resource route segment under strict indexing (#359) (f704af6)
- fix(steward): repair Dependabot health loop (818d22e)
- test(ui): lock design token and appearance foundations (#370 #371 #372 #373) (de9fedc)
- feat(ui): apply appearance preferences before render (#371 #373) (09423bb)
- feat(security): guard Dependabot updates through dev checks (#416) (a964f80)
- feat(ui): add runtime theme and density preferences (#371 #373) (d994f93)
- refactor(ui): apply tokens typography and density foundations (#370 #372 #373) (69b76e0)
- test(architecture): include reference components in inventory (#415) (201e5be)
- feat(ui): add shared locale formatting helpers (#398) (b458117)
- feat(ui): add EN-ID message catalog foundation (#366) (21ae3de)
- feat(ui): add semantic density modes (#373) (41179db)
- test: separate example fixtures from production inventory (b5e1727)
- feat(ui): add operator typography system (#372) (7916655)
- feat(ui): add semantic design tokens (#370) (f88bd05)
- fix(db): preserve SQLite native type boundary (#414) (09d7ae4)
- feat(contracts): executable and auditable public contracts (#412) (3c9f323)
- feat(docs): build versioned static documentation site (#411) (d012a36)
- docs(security): complete production threat model (#410) (e066821)
- test(perf): add production baseline and SQLite soak evidence (#409) (3c29141)
- feat(ops): add migration compatibility and verified DR evidence (#408) (385a7c6)
- feat(steward): add scheduled failure history analyzer (3e44ae7)
- feat(db): add read-only profile integrity probe (95b6af7)
- feat(web): derive resource selection from URL (45eb3e0)


## v0.5.0 - 2026-09-13

- merge: promote validated dev changes to main (#369) (550a70a)
- fix(test): complete factory-reset principal fixture (#406) (2c6e13c)
- fix(test): use principal_ref in reset fixture (#405) (0e8570c)
- fix(test): narrow factory-reset seed count (#404) (29224fd)
- feat(sqlite): bound writer waits and control WAL checkpoints (#403) (6feed07)
- test(security): enforce sensitive-field redaction regressions (#402) (a2d8d3a)
- feat(domain): add command idempotency-key contract (#401) (33e1b7d)
- test(reset): prove fresh install reset equivalence (51e93db)
- feat(kernel): add typed command and query registries (8f437d8)


## v0.4.0 - 2026-09-13

- feat(release): gate v1 tags on production evidence (f98658a)
- feat(release): gate v1 tags on production evidence (28892f5)
- test(standalone): verify clone-to-login persistence (d7fd42e)
- test(standalone): verify clone-to-login persistence (580ac9c)
- ci(security): self-test Scorecard on default-branch changes (757b185)
- ci(security): self-test scorecard on default branch changes (371d94f)


## v0.3.0 - 2026-09-13

- Merge dev into main for validated release batch (039023f)
- test(onboarding): verify documented standalone quick start (eb6fcb4)
- fix(docs): satisfy strict validator typing (172ec54)
- docs(readme): rebuild product landing page (fe4b4d0)
- fix(docs): preserve validator regular expressions (d67b9fe)
- docs(project): add milestone-based roadmap (dd589a2)
- docs(project): add capability maturity matrix (3af45ee)
- ci(docs): verify capability inventory (34f2cae)
- test(docs): expose capability inventory command (9b55481)
- test(docs): add reproducible capability inventory (ba5c1e5)
- ci(docs): add documentation gate to readiness (0381dfe)
- test(docs): expose documentation validation command (fb4670f)
- test(docs): add local documentation validator (c72ac7e)
- docs(security): route sensitive reports to policy (dae60f1)
- docs(security): clarify reporting and support scope (398ed89)
- docs: add contributor workflow (2701889)
- docs: add security landing page (c75b70e)
- docs: add verified standalone quick start (e978bed)
- docs: add operator landing page (b0ed0a2)
- docs: add developer landing page (f802c9e)
- docs(architecture): add system boundary overview (77587ed)
- docs(architecture): add section index (7eff185)
- docs: establish canonical documentation identity (ececb45)
- docs: establish canonical documentation identity (bcdb9fe)
- docs: establish canonical documentation identity (b54af6c)
- fix(security): keep scorecard on default branch only (8201574)
- fix(automation): make governance reconciliation idempotent (7c48870)
- ci(security): self-test scorecard changes on dev (8b0b851)
- feat(automation): add nightly lifecycle and harden workflow execution (e359edc)
- ci(security): scope dependency review to dev update lane (026a300)
- fix(ci): satisfy workflow static analysis (a3ec8dc)
- ci(security): add dependency review gate (b65ca0e)
- ci(security): add workflow static analysis gates (6b94e53)
- ci: enforce frozen pnpm dependency graph (711022b)
- chore(deps): refresh pnpm lockfile (333a8ed)
- ci(deps): maintain pnpm lockfile (2490646)
- fix(ci): avoid lint self-match (86f3420)
- feat(automation): harden release and branch state gates (a04c10c)
- ci(automation): schedule steward from governance workflow (718583c)
- feat(automation): add mw edge steward health controller (41aab3d)


## v0.2.2 - 2026-09-13

- fix: keep dev synchronized after automated releases (00646f3)
- fix: sync dev from release workflow (2c08577)


## v0.2.1 - 2026-09-13

- fix: harden governance and persistent dev branch sync (ae63d04)
- fix: harden governance and two-branch synchronization (5d69f78)


## v0.2.0 - 2026-09-13

- chore: add repository governance and automation (7c605bd)
- feat: lock plugin manifests and activate lifecycle contracts (24ed4d7)
- feat: enforce typed plugin extension and capability contracts (85419d4)
- fix: harden TypeScript build and pnpm supply-chain gate (2527df5)
- feat: add typed standalone UI bootstrap and base data (21f85bb)
- refactor: migrate mw-edge foundation to strict TypeScript (88f4289)
- feat: establish native plugin ORM foundation (44667a6)
- chore: initialize mw-edge-dev (bbf6f16)

