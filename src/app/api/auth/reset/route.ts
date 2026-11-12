import { db } from "@/server/db";
import { audit, claimToken, clientIp, hashPassword, json, rateLimited, sameOrigin } from "@/server/auth";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  if (await rateLimited("reset:" + (await clientIp()), 15, 3600)) return json({ error: "Too many attempts." }, 429);
  const b = await req.json().catch(() => null);
  const token = String(b?.token ?? ""), password = String(b?.password ?? "");
  if (password.length < 8 || password.length > 200) return json({ error: "Password must be at least 8 characters." }, 400);
  const hash = hashPassword(password);
  const d = await db();
  const t = await d.tx(async (q) => {
    const t = await claimToken(token, "reset", q); // single use, even under concurrent requests
    if (!t?.userId) return null;
    await q("UPDATE users SET password_hash=$2 WHERE id=$1", [t.userId, hash]);
    await q("DELETE FROM sessions WHERE user_id=$1", [t.userId]); // sign out everywhere
    return t;
  });
  if (!t?.userId) return json({ error: "This reset link is invalid or has expired." }, 400);
  const u = (await d.query("SELECT name FROM users WHERE id=$1", [t.userId]))[0];
  await audit(t.workspaceId, String(u?.name ?? "User"), "Password was reset");
  return json({ ok: true });
}
