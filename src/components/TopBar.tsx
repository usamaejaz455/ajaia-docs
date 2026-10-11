import Link from "next/link";
import type { User } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export default function TopBar({ user }: { user: User }) {
  return (
    <header className="topbar">
      <Link href="/docs" className="brand"><span className="brand-mark" aria-hidden />Ajaia Docs</Link>
      <div className="who">
        <span>Signed in as <strong>{user.name}</strong></span>
        <SignOutButton />
      </div>
    </header>
  );
}
