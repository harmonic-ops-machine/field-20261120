import { readFileSync, writeFileSync } from "node:fs";
import { marineSurfRows } from "./inventory.mjs";

const url = "https://labor.hawaii.gov/hiosh/files/2026/08/State-of-Hawaii-Elevator-Equipment-Inventory.xlsx";
const extractPath = new URL("../../apps/web/public/data/inventory-extract.json", import.meta.url);
const reportPath = new URL("../../apps/web/public/data/inventory-diff.md", import.meta.url);
const stored = JSON.parse(readFileSync(extractPath, "utf8"));
const response = await fetch(url);
if (!response.ok) {
  console.error(`${response.status} ${url}`);
  process.exit(1);
}
const live = marineSurfRows(Buffer.from(await response.arrayBuffer()));
const lines = ["# Inventory diff", "", `Source: ${url}`, ""];
let changed = false;
for (const row of stored.rows) {
  const next = live.find((item) => item.HAW === row.HAW);
  if (!next) {
    changed = true;
    lines.push(`- ${row.HAW} is not in the live Oahu sheet. Stored STATUS ${row.STATUS}.`);
    continue;
  }
  for (const key of Object.keys(next)) {
    if (String(row[key] ?? "") !== String(next[key] ?? "")) {
      changed = true;
      lines.push(`- ${row.HAW} ${key}: \`${row[key]}\` → \`${next[key]}\``);
    }
  }
}
if (!changed) lines.push("No Marine Surf cell changed.");
writeFileSync(reportPath, lines.join("\n") + "\n");
writeFileSync(new URL("../../apps/web/public/data/inventory-changed.txt", import.meta.url), changed ? "yes\n" : "no\n");
console.log(lines.slice(4).join("\n") || "No Marine Surf cell changed.");
