/**
 * 757 Local — Promo expiration cleanup (Cloudflare Pages Function)
 *
 * GET/POST /scheduled/cleanup
 *   Marks all promos whose expires_at has passed as status='expired'.
 *   Protected by x-cleanup-secret header (set CLEANUP_SECRET in env).
 *
 * To run nightly, create a Cloudflare Worker with a cron trigger that
 * sends: fetch('https://757local.pages.dev/scheduled/cleanup', {
 *   method: 'POST',
 *   headers: { 'x-cleanup-secret': CLEANUP_SECRET }
 * })
 *
 * D1 binding required: DB
 * Env secret required: CLEANUP_SECRET
 */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function runCleanup(env) {
  if (!env.DB) return json({ ok: false, error: "DB not bound." }, 500);

  const now = new Date().toISOString();
  try {
    const result = await env.DB.prepare(
      `UPDATE promos
       SET status = 'expired'
       WHERE status = 'active' AND expires_at <= ?`
    )
      .bind(now)
      .run();

    return json({
      ok: true,
      expired: result.meta?.changes ?? 0,
      ran_at: now,
    });
  } catch (err) {
    console.error("cleanup failed:", err);
    return json({ ok: false, error: "DB error." }, 500);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  const secret = request.headers.get("x-cleanup-secret") || "";
  if (!env.CLEANUP_SECRET || secret !== env.CLEANUP_SECRET) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  return runCleanup(env);
}
