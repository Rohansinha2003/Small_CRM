import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div><div className="text-5xl font-bold text-brand">404</div><h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Go home</Link></div>
    </main>
  );
}
