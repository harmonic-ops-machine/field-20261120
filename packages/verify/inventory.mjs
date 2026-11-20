import { inflateRawSync } from "node:zlib";

const NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}";

function readZip(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 < buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compressed = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(start, start + compressed);
    files.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    offset = start + compressed;
  }
  return files;
}

function stringsFrom(xml) {
  const out = [];
  const pattern = /<si[\s\S]*?<\/si>/g;
  for (const block of xml.match(pattern) || []) {
    const parts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) =>
      match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
    );
    out.push(parts.join(""));
  }
  return out;
}

export function marineSurfRows(xlsx) {
  const files = readZip(xlsx);
  const shared = stringsFrom(files.get("xl/sharedStrings.xml").toString("utf8"));
  const sheet = files.get("xl/worksheets/sheet1.xml").toString("utf8");
  const rows = [];
  for (const block of sheet.match(/<row[\s\S]*?<\/row>/g) || []) {
    const cells = [];
    let hit = false;
    for (const cell of block.match(/<c\b[^>]*>[\s\S]*?<\/c>/g) || []) {
      const type = /t="([^"]+)"/.exec(cell)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell)?.[1] || "";
      const shown = type === "s" ? shared[Number(value)] : value;
      if (shown === "67-120" || shown === "67-127" || shown === "04-021") hit = true;
      cells.push(shown);
    }
    if (hit) rows.push(cells);
  }
  return rows.map((cells) => ({
    LOCATION_NAME: cells[0],
    ADDRESS: cells[1],
    CITY: cells[2],
    ZIP: cells[3],
    HAW: cells[4],
    STATUS: cells[5],
    ELEVATOR_TYPE: cells[6],
    PWR: cells[7],
    FLOORS: cells[8],
    MFG: cells[9],
  }));
}


