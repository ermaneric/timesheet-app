// Makes a backup copy of the timesheet database right now.
// Run from the app folder: npm run backup
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const source = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "timesheets.db");
const dir = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
if (!fs.existsSync(source)) {
  console.error(`No database found at ${source}`);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const file = path.join(dir, `timesheets-${stamp}.db`);
fs.rmSync(file, { force: true });
const db = new DatabaseSync(source);
db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
db.close();
console.log(`Backed up to ${file}`);
