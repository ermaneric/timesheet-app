# Setting up the timesheet app on the office Mac

When you're done:

- The app runs on a Mac at the office, day and night, and restarts itself after a reboot or power cut.
- Employees open a web link on their phone from anywhere, log in with their name and PIN, and send in their timesheet.
- The office logs in with a password to review, edit and export for Jobber.
- The data is backed up automatically every day.

Plan on about an hour. You type commands into **Terminal**: press ⌘+Space, type `Terminal`, and press Return. Paste each command and press Return.

---

## 1. Get the Mac ready

1. **Stop it from sleeping.** Open System Settings.
   - **Mac mini / iMac / Mac Studio:** go to **Energy**. Turn on **Prevent automatic sleeping when the display is off** and **Start up automatically after a power failure**.
   - **MacBook:** go to **Battery → Options**. Turn on **Prevent automatic sleeping on power adapter when the display is off**, and keep it plugged in.
2. **Log in automatically after a restart.** The app and the web link only run while your Mac user is logged in. Go to **System Settings → Users & Groups → Automatically log in as** and pick your user.
   - If that option is greyed out, FileVault disk encryption is on. You can either turn FileVault off (**Privacy & Security → FileVault**) or accept that after a power cut someone has to log in at the Mac before the app comes back.
3. **Install Node.js.** Go to <https://nodejs.org>, download the **LTS** installer for macOS, and run it. Check that it worked:
   ```
   node -v
   ```
   It should print `v22.13` or higher, for example `v24.x`.

## 2. Get the app

1. On GitHub, open the repository and click **Code → Download ZIP**.
2. Unzip it and move the folder somewhere permanent, such as your home folder, and name it `timesheet-app`.
3. In Terminal, go into the folder and build the app:
   ```
   cd ~/timesheet-app
   npm install
   npm run build
   ```

## 3. Settings (`.env` file)

1. Make the settings file and open it in TextEdit:
   ```
   cp .env.example .env
   open -e .env
   ```
2. Make a long random secret for logins and copy it:
   ```
   openssl rand -hex 32
   ```
3. Find your home folder path, for example `/Users/nathan`:
   ```
   echo $HOME
   ```
4. Fill in `.env` like this, using your own values:
   ```
   ADMIN_PASSWORD=pick-a-strong-office-password
   SESSION_SECRET=paste-the-random-text-from-step-2
   ANTHROPIC_API_KEY=sk-ant-...
   DATABASE_PATH=/Users/nathan/TimesheetData/timesheets.db
   BACKUP_DIR=/Users/nathan/Library/Mobile Documents/com~apple~CloudDocs/Timesheet Backups
   ```
   - **`ADMIN_PASSWORD`** is what the office types to log in. Use something long. This link will be on the internet.
   - **`ANTHROPIC_API_KEY`** lets the app read photos and PDFs. See the README for how to get one.
   - **`DATABASE_PATH`** keeps your data outside the app folder, so updating the app can never erase it.
   - **`BACKUP_DIR`** is where daily backups go. The example is an **iCloud Drive** folder, so copies also leave the building. The app keeps the latest 30.
5. Save and close TextEdit.

The app won't start if `ADMIN_PASSWORD` or `SESSION_SECRET` is missing. That's on purpose.

## 4. Keep it running with pm2

pm2 is a small program that starts the app, restarts it if it crashes, and starts it again after a reboot.

```
npm install -g pm2
cd ~/timesheet-app
pm2 start npm --name timesheets -- start
pm2 save
pm2 startup
```

- `pm2 startup` prints a command that starts with `sudo env PATH=...`. Copy that whole line, paste it, press Return, and type your Mac password.
- To check it's working, open <http://localhost:3000> in Safari on the Mac. You should see the login page.

The app only listens on the Mac itself. Nobody else can reach it until the next step.

## 5. Give it a web address with Tailscale Funnel

Tailscale Funnel gives the Mac a free, secure `https://` address that phones can open from anywhere. Employees don't install anything.

1. **Install Tailscale.**
   - Download the macOS app from <https://tailscale.com/download/mac>. Either the App Store or the standalone version works.
   - Open it, sign in (a Google or Microsoft account is fine), and allow the prompts.
   - In its menu-bar menu, make sure it's set to launch at login.
2. **Name the machine.** In the Tailscale admin console (<https://login.tailscale.com/admin/machines>), click **⋯** next to the Mac and choose:
   - **Edit machine name** → `timesheets`. This becomes part of the link.
   - **Disable key expiry**. Otherwise the link stops working after about 6 months until someone signs in again.
3. **Turn on Funnel.** In Terminal, run:
   ```
   /Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --bg 3000
   ```
   - The first time, it prints a link to turn on HTTPS and Funnel for your account. Open the link, approve it, and run the same command again.
   - When it works, it prints your public address, something like `https://timesheets.tail1234.ts.net`. That's the link for everyone.
   - `--bg` means Funnel stays on after the Mac restarts.
4. On your phone, with Wi-Fi turned off, open that address. You should see the login page.

## 6. First-time setup in the app

1. Open the address and choose **Log in → Office**. Enter your `ADMIN_PASSWORD`.
2. On the **Employees** page, use **Add employee** to add each employee with a **4–6 digit PIN**.
   - To change a PIN later, open the employee and use **Employee settings → Change PIN**.
   - **Remove PIN** blocks that person from logging in, for example when someone leaves.
3. Text each employee something like:

   > Timesheets: https://timesheets.tail1234.ts.net
   > Log in with your full name and PIN 4827.
   > Tip: open the link in Safari, tap Share → Add to Home Screen so it's an app icon.

## 7. Day to day

- **Employees:** log in, tap **Submit this week's timesheet**, and photograph the paper sheet or type in the rows. Then they check each row and tap **Send to office**. They can fix their own sheet until the office reviews it.
- **Office:**
  - New sheets show under **New from employees** on the Employees page.
  - Open one, compare it with the photo if needed, edit anything, and click **Mark reviewed**.
  - Then go to **Export for Jobber** and download the CSVs.

## Updating the app later

1. Download the new ZIP, unzip it, and replace the files in `~/timesheet-app`. Keep your `.env` file: copy it out first and back in after. Your data lives in `DATABASE_PATH`, outside the folder, so it isn't touched.
2. Rebuild and restart:
   ```
   cd ~/timesheet-app
   npm install
   npm run build
   pm2 restart timesheets
   ```

## If something's wrong

| Problem | Try |
| --- | --- |
| Link doesn't load | Is the Mac on and logged in? Run `pm2 status`: `timesheets` should say **online**. Run `/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel status` to check Funnel. |
| `pm2 status` shows errored | Run `pm2 logs timesheets --lines 50`. A message about `ADMIN_PASSWORD` or `SESSION_SECRET` means the `.env` file needs fixing. Then run `pm2 restart timesheets`. |
| Employee says "Too many attempts" | They typed a wrong PIN 10 times. They can wait 15 minutes, or you can run `pm2 restart timesheets` to clear it. |
| Photos won't read | Check `ANTHROPIC_API_KEY` in `.env` and your Anthropic account's credit balance, then run `pm2 restart timesheets`. |
| Restore from a backup | Run `pm2 stop timesheets`. Copy the backup file you want over the file at `DATABASE_PATH`, keeping the name `timesheets.db`. Then run `pm2 start timesheets`. |
| Make a backup right now | `cd ~/timesheet-app && npm run backup` |
