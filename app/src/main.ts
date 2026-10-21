import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { assembleApplication } from "./assembly.ts";
import { client, db } from "./db.ts";

// Verify that MongoDB is reachable before starting the server.
await client.connect();
await db.command({ ping: 1 });
console.log("Connected to MongoDB");

const application = assembleApplication();
const gateway = createGateway({ application });

const handler = createHttpHandler({
  application,
  gateway,
    policy: httpPolicy({
    basePath: "/api",
    publicErrors: {
        INVALID_USERNAME: "INVALID_REQUEST",
        WEAK_PASSWORD: "INVALID_REQUEST",
        USERNAME_TAKEN: "CONFLICT",
        INVALID_CREDENTIALS: "UNAUTHORIZED",
        UNKNOWN_SESSION: "UNAUTHORIZED",
        INVALID_REPORT: "INVALID_REQUEST",
        REPORT_UNAVAILABLE: "NOT_FOUND",
        INVALID_MATCH_ATTRIBUTES: "INVALID_REQUEST",
        INVALID_PARTICIPANTS: "INVALID_REQUEST",
        INVALID_MESSAGE: "INVALID_REQUEST",
        CONVERSATION_UNAVAILABLE: "NOT_FOUND",
    },
    }),
});

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 3000,

  fetch(request) {
    // Temporary infrastructure check, separate from app features.
    if (new URL(request.url).pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    return handler(request);
  },
});

console.log(`Backend listening on ${server.url}`);
