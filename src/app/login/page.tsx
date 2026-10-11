import { redirect } from "next/navigation";
import { getCurrentUser, listUsers } from "@/lib/auth";
import LoginOptions from "@/components/LoginOptions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/docs");
  const users = await listUsers();
  return (
    <main className="login">
      <h1>Ajaia Docs</h1>
      <p>Choose a demo account. Sign in as a second account in another browser to see sharing from both sides.</p>
      <LoginOptions users={users} />
    </main>
  );
}
