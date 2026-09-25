import { scheduleBackups } from "./backup";

/** Server start-up: refuse to run in production without login settings, and start backups. */
export function onServerStart(): void {
  if (process.env.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
    const secret = process.env.SESSION_SECRET ?? "";
    if (secret.length < 16) missing.push("SESSION_SECRET (at least 16 characters)");
    if (missing.length) {
      console.error(`\nTimesheet app can't start: set ${missing.join(" and ")} in the .env file. See docs/SETUP-MAC.md.\n`);
      process.exit(1);
    }
  }
  if (process.env.BACKUP_DIR) scheduleBackups(process.env.BACKUP_DIR);
}
