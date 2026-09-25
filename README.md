# Handyman Timesheets

A small web app for Nathan's Handyman Service that collects employee timesheets, organizes them **by employee**, and exports the hours for entering into Jobber.

Each entry keeps the timesheet's columns in order:

**Date · Job # / Invoice # · Hours billed · Travel time · Extended travel · Truck Stock · Tip · Review bonus (RB) · # of receipts · Time Sheet notes**

Every sheet also shows the totals block from the paper sheet: **TOTAL HOURS** (hours billed + travel + extended travel), **BONUS + TIPS** (tips + review bonus), and **TRUCK STOCK**.

## What it does

| Page | Purpose |
| --- | --- |
| **Upload** | Drop in Excel (.xlsx/.xls/.ods) or CSV exports of the Google Sheet, PDFs, or phone photos of paper sheets. Each one is read into an editable table next to the original. Nothing is saved until you check it and press **Confirm & save**. |
| **Manual entry** | Type in a timesheet by hand. You can attach a photo of a handwritten sheet to see it next to the table while typing, or press **Fill in table from photo** and then fix anything it misread. |
| **Employees** | Every employee, with their timesheets grouped by week (Sunday–Saturday), totals, and edit/delete. |
| **Export for Jobber** | Pick a week and employees, then download a **detail CSV** (one row per job, grouped by employee, in timesheet column order) or a **weekly totals CSV** (one row per employee: total hours, bonus + tips, truck stock). |

Spreadsheet uploads read the company layout directly: `Name: …` at the top, an optional `Week of` date, then a header row starting with `Date`, with rows read until `TOTAL`. A flat CSV with an `Employee` column also works and is split per employee.

Photos and PDFs are read with Claude (Anthropic API). Any values it wasn't sure of show up as warnings on the review screen.

> Jobber doesn't offer a CSV import for timesheets, so the detail CSV is laid out for entering hours into Jobber's Timesheets screen quickly, job by job.

## Running it

Requires **Node.js 22.13 or newer** (it uses Node's built-in SQLite).

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY to read photos/PDFs
npm run dev               # http://localhost:3000
```

For production: `npm run build && npm start`.

Data is stored in `data/timesheets.db` (change with `DATABASE_PATH`). Back up that file to back up everything. The app has no login, so run it on a trusted network or put it behind a login/VPN if you host it online. Serverless hosts like Vercel don't keep local files, so for those, run it on a small always-on server (or a computer in the office) instead.

## Development

```bash
npm test            # unit tests (parsers, totals, CSV export, database)
npm run typecheck
node scripts/make-sample.mjs   # regenerate tests/fixtures/sample-timesheet.xlsx
```

Key files:

- `lib/fields.ts` — the column list and order used everywhere
- `lib/parse/spreadsheet.ts` — Excel/CSV reader
- `lib/parse/vision.ts` — photo/PDF reader (Claude)
- `lib/totals.ts` — totals block math
- `lib/export/csv.ts` — CSV exports
- `lib/db.ts` — SQLite storage
- `components/EntryGrid.tsx` — editable timesheet table used for uploads, manual entry and edits
