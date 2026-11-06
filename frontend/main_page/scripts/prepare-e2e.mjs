import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next/standalone");
await fs.access(path.join(standalone, "server.js"));
await fs.cp(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
await fs.cp(path.join(root, ".next/static"), path.join(standalone, ".next/static"), { recursive: true });
console.log("Standalone app prepared for browser tests.");
