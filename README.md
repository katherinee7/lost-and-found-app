# Campus Lost and Found

A campus application that helps owners and finders reconnect
and coordinate the return of lost belongings.

## P1 Design

- [Problem framing and stakeholders](design.md#problem-framing-and-stakeholders)
- [Application pitch](design.md#application-pitch)
- [Concept specifications](design.md#concept-specifications)
- [Essential reactions](design.md#essential-reactions)
- [Roles of concepts](design.md#roles-of-concepts)
- [UI sketches](design.md#ui-sketches)
- [User journey](design.md#user-journey)

## P2 Implementation

- [Core user journey](p2.md)

## P3 progress

- [Saved found records, later matches, and verification](p3.md)

## Setup and local development

Use Bun 1.4.2 (the version pinned in all package manifests), Podman, and Node.js
for the separate local Vue type check. From the repository root:

```sh
bun install --cwd app --frozen-lockfile
bun install --cwd app/web --frozen-lockfile
cp app/.env.example app/.env # only if app/.env does not already exist
bun run db:up
```

Keep the existing two-terminal development workflow:

```sh
# Terminal 1
bun run --cwd app dev:backend
# Terminal 2
bun run --cwd app/web dev
```

Open the Vite address shown in terminal 2. Its `/api` proxy still forwards to
`127.0.0.1:3000`. Sessions are sent explicitly by the typed client; this app does
not use cookie-based authentication.

Before pushing, run these from the repository root:

```sh
bun run check
bun run type-check
bun run --cwd app test
```

The tests read `MONGODB_URL` from `app/.env`, create separate randomly named test
databases, and delete those databases afterward. MongoDB must be running.
`type-check` is a separate local command; deployment builds do not run Vue's
Node.js-based type checker.

## Production preview and deployment

Follow the [class deployment guide](https://61040.github.io/fa26/resources/deploying-apps/).
Stop the development backend before starting the preview on the same port:

```sh
bun run preview
```

This starts local MongoDB, builds Vue with Bun, and starts only the backend in
production mode. Open <http://127.0.0.1:3000/health>, then
<http://127.0.0.1:3000>. Ctrl+C stops the preview; MongoDB stays available for
local development. The backend also accepts `HOST` and `PORT` when running
`bun run start` directly. Defaults remain `127.0.0.1:3000`.

Enter these settings on 6.1040 Apps:

| Setting | Value |
| --- | --- |
| Repository URL | `https://github.com/katherinee7/lost-and-found-app` |
| Branch | `main` (or the branch containing your prepared commit) |
| Runtime | Bun; root `packageManager` pins `bun@1.4.2` |
| Package directories | `app` and `app/web`, on separate lines |
| Build script | `build` |
| Start script | `start` |
| Port | `3000` |
| Health check path | `/health` |

The root package contains delegation scripts and has no dependencies. Do not
list `.` as a package directory: both installable packages and their committed
lockfiles live in `app` and `app/web`. Build/start scripts run from the root.

Add MongoDB on the platform and keep its connection-string variable named
`MONGODB_URL`. Set `NODE_ENV=production`. The platform supplies `PORT` and
`HOST=0.0.0.0`. Do not copy the local `.env` or local MongoDB credentials to the
platform. `client.db()` selects the database in its connection string.
`PUBLIC_ORIGIN` is not needed by the current explicit-session authentication.

The backend serves `app/web/dist`, including a fallback to `index.html` for
frontend page reloads. `/api` requests always reach sync-engine; the typed
client keeps `baseUrl: "/api"`. `/health` (and the retained `/api/health` alias)
pings MongoDB on every request and returns 503 if the ping fails. Startup also
requires a successful database connection and ping.

Demo videos are ignored and excluded from the next commit; local copies remain.
The P2 demo still needs an external hosting link. Commit and push the prepared
changes, including the video removal, then select that exact commit to deploy.
No Git history rewrite is needed.

Preparation verified on October 24, 2026:

- Frozen installs succeeded for both packages; both existing lockfiles are tracked.
- Root build succeeded with only Bun on PATH (no Node.js).
- Backend/specification/artifact checks and the separate Vue type check passed.
- All 21 concept tests passed (41 assertions).
- Local production HTTP smoke checks passed: health, HTML and JavaScript assets,
  frontend fallback, API error routing, registration/login, and report persistence
  across a page reload. Temporary smoke-test data was removed afterward.
- Interactive browser testing and deployment to the live platform remain to do.

The build emits sync-engine browser-externalization warnings; it succeeds.
The backend check currently reports 15 diagnostic advisories.
