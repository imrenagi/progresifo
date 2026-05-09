---
name: design-system-architecture
description:
  Architectural patterns for designing real-time, multi-service systems like
  live streaming platforms. Use when designing a new subsystem, writing
  architecture documents, reviewing system design, or implementing Go
  backend services with gRPC, WebRTC, media pipelines, or RTMP egress.
  Triggers on tasks involving system decomposition, domain modeling,
  state machines, data model decisions, distributed coordination,
  or cross-cutting concerns like auth, observability, and testing.
metadata:
  author: mercusiar-team
  version: '1.0.0'
---

# System Architecture Design

Patterns and principles for designing real-time, multi-service systems. Distilled from the Mercusiar live-streaming platform architecture (10 subsystem documents). These rules apply to any system with similar characteristics: stateful media pipelines, real-time coordination, domain-driven Go backends, and modern frontend SPAs.

## When to Apply

Reference these guidelines when:

- Designing a new subsystem or microservice
- Writing or reviewing architecture documents
- Modeling domain entities and their boundaries
- Choosing data storage strategies (relational vs. document)
- Implementing state machines for lifecycle management
- Designing inter-service communication (sync/async)
- Setting up testing strategies for domain-driven Go backends
- Making build-vs-buy or subprocess-vs-library decisions

## Rule Categories by Priority

| Priority | Category                       | Impact | Prefix          |
| -------- | ------------------------------ | ------ | --------------- |
| 1        | System Decomposition           | HIGH   | `decomp-`       |
| 2        | Domain Modeling                | HIGH   | `domain-`       |
| 3        | Data Storage Decisions         | HIGH   | `storage-`      |
| 4        | Testing & Boundary Enforcement | HIGH   | `testing-`      |
| 5        | Process Architecture           | MEDIUM | `process-`      |
| 6        | API & Protocol Design          | MEDIUM | `api-`          |
| 7        | Frontend Integration           | MEDIUM | `frontend-`     |
| 8        | Cross-Cutting Concerns         | MEDIUM | `crosscut-`     |

---

## 1. System Decomposition (HIGH)

### `decomp-subsystem-per-concern`

Decompose the system into subsystems along **technical concern boundaries**, not arbitrary module boundaries. Each subsystem gets a dedicated design document.

**Pattern**: Identify subsystems by asking "what distinct technical problem does this solve?"

- ✅ `WebRTC Ingestion` — solves browser-to-server media transport
- ✅ `Media Pipeline` — solves multi-source compositing and encoding
- ✅ `RTMP Egress` — solves output delivery to streaming platforms
- ✅ `API Layer` — solves client-server contract and authentication
- ✅ `Data Model` — solves persistence and access patterns
- ❌ `UserModule` — too vague, mixes auth, profile, and settings

### `decomp-binary-topology`

Decide how subsystems map to deployment binaries early. Group by I/O characteristics, not by domain.

**Pattern**: Stateless request-response services and stateful media processors are different binaries.

```
api-server (stateless)          media-worker (stateful)
├── gRPC services               ├── WebRTC PeerConnection
├── REST gateway                ├── Media pipeline (FFmpeg)
├── Auth interceptors           ├── RTMP egress
└── PostgreSQL/Redis I/O        └── Redis pub/sub listener
```

**Rule**: Never put long-lived stateful processes (WebRTC, FFmpeg) in the same binary as request-response handlers. They have fundamentally different scaling, failure, and resource profiles.

### `decomp-document-structure`

Every subsystem document must follow a consistent structure for navigability:

1. **Overview** — What this subsystem does (2-3 sentences)
2. **Architecture** — ASCII diagram showing data flow
3. **Core Design** — Detailed technical specification (protocols, algorithms, data structures)
4. **Error Handling** — Failure modes and recovery strategies
5. **Testability** — How to unit test and integration test this subsystem
6. **Key Implementation Files** — Directory tree mapping to source code
7. **Configuration** — All configurable parameters with defaults
8. **Dependencies** — External libraries and their purpose

