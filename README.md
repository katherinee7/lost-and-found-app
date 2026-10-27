# Backtrack

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

## P3: Beta

- [User journey](p3.md)
- [P3 demo video](https://youtu.be/K1QgDSjdvWE)
- [Visual design study](images/visual_study.pdf)

## P4: Code complete

- [Final design document](p4-design.md)
- [Live app](https://backtrack.mit-sdg.dev/)
- [Final demo video](REPLACE_WITH_P4_VIDEO_URL)
- [Current concept specifications and compositions](app/design/)

### Testing and validation

- [Automated tests](app/tests/)
- Latest full-suite results:
  [standard](app/tests/results/final-tests.txt) and
  [randomized](app/tests/results/final-tests-randomized.txt)
- [Manual return-confirmation checklist](app/tests/manual-returns.md)

## Setup

Prerequisites: Bun 1.4.2, Podman with Compose, and Node.js
for Vue type checking.

From the repository root:

```sh
bun install --cwd app --frozen-lockfile
bun install --cwd app/web --frozen-lockfile
cp app/.env.example app/.env
```

Only copy `.env.example` if `app/.env` does not already exist.

Start your Podman machine if needed, then start MongoDB:

```sh
podman machine start
bun run db:up
```

## Run locally

Run these in separate terminals from the repository root:

```sh
bun run --cwd app dev:backend
```

```sh
bun run --cwd app/web dev
```

Open the URL printed by Vite.

## Run tests and checks

With MongoDB running, execute from the repository root:

```sh
bun run --cwd app test
bun run check
bun run type-check
bun run build
```

Tests use `MONGODB_URL` from `app/.env`, create temporary test
databases, and remove them afterward. Before each database test, the suite
clears its temporary database and recreates its concept instances or application
assembly. Each test creates its own required data through concept actions.
The application database is not cleared or modified.

[All saved test output](app/tests/results/).

## Local production preview

```sh
bun run preview
```

Open http://127.0.0.1:3000. This builds and serves the Vue frontend through the
backend, with API requests under `/api`. It uses the local database configured
in `app/.env`; the deployed app has its own database. The preview is optional
after deployment, but useful for checking production behavior locally.
