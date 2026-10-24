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

const dist = new URL("../web/dist/", import.meta.url);

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),

  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === "/health" || pathname === "/api/health") {
      try {
        await db.command({ ping: 1 });
        return Response.json({ status: "ok" });
      } catch {
        return Response.json({ status: "unavailable" }, { status: 503 });
      }
    }

    // API errors and unknown API paths must never fall through to Vue.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handler(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    let relative: string;
    try {
      relative = decodeURIComponent(pathname).replace(/^\/+/, "");
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    if (relative.split(/[\\/]/).includes("..") || relative.includes("\0")) {
      return new Response("Invalid path", { status: 400 });
    }
    const file = Bun.file(dist.pathname + relative);
    const page = await file.exists() ? file : Bun.file(new URL("index.html", dist));
    if (!(await page.exists())) {
      return new Response("Frontend not built. Run bun run build.", { status: 404 });
    }
    return new Response(request.method === "HEAD" ? null : page, {
      headers: { "Content-Type": page.type },
    });
  },
});

console.log(`Backend listening on ${server.url}`);
