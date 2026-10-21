import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { BacktrackWireHttp } from "../../generated/wire";

export const client = createHttpClient<BacktrackWireHttp>({
  baseUrl: "/api",
});
