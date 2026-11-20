# field-20261120

Isolated project. The web app compiles the November 20, 2026 open letter and cited public records.

## Layout

- `apps/web` — static Vite site: home, verification hub, matrix, documents
- `inbox/` — source PDF
- `packages/pm` — local board
- `packages/orchestration` — local job runner

The printed short path is `verify.html`. Home stays the front door and points recipients there first.

The HIOSH workbook is the equipment link on the hub because it names HAW #67-127 and #67-120. eCourt* Kōkua is the docket link. Inventory STATUS is copied as the workbook field. It is not treated as a permit-expiration date.

Matrix cells open as “No response yet — as of November 20, 2026”. A later public source is required before a cell changes. The empty cell is the whole non-response record.

## Production

Vercel serves the Vite build of `apps/web` from the `main` branch. The checker is `.github/workflows/verify.yml`. It fetches the allowlist, and a model proposal is accepted only by `packages/verify/gate.mjs`. The rules are on `protocol.html`. No remote has been created and the site is not deployed.

## Commands

```powershell
npm install
npm run dev
npm run build
```

No git remote. No accounts. No personal-data collection.
