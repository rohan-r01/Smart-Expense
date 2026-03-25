const { spawn } = require("child_process");
const path = require("path");

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, "frontend");
const isWindows = process.platform === "win32";

function startProcess(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: isWindows
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;

    console.error(`${name} exited with code ${code ?? "unknown"}. Stopping all processes.`);
    shutdown(code ?? 1);
  });

  return child;
}

const children = [];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

children.push(
  startProcess("backend", "npm", ["run", "dev:backend"], rootDir),
  startProcess("frontend", "npm", ["run", "dev"], frontendDir)
);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
