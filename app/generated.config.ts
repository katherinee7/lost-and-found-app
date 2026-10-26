import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http-policy.ts";

export default {
  assemble: assembleApplication,
  title: "Backtrack",
  wireName: "BacktrackWire",

  design: {
    version: 1,
    documents: [
      new URL("./design/compositions/Returns.md", import.meta.url),
      new URL("./design/types.md", import.meta.url),
      new URL(
        "./design/compositions/Accounts.md",
        import.meta.url,
      ),
      new URL(
        "./design/compositions/Reports.md",
        import.meta.url,
      ),
      new URL(
        "./design/compositions/Messages.md",
        import.meta.url,
      ),
    ],
  },

  projections: [
    httpWire({
      policy,
      name: "BacktrackWireHttp",
    }),
  ],
};