### `decomp-coordinator-pattern`

When multiple subsystems must collaborate for a single user action (e.g., "start broadcast"), introduce an explicit **Coordinator** that orchestrates the cross-subsystem flow. The coordinator:

- Calls domain methods for business decisions
- Calls infrastructure for I/O
- Contains zero business logic itself
- Is the only place that knows the orchestration sequence

```go
// Coordinator orchestrates, domain decides
func (c *Coordinator) StartBroadcast(ctx context.Context, sessionID string) error {
    session := c.sessions[sessionID]
    if err := session.Stream.Start(); err != nil {  // domain decides
        return err
    }
    c.streamRepo.Update(ctx, session.Stream)         // infra I/O
    c.redis.Publish(ctx, channel, CmdStartBroadcast) // infra I/O
    return nil
}
```

---

## 2. Domain Modeling (HIGH)

### `domain-zero-infra-imports`

The domain layer (`internal/domain/`) must have **zero imports** from infrastructure packages. No `database/sql`, no `github.com/redis/go-redis`, no `net/http`, no `google.golang.org/grpc`. Domain models are pure Go structs and methods.

**Enforcement**: Use `depguard` or a CI script to verify this invariant. Any violation fails the build.

### `domain-rich-models`

Domain models should encapsulate business rules as methods, not be anemic data holders. Every validation, state transition, or business rule should be a method on the domain type.

```go
// ✅ Rich domain model
type Stream struct {
    State        StreamState
    Destinations []Destination
    Scenes       []Scene
}

func (s *Stream) CanStart() error {
    if s.State != StreamStateSETUP { return ErrInvalidStateTransition }
    if len(s.Destinations) == 0   { return ErrNoDestinations }
    if len(s.Scenes) == 0         { return ErrNoScenes }
    return nil
}

func (s *Stream) Start() error {
    if err := s.CanStart(); err != nil { return err }
    s.State = StreamStateLIVE
    s.StartedAt = time.Now()
    return nil
}
```

### `domain-explicit-state-machines`

Model lifecycle entities as explicit state machines with a transition table. Every valid state transition must be enumerated. Invalid transitions return domain errors.

```
Stream States:
  CREATED → SETUP → LIVE → ENDED
                  ↘ ENDED (cancel from setup)
            LIVE → PAUSED → LIVE (future)

Pipeline States:
  CREATED → CONFIGURING → RUNNING → DRAINING → STOPPED
```

**Rule**: The state transition function lives in the domain model, not in the service or coordinator. The coordinator calls `stream.Start()`, not `stream.State = LIVE`.

### `domain-boundary-interfaces`

Each domain defines its own **service interface** that external consumers depend on. Cross-domain communication goes through these interfaces, never through direct struct access.

```go
// internal/domain/stream/service.go
type DomainService interface {
    CanStart(stream *Stream) error
    ValidateTransition(from, to StreamState) error
}
```

**Rule**: If `SessionService` needs to check stream state, it calls `StreamDomainService`, never `streamRepo.GetByID()`. This is testable by mocking the interface.

---

## 3. Data Storage Decisions (HIGH)

### `storage-relational-first`

Default to normalized relational tables for all entities. Use foreign keys, constraints, and indexes aggressively. Only deviate when there is a clear, documented reason.

### `storage-jsonb-for-polymorphic-config`

Use JSONB columns when the data is:

1. **Polymorphic** — Different rows have different shapes (e.g., overlay configs: ticker has `speed`, logo has `opacity`)
2. **Schema-volatile** — The schema changes frequently as features evolve
3. **Atomically read/written** — Always read and written as a whole, never partially queried

Document the decision with an **Architecture Decision Block**:

