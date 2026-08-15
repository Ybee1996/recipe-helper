// When port 3000 is taken, `next dev` silently falls back to 3001. Each extra
// server writes the same .next, which tears chunks mid-write and shows up as
// `Cannot find module './331.js'` plus multi-minute compiles. Fail fast instead.
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const projectDir = path.join(__dirname, "..");
const cacheDir = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "recipe-helper",
  "webpack-cache",
);

if (process.argv.includes("--clean")) {
  fs.rmSync(path.join(projectDir, ".next"), { recursive: true, force: true });
  fs.rmSync(cacheDir, { recursive: true, force: true });
  return;
}

const socket = net.connect({ port: PORT, host: "127.0.0.1" });
socket.setTimeout(500);

socket.on("connect", () => {
  socket.destroy();
  console.error(
    `\nPort ${PORT} is already in use, most likely by an earlier \`npm run dev\`.\n` +
      `Starting a second dev server would corrupt the shared .next directory.\n` +
      `Stop the running server, or free the port, then try again.\n`,
  );
  process.exit(1);
});

const proceed = () => {
  socket.destroy();
  process.exit(0);
};

socket.on("timeout", proceed);
socket.on("error", proceed);
