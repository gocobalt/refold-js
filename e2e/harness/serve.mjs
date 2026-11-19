// Minimal static server for the e2e harness directory — no extra dependency, matching the SDK's
// zero-dependency ethos. Serves e2e/harness/ (index.html + the bundled refold.global.js).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)); // e2e/harness/
const PORT = Number(process.env.E2E_PORT || 5714);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css" };

createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    let path = normalize(decodeURIComponent(url.pathname));
    if (path === "/" || path === "\\") path = "/index.html";
    const file = join(root, path);
    if (!file.startsWith(root)) {
        res.writeHead(403).end("forbidden");
        return;
    }
    try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
        res.end(body);
    } catch {
        res.writeHead(404).end("not found");
    }
}).listen(PORT, () => console.log(`e2e harness on http://localhost:${PORT}`));
