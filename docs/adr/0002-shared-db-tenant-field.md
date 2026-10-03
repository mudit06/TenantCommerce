# ADR 0002: Shared database with tenant field

- Status: accepted (2 October 2026)
- Context: separate stores with isolated data; need low running cost; Payload's official
  multi-tenant plugin uses a tenant field.
- Decision: one MongoDB database; every tenant-owned document has `tenant`; isolation enforced by
  access control, a tenant-scoped data layer, write hooks and integration tests.
- Consequences: cheap and simple; a bug can leak data across tenants, hence mandatory isolation
  tests. `tenants.dbRef` keeps the door open to moving a heavy tenant to its own database.
