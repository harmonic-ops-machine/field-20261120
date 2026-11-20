import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gateProposal } from "./gate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = join(root, "apps", "web", "public", "data");
const promptPath = join(root, "apps", "web", "public", "prompts", "proposal.txt");
const today = new Date().toISOString().slice(0, 10);

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

function writeJson(name, value) {
  writeFileSync(join(dataDir, name), JSON.stringify(value, null, 2) + "\n");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function appendLog(entry) {
  const line = JSON.stringify(entry) + "\n";
  writeFileSync(join(dataDir, "agent-log.jsonl"), line, { flag: "a" });
}

async function fetchUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  const text = type.includes("html") || url.endsWith("/")
    ? bytes.toString("utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 20000)
    : "";
  return { bytes, text, hash: sha256(bytes) };
}

async function propose(diffText, fetchedText, primaryText) {
  const prompt = readFileSync(promptPath, "utf8");
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return {
      proposal: {
        class: "pending",
        sectorId: null,
        quote: "",
        sourceUrl: "",
        contradicts: "",
        note: "XAI_API_KEY is not set. Diff is published as pending.",
      },
      model: null,
      promptHash: sha256(prompt),
    };
  }
  const model = process.env.XAI_MODEL || "grok-4.7";
  const body = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `DIFF:\n${diffText}\n\nFETCHED:\n${fetchedText.slice(0, 12000)}\n\nPRIMARY:\n${primaryText.slice(0, 8000)}`,
      },
    ],
  };
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return {
      proposal: {
        class: "pending",
        sectorId: null,
        quote: "",
        sourceUrl: "",
        contradicts: "",
        note: `Model HTTP ${response.status}`,
      },
      model,
      promptHash: sha256(prompt),
    };
  }
  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content || "";
  let proposal;
  try {
    proposal = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    proposal = {
      class: "pending",
      sectorId: null,
      quote: "",
      sourceUrl: "",
      contradicts: "",
      note: "Model output was not JSON.",
    };
  }
  return { proposal, model, promptHash: sha256(prompt), raw };
}

function applyAccepted(matrix, proposal) {
  const status = {
    no_public_action: `No public source — checked ${today}`,
    source_confirmed_action: `Source-confirmed action — ${today}. “${proposal.quote}”`,
    unsupported_assertion: `Not supported by the primary record — ${today}. “${proposal.quote}”`,
    delegation_without_record: `Delegation without the requested record — ${today}. “${proposal.quote}”`,
  }[proposal.class];
  const targets = proposal.sectorId
    ? matrix.sectors.filter((sector) => sector.id === proposal.sectorId)
    : matrix.sectors;
  for (const sector of targets) {
    if (proposal.class !== "no_public_action" && !proposal.sectorId) continue;
    if (
      proposal.class === "no_public_action" &&
      !sector.status.startsWith("No response yet") &&
      !sector.status.startsWith("No public source")
    ) {
      continue;
    }
    sector.status = status;
    sector.source = proposal.sourceUrl || "";
  }
}

const allowlist = readJson("allowlist.json").urls;
const matrix = readJson("matrix.json");
const pending = readJson("pending.json");
const snapshots = readJson("snapshots.json");
const inventory = readJson("inventory-extract.json");
const primaryText = JSON.stringify(inventory) + "\n" + JSON.stringify(matrix);

const fetched = [];
const failures = [];
for (const url of allowlist) {
  try {
    fetched.push({ url, ...(await fetchUrl(url)) });
  } catch (error) {
    failures.push({ url, note: String(error.message || error) });
  }
}

const unchanged = failures.length === 0 && fetched.every((item) => {
  return snapshots.sources[item.url]?.sha256 === item.hash;
});

let proposal;
let model = null;
let promptHash = sha256(readFileSync(promptPath, "utf8"));
let raw = null;

if (failures.length > 0) {
  proposal = {
    class: "pending",
    sectorId: null,
    quote: "",
    sourceUrl: failures[0].url,
    contradicts: "",
    note: failures.map((item) => item.note).join("; "),
  };
} else if (unchanged || Object.keys(snapshots.sources).length === 0) {
  proposal = {
    class: "no_public_action",
    sectorId: null,
    quote: "",
    sourceUrl: allowlist[0],
    contradicts: "",
    note: unchanged
      ? "Allowlist hashes match the stored snapshot."
      : "First snapshot stored. No earlier hash to differ from.",
  };
  model = "deterministic";
} else {
  const diffText = fetched
    .map((item) => `${item.url} hash ${item.hash} previous ${snapshots.sources[item.url]?.sha256 || "none"}`)
    .join("\n");
  const fetchedText = fetched.map((item) => item.text).join("\n");
  const result = await propose(diffText, fetchedText, primaryText);
  proposal = result.proposal;
  model = result.model;
  promptHash = result.promptHash;
  raw = result.raw || null;
}

const fetchedText = fetched.map((item) => item.text).join("\n");
const decision = gateProposal(proposal, fetchedText, primaryText, allowlist);

if (decision.ok && proposal.class !== "pending") {
  applyAccepted(matrix, proposal);
  writeJson("matrix.json", matrix);
} else {
  pending.items.push({
    date: today,
    class: proposal.class,
    sectorId: proposal.sectorId,
    quote: proposal.quote || "",
    sourceUrl: proposal.sourceUrl || "",
    reason: decision.ok ? "pending is not a finding" : decision.reason,
    note: proposal.note || "",
  });
  writeJson("pending.json", pending);
}

for (const item of fetched) {
  snapshots.sources[item.url] = { sha256: item.hash, checked: today };
}
writeJson("snapshots.json", snapshots);

const changelog = readJson("changelog.json");
changelog.entries.push({
  date: today,
  change: decision.ok && proposal.class !== "pending"
    ? `Checker accepted ${proposal.class}. ${decision.reason}`
    : `Checker published a pending row. ${decision.reason}`,
});
writeJson("changelog.json", changelog);

appendLog({
  ts: new Date().toISOString(),
  kind: "checker",
  model,
  promptHash,
  inputHash: sha256(JSON.stringify(fetched.map((item) => [item.url, item.hash]))),
  proposal,
  raw,
  gate: decision,
});

console.log(JSON.stringify({ class: proposal.class, gate: decision }, null, 2));