```markdown
> **Architecture Decision: JSONB for `overlays.config`**
>
> The `config` column uses JSONB because overlay configurations are inherently
> polymorphic — each overlay type (ticker, logo, lower-third, custom HTML)
> requires a completely different schema. Alternatives considered:
> 1. Separate tables per type — rejected (table explosion, complex JOINs)
> 2. EAV pattern — rejected (query complexity, no type safety)
> 3. Sparse columns — rejected (NULL-heavy, rigid)
```

### `storage-redis-for-ephemeral`

Use Redis exclusively for data that:

- Is tied to an active session lifetime (dies when the session ends)
- Needs sub-second read/write performance (health metrics, pub/sub)
- Requires distributed coordination primitives (locks, pub/sub channels)

Redis keys must follow a namespaced convention: `mercusiar:{entity}:{id}:{field}`

### `storage-distributed-locks`

When only one process must own a stateful resource (e.g., media pipeline for a session), use Redis distributed locks with:

- `SET key value NX EX 30` — acquire with automatic expiry
- Heartbeat-based renewal (every 10s, renew to 30s)
- Explicit release on graceful shutdown
- Documented failover behavior when the lock expires

---

## 4. Testing & Boundary Enforcement (HIGH)

### `testing-first-class-citizen`

Every pull request that introduces or modifies business logic **must** include corresponding test coverage. Tests are a design tool, not an afterthought. CI pipelines block merges on test failures.

### `testing-pyramid`

Follow a strict testing pyramid:

| Layer | Scope | Speed | Infrastructure |
|-------|-------|-------|---------------|
| **Unit** (domain) | State machines, validators, domain methods | Milliseconds | Zero — no mocks, no containers |
| **Integration** (service/repo) | Service handlers + real DB/Redis | Seconds | testcontainers-go |
| **Contract** (API) | Protobuf compatibility | Seconds | `buf breaking` |

### `testing-table-driven`

All domain unit tests must use the table-driven pattern for exhaustive edge case coverage:

```go
tests := []struct {
    name    string
    stream  Stream
    wantErr error
}{...}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) { ... })
}
```

### `testing-mock-interfaces-not-infra`

When testing cross-domain interactions, mock the **domain service interface**, not the database or Redis. This proves the boundary contract is sufficient.

```go
// ✅ Mock the domain interface
type mockStreamDomain struct {
    canStartFn func(streamID string) error
}

// ❌ Don't mock the database to test business logic
// type mockDB struct { ... }
```

### `testing-boundary-enforcement`

Verify at CI time that `internal/domain/` has zero imports from infrastructure packages. This is the strongest guarantee that business logic stays pure and testable.

---

## 5. Process Architecture (MEDIUM)

### `process-subprocess-over-cgo`

When integrating with complex C libraries (FFmpeg, media codecs), prefer **subprocess management** over cgo bindings:

| Factor | cgo | Subprocess |
|--------|-----|-----------|
| Crash isolation | Crashes kill Go process | Crashes are isolated |
| Debugging | Complex mixed stacks | Standard tool debugging |
| Build complexity | Needs dev headers | Just needs binary |
| GPU acceleration | Complex C interop | CLI flags "just work" |

**Exception**: For lightweight, stable codecs (e.g., Opus via `hraban/opus`), cgo is acceptable.

### `process-named-pipes-for-ipc`

Use named pipes (FIFOs) for inter-process communication with subprocesses. They provide file-like semantics with in-memory performance:

```
Go Process → writes to /tmp/src1.h264 (FIFO) → FFmpeg reads from it
FFmpeg → writes to stdout (pipe) → Go Process reads from it
```

### `process-hot-swap-for-reconfig`

When a subprocess configuration changes (e.g., scene layout change), use the hot-swap pattern:

1. Start new process with new configuration
2. Atomically redirect input pipes
3. Drain and terminate old process
4. Accept 1-2 frame glitch (acceptable for live streaming)

---

## 6. API & Protocol Design (MEDIUM)

### `api-grpc-with-gateway`

