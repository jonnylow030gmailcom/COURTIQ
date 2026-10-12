import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-6xl font-black text-primary">404</p>
      <h1 className="text-xl font-bold">Seite nicht gefunden</h1>
      <p className="text-sm text-muted-foreground">Diese Seite gibt es nicht.</p>
      <Link href="/dashboard" className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        Zum Dashboard
      </Link>
    </div>
  );
}
