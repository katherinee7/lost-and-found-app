import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { client, db } from "./db.ts";
import { policy } from "./http-policy.ts";

// Verify that MongoDB is reachable before starting the server.
await client.connect();
await db.command({ ping: 1 });
console.log("Connected to MongoDB");

const application = assembleApplication();
const gateway = createGateway({ application });

const handler = createHttpHandler({
  application,
  gateway,
  policy,
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