Use gRPC for internal service communication and grpc-gateway for browser REST access. Define all APIs in protobuf and generate both Go server stubs and REST handlers.

### `api-interceptor-chain`

Layer concerns as gRPC interceptors in a predictable order:

```
Request → Recovery → Logging → Auth → Rate Limit → Validation → Handler
```

Each interceptor is independently testable.

### `api-redis-pubsub-for-commands`

For async communication between stateless API servers and stateful workers, use Redis Pub/Sub with structured command messages:

```json
{
  "type": "start_broadcast",
  "session_id": "sess_123",
  "timestamp": "2024-01-01T00:00:00Z",
  "payload": { ... }
}
```

Channel convention: `mercusiar:session:{session_id}:commands`

### `api-contract-versioning`

Run `buf breaking --against '.git#branch=main'` in CI to prevent backward-incompatible protobuf changes. This guarantees frontend clients compiled against older schemas remain functional.

---

## 7. Frontend Integration (MEDIUM)

### `frontend-atomic-selectors`

When using Zustand (or similar), derive state during render and use atomic selectors to prevent unnecessary re-renders:

```typescript
// ✅ Atomic selector — only re-renders when this specific value changes
const isLive = useStreamStore((s) => s.stream?.state === 'LIVE');

// ❌ Object selector — re-renders on any store change
const stream = useStreamStore((s) => s.stream);
```

### `frontend-optimistic-updates`

Apply state changes immediately in the client, then reconcile with server responses. Rollback on error:

```typescript
setScenes((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
try { await api.updateScene(id, updates); }
catch { setScenes(previousState); toast.error('Failed'); }
```

### `frontend-canvas-preview-parity`

The frontend canvas preview must use the same normalized coordinate system as the server's FFmpeg compositor. Layout coordinates are stored as percentages (0.0–1.0), and both client and server independently translate to pixel values based on their respective canvas sizes.

---

## 8. Cross-Cutting Concerns (MEDIUM)

### `crosscut-firebase-auth`

Use Firebase Authentication for user identity. Verify ID tokens server-side via Firebase Admin SDK. No custom JWT issuance — Firebase handles token lifecycle.

### `crosscut-otel-observability`

All telemetry uses OpenTelemetry SDK with OTLP export:
- **Metrics**: Request latency, error rates, active sessions, pipeline health
- **Traces**: Request → service → repository → Redis spans
- **Logging**: Structured JSON via zerolog, correlated with trace IDs

### `crosscut-reconnection-protocol`

For stateful connections (WebRTC, WebSocket), implement a seamless reconnection protocol:

1. Client detects disconnect → auto-reconnect with exponential backoff
2. Server-side: track `participant_id` for reconnection matching
3. Grace period (30s) before marking participant as disconnected
4. Rolling restart tolerance: use distributed locks so new pods can take over

### `crosscut-architecture-decision-blocks`

Document non-obvious technical decisions inline using blockquote format:

```markdown
> **Architecture Decision: [Title]**
>
> [What was decided and why]. Alternatives considered:
> 1. [Alternative 1] — rejected ([reason])
> 2. [Alternative 2] — rejected ([reason])
```

This ensures future contributors understand **why**, not just **what**.

---

## Document Checklist

When writing a new subsystem architecture document, verify:

- [ ] Overview section explains what the subsystem does in 2-3 sentences
- [ ] Architecture diagram shows data flow with ASCII art
- [ ] State machines are explicitly enumerated with transition tables
- [ ] JSONB/non-relational storage has an Architecture Decision block
- [ ] Error handling covers failure modes and recovery strategies
- [ ] Testability section defines domain logic extraction and boundary contracts
- [ ] Key Implementation Files maps to actual source code directory tree
- [ ] Configuration section lists all parameters with sensible defaults
- [ ] Dependencies table lists every external library with its purpose
- [ ] Cross-references link to related subsystem documents
