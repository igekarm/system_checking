import { spawn } from "node:child_process";
const api = process.argv.includes("--api");
const child = spawn(process.execPath, api ? ["server/index.js"] : ["node_modules/vite/bin/vite.js"], { stdio: "inherit", cwd: new URL("..", import.meta.url) });
child.on("exit", (code) => process.exit(code ?? 0));
