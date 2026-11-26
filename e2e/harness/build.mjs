// Bundles the SDK (CommonJS/TS, authored as refold.ts) into a browser global so the host page can
// load it with a plain <script> and call `new RefoldSDK.Refold(...)`. The published package is
// CommonJS and can't be imported directly in a page, so the e2e harness bundles it instead.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url)); // repo root

await build({
    entryPoints: [`${root}refold.ts`],
    bundle: true,
    format: "iife",
    globalName: "RefoldSDK",
    platform: "browser",
    target: "es2020",
    outfile: `${root}e2e/harness/refold.global.js`,
});

console.log("built e2e/harness/refold.global.js");
