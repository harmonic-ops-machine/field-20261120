import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const jobs = JSON.parse(readFileSync(join(here, "jobs.json"), "utf8")).jobs;

function runJob(job) {
  const cwd = job.cwd === "repo" ? repoRoot : resolve(repoRoot, job.cwd);
  console.log(`run ${job.id}: ${job.command}`);
  const result = spawnSync(job.command, {
    cwd,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const [command, id] = process.argv.slice(2);

if (!command || command === "list") {
  for (const job of jobs) {
    console.log(`${job.id}\t${job.command}`);
  }
} else if (command === "run" && id === "all") {
  for (const job of jobs) runJob(job);
} else if (command === "run") {
  const job = jobs.find((entry) => entry.id === id);
  if (!job) {
    console.error(`unknown job ${id}`);
    process.exit(1);
  }
  runJob(job);
} else {
  console.error("commands: list | run <id|all>");
  process.exit(1);
}
