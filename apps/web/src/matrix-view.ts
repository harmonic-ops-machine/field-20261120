type Sector = {
  id: string;
  sector: string;
  requested: string;
  window: string;
  metric: string;
  status: string;
  source: string;
};

type PendingItem = {
  date: string;
  class: string;
  sectorId: string | null;
  quote: string;
  sourceUrl: string;
  reason: string;
  note: string;
};

const body = document.querySelector<HTMLTableSectionElement>("#matrix-body");
const pendingList = document.querySelector<HTMLUListElement>("#pending-list");

if (body) {
  const matrix = await fetch("./data/matrix.json").then((response) => response.json());
  body.replaceChildren();
  for (const sector of matrix.sectors as Sector[]) {
    const row = document.createElement("tr");
    const values = [
      sector.sector,
      sector.requested,
      sector.window,
      sector.metric,
      sector.source ? `${sector.status} Source: ${sector.source}` : sector.status,
    ];
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 1 && sector.id === "legislators") {
        cell.append("Committee review of ");
        const link = document.createElement("a");
        link.href = "./documents.html#clauses";
        link.textContent = "Clause A and Clause B";
        cell.append(link);
        cell.append(".");
      } else {
        cell.textContent = value;
      }
      row.append(cell);
    });
    body.append(row);
  }
}

if (pendingList) {
  const pending = await fetch("./data/pending.json").then((response) => response.json());
  const items = pending.items as PendingItem[];
  pendingList.replaceChildren();
  if (items.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No pending items.";
    pendingList.append(item);
  }
  for (const entry of items) {
    const item = document.createElement("li");
    item.textContent = `${entry.date} ${entry.class} — ${entry.reason} ${entry.quote} ${entry.sourceUrl} ${entry.note}`.trim();
    pendingList.append(item);
  }
}
