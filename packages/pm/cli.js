import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const boardPath = join(dirname(fileURLToPath(import.meta.url)), "board.json");

function load() {
  return JSON.parse(readFileSync(boardPath, "utf8"));
}

function save(board) {
  writeFileSync(boardPath, JSON.stringify(board, null, 2) + "\n");
}

const [command, ...rest] = process.argv.slice(2);
const board = load();

if (!command || command === "list") {
  for (const item of board.items) {
    console.log(`${item.status}\t${item.area}\t${item.id}\t${item.title}`);
  }
} else if (command === "add") {
  const [id, area, ...titleParts] = rest;
  if (!id || !area || titleParts.length === 0) {
    console.error("usage: pm add <id> <area> <title>");
    process.exit(1);
  }
  board.items.push({
    id,
    title: titleParts.join(" "),
    status: "open",
    area,
  });
  save(board);
  console.log(`added ${id}`);
} else if (command === "status") {
  const [id, status] = rest;
  const item = board.items.find((entry) => entry.id === id);
  if (!item || !status) {
    console.error("usage: pm status <id> <status>");
    process.exit(1);
  }
  item.status = status;
  save(board);
  console.log(`${id} ${status}`);
} else {
  console.error("commands: list | add | status");
  process.exit(1);
}
