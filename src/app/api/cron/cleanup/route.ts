import { timingSafeEqual } from "node:crypto";
import { cleanup } from "@/server/db";

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true, removed: await cleanup() });
}
