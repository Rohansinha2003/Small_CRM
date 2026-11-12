import { destroySession, json, sameOrigin } from "@/server/auth";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  await destroySession();
  return json({ ok: true });
}
