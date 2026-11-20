import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const data = new URL("../../apps/web/public/data/", import.meta.url);
const cases = ["1RC191003776", "CAAP-26-0000625"];
const allow = JSON.parse(readFileSync(new URL("allowlist.json", data), "utf8")).urls;
const pending = JSON.parse(readFileSync(new URL("pending.json", data), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const pdfs = allow.filter((url) => url.toLowerCase().endsWith(".pdf"));
const pageUrl = "https://www.courts.state.hi.us/legal_references/records/jims_system_availability";
const page = await fetch(pageUrl);
if (!page.ok) {
  console.error(`${page.status} ${pageUrl}`);
  process.exit(1);
}
const pageBytes = Buffer.from(await page.arrayBuffer());
console.log(`kokua ${createHash("sha256").update(pageBytes).digest("hex")}`);

for (const url of pdfs) {
  const response = await fetch(url);
  if (!response.ok) {
    pending.items.push({ date: today, class: "pending", sectorId: null, quote: "", sourceUrl: url, reason: `docket fetch ${response.status}`, note: "Not a finding." });
    continue;
  }
  const text = Buffer.from(await response.arrayBuffer()).toString("latin1");
  const present = cases.filter((id) => text.includes(id));
  const other = [...text.matchAll(/(?:1RC\d{9,}|CAAP-\d{2}-\d{7})/g)].map((match) => match[0]);
  const unexpected = [...new Set(other.filter((id) => !cases.includes(id)))];
  if (present.length === 0 || unexpected.length > 0) {
    pending.items.push({
      date: today,
      class: "pending",
      sectorId: null,
      quote: "",
      sourceUrl: url,
      reason: present.length === 0 ? "PDF does not contain the letter case numbers" : `PDF also contains ${unexpected.join(", ")}`,
      note: "Pending is not a finding.",
    });
  }
}
writeFileSync(new URL("pending.json", data), JSON.stringify(pending, null, 2) + "\n");
console.log(`pdfs checked ${pdfs.length}`);
