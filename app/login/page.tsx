import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForms } from "./LoginForms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/" : "/me");
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <LoginForms />
    </div>
  );
}
