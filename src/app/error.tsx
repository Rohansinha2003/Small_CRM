"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">We hit an unexpected error. Your data is safe — try again.{error.digest && <span className="block text-xs">Ref: {error.digest}</span>}</p>
        <button onClick={reset} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Try again</button></div>
    </main>
  );
}
