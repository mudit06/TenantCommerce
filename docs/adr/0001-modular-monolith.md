# ADR 0001: Modular monolith

- Status: accepted (2 October 2026)
- Context: small in-house team; < 50 tenants at launch, design target 500; Payload is built to
  run inside Next.js as one app.
- Decision: one deployable Next.js + Payload app with strict internal modules (`src/modules/*`),
  an in-process event bus and a jobs queue. No microservices.
- Consequences: one repo, one deploy, simple local dev and transactions. Module boundaries must be
  enforced by convention and lint rules. Extraction path documented in docs/01-architecture.md.
