# Handyman Timesheets

A small web app for Nathan's Handyman Service that collects employee timesheets, organizes them **by employee**, and exports the hours for entering into Jobber.

Each entry keeps the timesheet's columns in order:

**Date · Job # / Invoice # · Hours billed · Travel time · Extended travel · Truck Stock · Tip · Review bonus (RB) · # of receipts · Time Sheet notes**

Every sheet also shows the totals block from the paper sheet: **TOTAL HOURS** (hours billed + travel + extended travel), **BONUS + TIPS** (tips + review bonus), and **TRUCK STOCK**.

## Who uses it

- **Employees** log in on their phone with their name and a PIN. They send in their own weekly timesheet by photo, file, or typing it in, and see their past sheets. They can fix a sheet until the office reviews it.
- **The office** logs in with a password and gets everything below: all employees, reviewing new submissions, editing, and exporting for Jobber.

## What the office can do

| Page | Purpose |
| --- | --- |
| **Upload** | Drop in Excel (.xlsx/.xls/.ods) or CSV exports of the Google Sheet, PDFs, or phone photos of paper sheets. Each one is read into an editable table next to the original. Nothing is saved until you check it and press **Confirm & save**. |
| **Manual entry** | Type in a timesheet by hand. You can attach a photo of a handwritten sheet to see it next to the table while typing, or press **Fill in table from photo** and then fix anything it misread. |
| **Employees** | New submissions from employees waiting for review, then every employee with their timesheets grouped by week (Sunday–Saturday), totals, edit/delete, **Mark reviewed**, and PIN management. Add employees here. |
| **Export for Jobber** | Pick a week and employees, then download a **detail CSV** (one row per job, grouped by employee, in timesheet column order) or a **weekly totals CSV** (one row per employee: total hours, bonus + tips, truck stock). |

Spreadsheet uploads read the company layout directly: `Name: …` at the top, an optional `Week of` date, then a header row starting with `Date`, with rows read until `TOTAL`. A flat CSV with an `Employee` column also works and is split per employee.

Photos and PDFs are read with Claude (Anthropic API). Any values it wasn't sure of show up as warnings on the review screen.

> Jobber doesn't offer a CSV import for timesheets, so the detail CSV is laid out for entering hours into Jobber's Timesheets screen quickly, job by job.

## Running it

**To set it up at the office so employees can use it from their phones, follow [docs/SETUP-MAC.md](docs/SETUP-MAC.md).**

To try it on your own computer (requires **Node.js 22.13 or newer**):

```bash
npm install
cp .env.example .env      # set ADMIN_PASSWORD; add ANTHROPIC_API_KEY to read photos/PDFs
npm run dev               # http://localhost:3000
```

Settings (in `.env`):

| Setting | What it's for |
| --- | --- |
| `ADMIN_PASSWORD` | Office login. Required. |
| `SESSION_SECRET` | Random text that signs login cookies. Required in production (`openssl rand -hex 32`). |
| `ANTHROPIC_API_KEY` | Reading photos and PDFs. |
| `DATABASE_PATH` | Where the data file lives (default `data/timesheets.db`). |
| `BACKUP_DIR` | If set, the app saves a backup copy there once a day and keeps the latest 30. `npm run backup` makes one immediately. |

In production (`npm run build && npm start`), the app only listens on the computer it runs on (`127.0.0.1:3000`). The setup guide uses Tailscale Funnel to give it a secure public address.

## Development

```bash
npm test            # unit tests (parsers, totals, CSV export, database, logins, backups)
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
- `lib/auth.ts`, `lib/session.ts` — logins, PINs, signed session cookies, login rate limits
- `lib/backup.ts` — daily backups
- `components/EntryGrid.tsx` — editable timesheet table used for uploads, manual entry and edits
