# Architecture

> **Status: target design, not the current layout.** This document describes
> where the project is headed — an app factory, a service layer, `src/server.js`
> as the entry point. The code today is a simpler subset of it: `app.js` at the
> root, and controllers that talk to models directly.
>
> For the structure that actually exists right now, see the
> [project structure section of the README](README.md#project-structure).

A layered, module-based structure for this Express 5 + Mongoose 9 API.

Two ideas carry the whole design:

1. **Dependencies point one direction:** `routes → controller → service → model → mongoose`. Nothing ever points back up.
2. **Every response has one shape**, success or failure, because all errors funnel through a single handler.

---

## Folder structure

```
mongoose-playground/
├── .env                          # secrets — gitignored
├── .env.example                  # committed template
├── ARCHITECTURE.md               # this file
├── package.json
│
└── src/
    ├── server.js                 # entry point
    ├── app.js                    # express app factory
    │
    ├── config/
    │   ├── env.js
    │   └── database.js
    │
    ├── routes/
    │   └── index.js
    │
    ├── middleware/
    │   ├── requestLogger.js
    │   ├── validate.js
    │   ├── asyncHandler.js
    │   ├── notFound.js
    │   └── errorHandler.js
    │
    ├── modules/
    │   └── user/
    │       ├── user.model.js
    │       ├── user.validation.js
    │       ├── user.service.js
    │       ├── user.controller.js
    │       └── user.routes.js
    │
    └── utils/
        ├── ApiError.js
        └── apiResponse.js
```

---

## Layer responsibilities

| Layer | Knows HTTP (`req`/`res`) | Knows MongoDB | May throw |
|---|---|---|---|
| `routes` | yes | no | no |
| `controller` | yes | **no** | no |
| `service` | **no** | yes, via model | `ApiError` |
| `model` | no | yes | mongoose errors |

The two rules that matter most:

- **A controller never imports mongoose.** No `User.find()` in a controller. This is what lets a service be called from a cron job, CLI script, or queue worker — not only from a route.
- **A service never touches `req` or `res`.** It takes plain arguments, returns plain data, throws `ApiError`. This is what makes it testable without starting Express.

---

## Request flow

```
   HTTP request
        │
        ▼
  app.js ── express.json() → requestLogger
        │
        ▼
  routes/index.js ── mounts /api/v1/users
        │
        ▼
  user.routes.js ── validate(schema) ──✗──► 400 ─────┐
        │ ✓                                          │
        ▼                                            │
  user.controller.js ── unwraps req, shapes res      │
        │                                            │
        ▼                                            │
  user.service.js ── rules, throws ApiError ─────────┤
        │                                            │
        ▼                                            │
  user.model.js ── mongoose schema                   │
        │                                            │
        ▼                                            ▼
    MongoDB                                  errorHandler.js
        │                                            │
        ▼                                            ▼
    200 / 201                              4xx / 5xx (one shape)
```

Unmatched paths fall to `notFound.js`, which also lands in `errorHandler.js`.

---

# File reference

## Entry points

### `src/server.js`

**Purpose:** the only file that starts or stops the process. Nothing else calls `listen()` or `process.exit()`.

**Contains**

- Imports `createApp` from `app.js` and `connectDatabase` from `config/database.js`.
- Awaits the DB connection **before** listening, so the server never accepts traffic it can't serve.
- Stores the value returned by `app.listen(port)` in a variable — needed for shutdown.
- Graceful shutdown on `SIGINT` and `SIGTERM`: stop accepting connections, close the DB, then exit.
- Top-level failure guard: if startup throws, log and `process.exit(1)`.
- Handlers for `unhandledRejection` and `uncaughtException` — log, then shut down.

**Sketch**

```
const app = createApp()
await connectDatabase()
const server = app.listen(env.port, ...)

for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => shutdown(server))
```

**Must not:** define routes, or read `process.env` directly.

---

### `src/app.js`

**Purpose:** assembles the Express app and returns it. Does **not** listen.

Splitting this from `server.js` is what makes integration testing possible later — a test imports `createApp()` and hits it in-memory, no port and no real database.

**Exports:** `createApp()` → configured `express()` instance.

**Contains, in this exact order** (middleware order is behaviour, not style):

1. `express.json()` — body parsing.
2. `express.urlencoded({ extended: true })` — optional, if you accept form posts.
3. `requestLogger` — before routes, so it sees every request.
4. A `GET /health` route returning `{ status: 'ok' }` — used by deploy platforms.
5. `app.use('/api/v1', routes)` — the one mount point for all features.
6. `app.use(notFound)` — after all routes.
7. `app.use(errorHandler)` — **last**, always.

**Must not:** call `listen`, connect to Mongo, or import any `*.model.js`.

> Express 5 note: the old `app.get('*', ...)` catch-all no longer works with a bare `'*'` string. Use `app.use(notFound)` as shown.

---

## `src/config/`

### `config/env.js`

**Purpose:** the single file in the project allowed to read `process.env`. Every other file imports the validated object.

The payoff: a missing `MONGO_URI` crashes at startup with a clear message, instead of surfacing as a confusing timeout thirty seconds into runtime.

**Exports**

| Export | Description |
|---|---|
| `env` | Frozen object: `{ nodeEnv, port, mongoUri }` |
| `isProduction` | Boolean, `nodeEnv === 'production'` |

**Contains**

- A `required(key)` helper that logs and exits if a variable is absent.
- Type coercion — `port` must be `Number(process.env.PORT)`, since env values are always strings.
- Defaults for optional values: `nodeEnv → 'development'`, `port → 3000`.
- `MONGO_URI` marked required, with **no fallback** — a default connection string is how you accidentally write test data to a real database.

**Loading `.env`:** no `dotenv` dependency needed. Node 20.6+ reads it natively:

```json
"scripts": {
  "start": "node --env-file=.env src/server.js",
  "dev":   "node --watch --env-file=.env src/server.js"
}
```

---

### `config/database.js`

**Purpose:** owns the Mongoose connection lifecycle. The only file that calls `mongoose.connect`.

**Exports**

| Export | Description |
|---|---|
| `connectDatabase()` | Awaits connection; rejects on failure |
| `disconnectDatabase()` | Closes cleanly, for shutdown and tests |

**Contains**

- `mongoose.connect(env.mongoUri)`.
- Connection event listeners registered **before** connecting: `error`, `disconnected`, optionally `reconnected`.
- Optional global settings such as `mongoose.set('strictQuery', true)`.
- In development only, `mongoose.set('debug', true)` to log queries — guard with `isProduction`.

**Must not:** `process.exit()` on failure. Throw and let `server.js` decide — that keeps this module usable from a test or script that wants to handle failure differently.

---

## `src/routes/`

### `routes/index.js`

**Purpose:** the aggregator. One place to see every URL surface the API exposes.

**Exports:** default `express.Router()`.

**Contains**

- One `router.use('/users', userRoutes)` line per module.
- Nothing else — no handlers, no logic, no middleware. If this file grows past a list of mounts, something belongs in a module instead.

Adding a module means adding exactly one line here. That is the whole point of the file.

---

## `src/middleware/`

### `middleware/requestLogger.js`

**Purpose:** one log line per request.

**Exports:** `requestLogger(req, res, next)`.

**Contains**

- Timestamp captured at entry via `process.hrtime.bigint()`.
- A `res.on('finish', ...)` listener that logs method, `originalUrl`, `res.statusCode`, and elapsed ms.
- Uses `finish` rather than logging up front, because status code isn't known until the response is sent.
- Calls `next()` synchronously — never blocks the request.

---

### `middleware/validate.js`

**Purpose:** rejects malformed input **before** it reaches a controller.

Without this, bad input reaches Mongoose and surfaces as a 500 where the caller deserves a 400 naming the offending field.

**Exports:** `validate(schema)` → middleware. A factory, not a middleware itself.

**Contains**

- Signature accepting which part of the request to check: `validate({ body, params, query })`.
- On success, assigns the parsed/coerced result back onto `req` so the controller reads clean, typed values.
- On failure, `next(ApiError.badRequest('Validation failed', details))` where `details` lists field paths and messages.
- Never sends a response itself — it delegates to `errorHandler`.

**Decision needed:** the schema format. `zod` is the current default (`schema.safeParse`) and worth the dependency. A hand-rolled checker keeps the project at two dependencies. Either works — pick one and keep `user.validation.js` consistent with it.

---

### `middleware/asyncHandler.js`

**Purpose:** forwards rejected promises from async handlers to `errorHandler`.

**Exports:** `asyncHandler(fn)` → `(req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`.

**Note:** Express 5 already forwards async rejections automatically, so this is optional here — unlike in Express 4, where omitting it meant a hung request. Keep it if you prefer the intent explicit at each route; drop it if you'd rather rely on the framework. Don't do both inconsistently.

---

### `middleware/notFound.js`

**Purpose:** turns an unmatched route into a 404 that flows through the normal error path.

**Exports:** `notFound(req, res, next)`.

**Contains**

- A single line: `next(ApiError.notFound(...))`, with the method and URL in the message.

**Must not:** send a response. Handing off to `errorHandler` is what keeps 404s in the same JSON shape as every other error.

---

### `middleware/errorHandler.js`

**Purpose:** the one place that converts any thrown value into an HTTP response.

**Exports:** `errorHandler(err, req, res, next)` — **four** parameters. Express identifies error middleware by arity; drop to three and it silently becomes normal middleware that never runs.

**Contains** a mapping from error type to status code:

| Incoming error | Status | Notes |
|---|---|---|
| `ApiError` | `err.statusCode` | Already intentional — pass through |
| `err.name === 'ValidationError'` | 400 | Mongoose schema validation; flatten `err.errors` into field messages |
| `err.name === 'CastError'` | 400 | Malformed `ObjectId` in a URL param |
| `err.code === 11000` | 409 | Duplicate key — read the field name from `err.keyPattern` |
| anything else | 500 | Unexpected — log the full stack |

Also contains:

- A consistent response body: `{ success: false, message, details? }`.
- Stack trace included **only** when `!isProduction` — leaking internals in production is an information disclosure.
- Full server-side logging for 5xx, regardless of environment.
- A guard for `res.headersSent`: if a response already started, delegate to `next(err)` rather than trying to write twice.

Getting the 11000 case right matters for your current `User` model — the `unique: true` on `email` produces exactly this error, and it should read as a 409 conflict, not a 500.

---

## `src/modules/user/`

Five files per domain. Copy this shape for `post/`, `order/`, and so on.

### `user.model.js`

**Purpose:** the Mongoose schema — the data's shape and its database-level guarantees.

**Exports:** default the compiled model, `mongoose.model('User', userSchema)`.

**Contains**

- Field definitions with types and constraints. Your existing file already has this right: `name` (required, trimmed), `email` (required, unique, lowercase, trimmed), `age` (min 0).
- `{ timestamps: true }` for automatic `createdAt` / `updatedAt`.
- Explicit indexes for any field you query or sort on frequently.
- A `toJSON` transform if you need to strip fields from every response — the standard use is removing `password` and renaming `_id` to `id`.
- Schema hooks (`pre('save')`) for data-level concerns only, such as hashing a password.
- Instance and static methods only where they're purely about this document.

**Must not:** contain business rules that span multiple collections — those belong in the service.

**Migration:** your current `models/User.js` moves here essentially unchanged.

---

### `user.validation.js`

**Purpose:** the expected shape of incoming requests for this module.

**Exports:** one schema per operation — `createUserSchema`, `updateUserSchema`, `listUsersSchema`, `userIdParamSchema`.

**Contains**

- Required vs optional fields per operation. The key distinction: create requires `name` and `email`; update makes every field optional but requires **at least one** present.
- Format rules — email shape, `age` as a non-negative integer.
- Query coercion for list endpoints: `page` and `limit` arrive as strings and need bounds (a `limit` with no cap is a denial-of-service vector).
- Strict mode, rejecting unknown keys, so typos like `emial` fail loudly instead of being silently dropped.

**Why this is separate from the model:** validation is about the *request*; the schema is about the *stored document*. They diverge immediately — a create request may accept `passwordConfirm`, which is never stored.

---

### `user.service.js`

**Purpose:** all business logic for users. The layer worth testing.

**Exports:** named async functions — `createUser(data)`, `getUsers(options)`, `getUserById(id)`, `updateUser(id, data)`, `deleteUser(id)`.

**Contains**

- All model access — `User.find()`, `User.create()`, and friends live only here.
- Not-found decisions: query, and if the result is null, `throw ApiError.notFound('User not found')`. The controller is never handed a null.
- Pre-condition checks, such as looking up an existing email and throwing `ApiError.conflict()` before attempting the insert — a clearer error than relying on the duplicate-key catch.
- Pagination arithmetic: `skip`, `limit`, total count, and the returned `meta` block.
- `.lean()` on read-only queries, which returns plain objects and skips hydrating full documents.
- Field projection — never select fields the caller shouldn't see.

**Must not:** reference `req`, `res`, `next`, status codes, or headers. If a status code appears here, logic has leaked down from the controller.

---

### `user.controller.js`

**Purpose:** the translation layer between HTTP and the service. Each function should be short enough to read at a glance.

**Exports:** one handler per route — `create`, `list`, `getById`, `update`, `remove`.

**Contains, and only this**

1. Pull values off the request: `req.body`, `req.params.id`, `req.query`.
2. `await` the matching service function.
3. Choose the success status: 201 for create, 200 for read/update, 204 for delete.
4. Send via the `apiResponse` helper.

**Must not**

- Import mongoose or any model.
- Contain `try/catch`. Errors propagate to `errorHandler`; catching here re-scatters the error handling this architecture just centralized.
- Contain conditionals about business state — a controller deciding *whether* something is allowed means logic belongs in the service.

**Migration:** the `try/catch` in your current `POST /users` handler disappears entirely. `errorHandler` covers it, and covers it better — right now that block returns 400 for every failure, including genuine server faults.

---

### `user.routes.js`

**Purpose:** maps paths and HTTP verbs to controllers, declaring middleware per route.

**Exports:** default `express.Router()`.

**Contains**

- One line per endpoint, read left to right as path → middleware → controller:

  ```
  router.post('/',    validate({ body: createUserSchema }),   controller.create)
  router.get('/',     validate({ query: listUsersSchema }),   controller.list)
  router.get('/:id',  validate({ params: userIdParamSchema }), controller.getById)
  router.patch('/:id', validate({ body: updateUserSchema }),   controller.update)
  router.delete('/:id', controller.remove)
  ```

- Paths **relative to the mount point** — `'/'` here becomes `/api/v1/users`. Don't repeat the prefix.
- Route ordering: literal paths before parameterized ones. `/users/me` must be declared above `/users/:id`, or `:id` swallows `me`.

**Must not:** contain handler bodies. A route file is a table of contents.

---

## `src/utils/`

### `utils/ApiError.js`

**Purpose:** distinguishes *expected* failures from *bugs*.

**Exports:** default `ApiError extends Error`.

**Contains**

- Constructor `(statusCode, message, details?)`, setting `isOperational = true`.
- `Error.captureStackTrace(this, this.constructor)` so the trace starts at the throw site, not inside the constructor.
- Static factories for readability at the call site: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`.

**Why `isOperational` matters:** it's the flag `errorHandler` uses to decide "show this message to the client" versus "log a stack trace and return a generic 500." A thrown `ApiError` is a deliberate decision; a `TypeError` is a bug the client must never see the internals of.

---

### `utils/apiResponse.js`

**Purpose:** every successful response looks the same, so clients parse one format.

**Exports:** `sendSuccess(res, { statusCode, data, meta })`, and optionally `sendPaginated(res, items, pagination)`.

**Contains**

- The envelope: `{ success: true, data, meta? }`.
- Default status 200 when unspecified.
- A `meta` block for pagination — `page`, `limit`, `total`, `totalPages`.

**Trade-off worth deciding now:** an envelope adds a nesting level clients must unwrap (`response.data.data`). The gain is that pagination and future fields have a home without reshaping existing payloads. Either choice is defensible — what matters is applying it uniformly. Your current code returns bare arrays; changing that is a breaking change, so decide before there are consumers.

---

## Conventions

| Concern | Rule |
|---|---|
| Filenames | `<module>.<layer>.js` — `user.service.js`, not `service.js` |
| Folders | lowercase, singular — `modules/user/`, not `modules/Users/` |
| Service exports | named exports, one per operation |
| Controller exports | named exports matching route intent |
| Router / model exports | default export |
| Imports | always include the `.js` extension — required by ESM |
| Async | `async/await` only, never `.then()` chains in modules |

---

## Adding a module

1. `mkdir src/modules/post`
2. Create the five files: `post.model.js`, `post.validation.js`, `post.service.js`, `post.controller.js`, `post.routes.js`
3. Add one line to `routes/index.js`: `router.use('/posts', postRoutes)`

Nothing in `user/` is touched, and no middleware changes. That property — new features touch one new folder plus one line — is the measure of whether this structure is holding up.

---

## Build order

Each step leaves the app runnable, so you can verify as you go rather than debugging six new layers at once.

| # | Step | Verify with |
|---|---|---|
| 1 | `config/env.js` + `.env` + `.env.example` | App still boots; connection string no longer in source |
| 2 | `config/database.js`, split `server.js` from `app.js` | `npm run dev` connects and serves |
| 3 | `utils/ApiError.js`, `middleware/errorHandler.js`, `notFound.js` | An unknown URL returns a JSON 404, not Express's HTML page |
| 4 | `models/User.js` → `modules/user/user.model.js` | `GET /users` still returns data |
| 5 | `user.service.js`, `user.controller.js`, `user.routes.js`, `routes/index.js` | `GET /api/v1/users` works; old inline routes deleted |
| 6 | `middleware/validate.js` + `user.validation.js` | `POST` with a missing `name` returns 400 naming the field, not 500 |

Step 3 before step 5 is deliberate: once the error path exists, the controllers you write in step 5 can be written without any `try/catch` from the start.
