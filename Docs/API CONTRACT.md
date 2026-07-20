# API Contract & Conventions

This file is the single source of truth for how the frontend and backend communicate.
It is written **rules-first**: instead of only listing endpoints, it defines conventions so complete
that any new endpoint's names, shapes, and behavior can be *derived* from the rules.
If two people (or two AI tools) follow this doc independently, they should produce identical names.

**Golden rule:** if a name or shape isn't derivable from the rules below, it doesn't exist yet.
Add it to the Vocabulary table first, then code it.

---

## 1. The Vocabulary (single dictionary of terms)

Every noun used anywhere in the API must appear in this table. This kills the
`user_name` vs `username` vs `userName` problem at the root: there is exactly one
canonical word for each concept, and all other names are derived from it mechanically.

| Concept              | Canonical term | Never use instead              |
|----------------------|----------------|--------------------------------|
| A person with an account | `user`     | account, member, person, profile |
| Display name         | `displayName`  | username, name, handle         |
| Login identifier     | `email`        | userEmail, emailAddress, mail  |
| Unique identifier    | `id`           | uid, userId (inside its own object), key |
| Creation timestamp   | `createdAt`    | created, dateCreated, timestamp |
| Update timestamp     | `updatedAt`    | modified, lastUpdated          |

**Add every new concept here BEFORE using it in code.** One row per concept.
When referencing another resource's id from inside a different object, use `<resource>Id`
(e.g., a post object contains `authorId`, not `author_id`, not `userId` unless the resource is literally `user`).

---

## 2. Derivation rules (how every name is generated)

Given a resource named `widget`, ALL of the following are now fixed — nobody decides them per-endpoint:

| Thing                  | Rule                              | Example for `widget`        |
|------------------------|-----------------------------------|-----------------------------|
| Collection URL         | `/api/<plural>`                   | `/api/widgets`              |
| Single-item URL        | `/api/<plural>/:id`               | `/api/widgets/:id`          |
| JSON field casing      | camelCase, always                 | `widgetType`, not `widget_type` |
| URL casing             | lowercase, kebab-case if multiword| `/api/widget-parts`         |
| Its own id field       | always just `id`                  | `{ "id": 7 }`               |
| Foreign key field      | `<resource>Id`                    | `{ "widgetId": 7 }`         |
| Boolean fields         | `is<X>` or `has<X>`               | `isActive`, `hasImage`      |
| Timestamps             | `<verb>edAt`, ISO 8601 UTC string | `createdAt: "2026-07-15T14:30:00Z"` |
| List response key      | always `items`                    | `{ "items": [...] }`        |
| Query param casing     | camelCase                         | `?sortBy=createdAt`         |

**HTTP verb meanings (fixed, no exceptions):**

| Verb   | Meaning                     | Success status |
|--------|-----------------------------|----------------|
| GET    | Read, never changes data    | 200            |
| POST   | Create a new thing          | 201            |
| PUT    | Replace/update a whole thing| 200            |
| PATCH  | Update part of a thing      | 200            |
| DELETE | Remove a thing              | 200            |

Non-CRUD actions use `POST /api/<plural>/:id/<verb>` — e.g. `POST /api/users/:id/logout`.

---

## 3. The universal response envelope

**Every** response, from **every** endpoint, without exception, uses one of these two shapes.
Frontend code can therefore be written once, generically, and never guess.

