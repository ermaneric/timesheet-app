import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handyman Timesheets",
  description: "Organize employee timesheets and export hours for Jobber",
};

const NAV = [
  { href: "/", label: "Employees" },
  { href: "/upload", label: "Upload" },
  { href: "/entry/new", label: "Manual entry" },
  { href: "/export", label: "Export for Jobber" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Handyman Timesheets
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm font-medium">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
