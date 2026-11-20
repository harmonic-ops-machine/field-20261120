import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../../apps/web/dist/", import.meta.url);
const pages = readdirSync(dist).filter((name) => name.endsWith(".html"));
const local = new Set(pages);
const allow = JSON.parse(readFileSync(new URL("../../apps/web/public/data/allowlist.json", import.meta.url), "utf8")).urls;
const hrefs = new Set();

for (const page of pages) {
  const html = readFileSync(new URL(page, dist), "utf8");
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith("http") || href.startsWith("mailto:")) continue;
    const path = href.split("#")[0].replace(/^\.\//, "");
    if (path) hrefs.add(path);
  }
}

const missing = [...hrefs].filter((path) => !local.has(path) && !readExists(path));
if (missing.length) {
  console.error("missing in-site files:\n" + missing.join("\n"));
  process.exit(1);
}

for (const url of allow) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    console.error(`${response.status} ${url}`);
    process.exit(1);
  }
  console.log(`${response.status} ${url}`);
}
console.log(`in-site files ${hrefs.size}`);

function readExists(path) {
  try {
    readFileSync(new URL(path, dist));
    return true;
  } catch {
    return false;
  }
}
