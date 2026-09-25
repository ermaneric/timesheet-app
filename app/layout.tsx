import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Handyman Timesheets",
  description: "Organize employee timesheets and export hours for Jobber",
  appleWebApp: { capable: true, title: "Timesheets", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0e7c86" };

const OFFICE_NAV = [
  { href: "/", label: "Employees" },
  { href: "/upload", label: "Upload" },
  { href: "/entry/new", label: "Manual entry" },
  { href: "/export", label: "Export for Jobber" },
];

const EMPLOYEE_NAV = [
  { href: "/me", label: "My timesheets" },
  { href: "/me/submit", label: "Submit a timesheet" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const nav = session?.role === "admin" ? OFFICE_NAV : session?.role === "employee" ? EMPLOYEE_NAV : [];
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href={session?.role === "employee" ? "/me" : "/"} className="text-lg font-bold">
              Handyman Timesheets
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm font-medium">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
            {session && (
              <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm">
                <span className="muted">{session.role === "admin" ? "Office" : session.employeeName}</span>
                <button className="underline">Log out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