**Success:**
```json
{
  "success": true,
  "data": { }
}
```
- Single item → `data` is the object: `"data": { "id": 1, ... }`
- List → `data` is `{ "items": [...], "total": 42 }`
- Nothing to return (e.g. DELETE) → `"data": null`

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation"
  }
}
```

**Error codes are a fixed enum** (add new ones to this list first, in SCREAMING_SNAKE_CASE):

| Code                | HTTP status | Meaning                                  |
|---------------------|-------------|------------------------------------------|
| `VALIDATION_ERROR`  | 400         | Bad/missing fields in the request         |
| `UNAUTHORIZED`      | 401         | Not logged in / bad token                 |
| `FORBIDDEN`         | 403         | Logged in, but not allowed to do this     |
| `NOT_FOUND`         | 404         | Resource doesn't exist                    |
| `CONFLICT`          | 409         | e.g. email already registered             |
| `SERVER_ERROR`      | 500         | Something broke on the backend            |

Never return HTTP 200 with `success: false`. Status code and body must agree.

---

## 4. Auth (fixed pattern)

- Login returns `{ "success": true, "data": { "token": "...", "user": { ... } } }`
- Every authenticated request sends the header: `Authorization: Bearer <token>`
- A missing/expired token always returns `UNAUTHORIZED` (401) in the standard error envelope.
- The frontend treats any 401 as "redirect to login" — backend never needs to special-case this.

---

## 5. Dates, IDs, and other fixed data rules

- **Dates:** always ISO 8601 UTC strings — `"2026-07-15T14:30:00Z"`. Never Unix timestamps, never localized strings. Frontend converts for display.
- **IDs:** always numbers (change this row once, here, if you switch to UUIDs — then it's strings everywhere).
- **Booleans:** real JSON `true`/`false`, never `"true"` strings, never `0`/`1`.
- **Money (if ever needed):** integer cents (`1999` = $19.99), never floats.
- **Empty lists:** `"items": []`, never `null`, never missing.
- **Null vs missing:** if a field can be empty, send it as `null` explicitly. Every field in the contract appears in every response.

---

## 6. Endpoint registry

Because of the rules above, each endpoint entry can now be SHORT — most of its behavior is already determined. Only document what the rules can't derive: which fields exist and any special logic.

### `POST /api/users` — register
- Auth: no
- Request: `{ "email": string, "password": string, "displayName": string }`
- Data returned: the created `user` object (see Resource Shapes)
- Special: duplicate email → `CONFLICT`

### `POST /api/login` — log in
- Auth: no
- Request: `{ "email": string, "password": string }`
- Data returned: `{ "token": string, "user": User }`
- Special: bad credentials → `UNAUTHORIZED`

### `GET /api/users/:id` — fetch a user
- Auth: yes
- Data returned: the `user` object

*(Add new endpoints below using the same 4-line format. If you need more than 4 lines, you're probably breaking a convention — check sections 2–5 first.)*

---

## 7. Resource shapes

The full field list for each resource. Every field name must exist in the Vocabulary (section 1).

### User
```json
{
  "id": 1,
  "email": "om@example.com",
  "displayName": "Om",
  "createdAt": "2026-07-15T14:30:00Z",
  "updatedAt": "2026-07-15T14:30:00Z"
}
```
*(Never include `password` or password hashes in any response.)*

*(Add new resources here as the site grows.)*

---

## 8. Process: how to add anything new

1. **New concept/word?** Add a row to the Vocabulary table (section 1).
2. **New resource?** Add its shape to section 7. All its URLs and field names are now auto-derived by section 2 — don't invent them.
3. **New endpoint?** Add a 4-line entry to section 6.
4. **Commit this file in the same PR/commit as the code that implements it.**
5. **Ping the group chat** so the other side rebuilds against the new contract.

If frontend and backend disagree at integration time, **this file wins**. Whoever's code doesn't match the file fixes their code (or proposes a change to the file — but the file changes first).

---

## 9. Instructions for the AI tools (paste this into each one)

Since the three of you use different AI coding tools (Claude Code, Antigravity, ChatGPT), each tool must be told to follow this contract. Paste the block below into:
- **Claude Code:** the repo's `CLAUDE.md`
- **Antigravity / ChatGPT:** the start of each session, or their equivalent project-instructions file

> This repository has a binding API contract in `API.md`. Before writing any code that
> sends or receives data across the frontend/backend boundary, read `API.md` in full.
> Follow its naming derivation rules exactly: camelCase JSON fields, the universal
> `{success, data}` / `{success, error: {code, message}}` envelopes, ISO 8601 UTC dates,
> the fixed error-code enum, and the URL patterns in section 2. Never invent a field name —
> if a concept isn't in the Vocabulary table (section 1), stop and add it there first,
> then use the canonical term. If existing code conflicts with `API.md`, the file wins.
