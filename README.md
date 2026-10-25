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

- [Live app](https://backtrack.mit-sdg.dev/)
- [Updated user journey](p3.md#core-user-journey)
- [Demo video on YouTube](https://youtu.be/K1QgDSjdvWE)
- [Visual design study](images/visual_study.pdf)
- [Specifications](app/design/)
- [Automated tests](app/tests/)
- [Saved test output](app/tests/results/)

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

[Saved test output](app/tests/results/)

Latest complete runs: [standard order](app/tests/results/final-tests.txt) and
[randomized order, seed 61040](app/tests/results/final-tests-randomized.txt).
