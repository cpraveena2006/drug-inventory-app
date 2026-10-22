import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI is required to create a backup.");
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDirectory = path.resolve(process.env.BACKUP_DIR || "backups", timestamp);

try {
  await mkdir(outputDirectory, { recursive: true });
} catch (error) {
  console.error("Could not create backup directory:", error.message);
  process.exit(1);
}

const processHandle = spawn("mongodump", ["--uri", uri, "--out", outputDirectory], {
  stdio: "inherit",
  shell: false,
});
processHandle.on("error", (error) => {
  console.error(error.code === "ENOENT" ? "mongodump was not found on PATH." : "Could not start mongodump.");
  process.exitCode = 1;
});
processHandle.on("close", (code) => {
  if (code !== 0) {
    console.error(`mongodump failed with exit code ${code}.`);
    process.exitCode = code || 1;
  } else {
    console.info(`MongoDB backup created in ${outputDirectory}`);
  }
});
