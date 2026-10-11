import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login">
      <h1>Document not found</h1>
      <p>It may have been deleted, or it hasn't been shared with this account.</p>
      <Link className="button" href="/docs">Go to your documents</Link>
    </main>
  );
}
