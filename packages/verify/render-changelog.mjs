import { readFileSync, writeFileSync } from "node:fs";

const data = new URL("../../apps/web/public/data/", import.meta.url);
const changelog = JSON.parse(readFileSync(new URL("changelog.json", data), "utf8"));
const log = readFileSync(new URL("agent-log.jsonl", data), "utf8").trim().split(/\n/).filter(Boolean);
const items = changelog.entries.map((entry) => `<li>${entry.date} — ${escapeHtml(entry.change)}</li>`).join("\n");
const runs = log.map((line) => `<li><code>${escapeHtml(line)}</code></li>`).join("\n");
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Changelog</title>
    <link rel="stylesheet" href="./src/site.css" />
  </head>
  <body>
    <header class="site">
      <div class="wrap">
        <p class="kicker">Generated from the public ledger</p>
        <h1>Changelog</h1>
        <nav>
          <a href="./index.html">Home</a>
          <a href="./verify.html">Verification hub</a>
          <a href="./matrix.html">Accountability matrix</a>
          <a href="./protocol.html">Protocol</a>
          <a href="./changelog.html" aria-current="page">Changelog</a>
        </nav>
      </div>
    </header>
    <main class="wrap">
      <h2>Recorded changes</h2>
      <ul>
${items}
      </ul>
      <h2>Checker log</h2>
      <ul>
${runs}
      </ul>
      <p>Source files: <a href="./data/changelog.json">changelog.json</a> and <a href="./data/agent-log.jsonl">agent-log.jsonl</a>.</p>
    </main>
  </body>
</html>
`;
writeFileSync(new URL("../../apps/web/changelog.html", import.meta.url), html);
console.log("wrote changelog.html");

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}
