import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const data = new URL("../../apps/web/public/data/", import.meta.url);
const letter = readFileSync(new URL("../../apps/web/public/letter.pdf", import.meta.url));
const allow = JSON.parse(readFileSync(new URL("allowlist.json", data), "utf8")).urls;
const snapshots = JSON.parse(readFileSync(new URL("snapshots.json", data), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const sealed = { date: today, letterPdf: sha(letter), sources: {} };

for (const url of allow) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  sealed.sources[url] = sha(Buffer.from(await response.arrayBuffer()));
}
snapshots.seal = sealed;
writeFileSync(new URL("snapshots.json", data), JSON.stringify(snapshots, null, 2) + "\n");

const protocolPath = new URL("../../apps/web/protocol.html", import.meta.url);
let protocol = readFileSync(protocolPath, "utf8");
const mark = `<p id="seal">Send-day seal ${today}. letter.pdf SHA-256 ${sealed.letterPdf}.</p>`;
protocol = protocol.includes('id="seal"')
  ? protocol.replace(/<p id="seal">[\s\S]*?<\/p>/, mark)
  : protocol.replace("<footer>", `${mark}\n      <footer>`);
writeFileSync(protocolPath, protocol);
console.log(mark);

function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
