import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";

const dist = fileUrl("../../apps/web/dist");
const uipa = "All operating permits, temporary permits, safety-test and inspection reports, violation notices, abatement records, and DLIR invoices (including Invoices #80648 and #80649 and all post-April 30, 2019 permit issuances) from January 1, 2017 through December 31, 2020 for Marine Surf Waikiki, 364 Seaside Avenue, Honolulu, HI 96815, State IDs HAW #67-127 and HAW #67-120.";
const classes = ["no_public_action", "source_confirmed_action", "unsupported_assertion", "delegation_without_record", "pending"];
const types = { ".html": "text/html", ".pdf": "application/pdf", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const file = path === "/" ? "index.html" : path.replace(/^\//, "");
  try {
    const body = readFileSync(join(dist, file));
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("missing");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const hub = await fetch(`http://127.0.0.1:${port}/verify.html`).then((response) => response.text());
const protocol = await fetch(`http://127.0.0.1:${port}/protocol.html`).then((response) => response.text());
server.close();

const problems = [];
if (!hub.includes("Verification")) problems.push("verify.html did not return the hub");
if (!hub.includes(uipa)) problems.push("UIPA text does not match the letter paragraph");
for (const name of classes) {
  if (!protocol.includes(name)) problems.push(`protocol missing ${name}`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("verify.html hub, UIPA paragraph, and five protocol classes match");

function fileUrl(path) {
  return new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
}
