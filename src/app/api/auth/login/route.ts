import { db } from "@/server/db";
import { burnTime, clearLimit, clientIp, createSession, json, rateLimited, sameOrigin, verifyPassword } from "@/server/auth";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase().slice(0, 320);
  const password = String(b?.password ?? "").slice(0, 200);
  const k1 = "login:ip:" + (await clientIp()), k2 = "login:email:" + email;
  if ((await rateLimited(k1, 30)) || (await rateLimited(k2, 8))) return json({ error: "Too many attempts. Please wait 10 minutes." }, 429);
  const u = (await (await db()).query("SELECT id, password_hash FROM users WHERE email=$1", [email]))[0];
  const ok = u ? verifyPassword(password, u.password_hash as string) : (burnTime(password), false);
  if (!ok) return json({ error: "Incorrect email or password." }, 401);
  const w = (await (await db()).query("SELECT w.suspended FROM users u JOIN workspaces w ON w.id=u.workspace_id WHERE u.id=$1", [u.id]))[0];
  if (w?.suspended) return json({ error: "This workspace is suspended. Please contact support." }, 403);
  await clearLimit(k2);
  await createSession(u.id as string);
  return json({ ok: true });
}
