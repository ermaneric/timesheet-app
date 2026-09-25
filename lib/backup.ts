import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";

const KEEP = 30;
const PATTERN = /^timesheets-\d{4}-\d{2}-\d{2}-\d{4}\.db$/;

/** Write a consistent copy of the database into `dir` and keep the newest 30 copies. */
export function runBackup(dir: string, now = new Date()): string {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const file = path.join(dir, `timesheets-${stamp}.db`);
  fs.rmSync(file, { force: true });
  getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const old = fs
    .readdirSync(dir)
    .filter((f) => PATTERN.test(f))
    .sort()
    .reverse()
    .slice(KEEP);
  for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  return file;
}

export function lastBackupTime(dir: string): number | null {
  if (!fs.existsSync(dir)) return null;
  const times = fs
    .readdirSync(dir)
    .filter((f) => PATTERN.test(f))
    .map((f) => fs.statSync(path.join(dir, f)).mtimeMs);
  return times.length ? Math.max(...times) : null;
}

/** Back up when the last copy is more than a day old; checks hourly while the app runs. */
export function scheduleBackups(dir: string): void {
  const check = () => {
    try {
      const last = lastBackupTime(dir);
      if (last === null || Date.now() - last > 23 * 60 * 60 * 1000) {
        console.log(`Backed up timesheets to ${runBackup(dir)}`);
      }
    } catch (err) {
      console.error("Timesheet backup failed:", err);
    }
  };
  check();
  setInterval(check, 60 * 60 * 1000).unref();
}
