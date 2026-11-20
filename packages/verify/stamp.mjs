import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const data = new URL("../../apps/web/public/data/", import.meta.url);
const allow = JSON.parse(readFileSync(new URL("allowlist.json", data), "utf8")).urls;
const snapshots = JSON.parse(readFileSync(new URL("snapshots.json", data), "utf8"));
const matrix = JSON.parse(readFileSync(new URL("matrix.json", data), "utf8"));
const changelog = JSON.parse(readFileSync(new URL("changelog.json", data), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const hashes = {};

for (const url of allow) {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`${response.status} ${url}`);
    process.exit(1);
  }
  hashes[url] = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
  const previous = snapshots.sources[url]?.sha256;
  if (previous && previous !== hashes[url]) {
    console.error(`changed ${url}`);
    process.exit(2);
  }
}

for (const sector of matrix.sectors) {
  if (sector.status.startsWith("No response yet") || sector.status.startsWith("No public source")) {
    sector.status = `No public source — checked ${today}`;
  }
}
for (const url of allow) snapshots.sources[url] = { sha256: hashes[url], checked: today };
changelog.entries.push({ date: today, change: "No public source. Allowlist hashes matched." });
writeFileSync(new URL("matrix.json", data), JSON.stringify(matrix, null, 2) + "\n");
writeFileSync(new URL("snapshots.json", data), JSON.stringify(snapshots, null, 2) + "\n");
writeFileSync(new URL("changelog.json", data), JSON.stringify(changelog, null, 2) + "\n");
writeFileSync(
  new URL("agent-log.jsonl", data),
  JSON.stringify({ ts: new Date().toISOString(), kind: "stamp", model: "deterministic", gate: { ok: true, reason: "hashes unchanged" }, hashes }) + "\n",
  { flag: "a" },
);
console.log(`stamped ${today}`);
