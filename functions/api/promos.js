/**
 * 757 Local — Active promos query (Cloudflare Pages Function)
 *
 * GET /api/promos
 *   Returns JSON array of currently active promo rows.
 *   The homepage carousel JS fetches this on page load.
 *
 * D1 binding required: DB
 */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) return json([], 200);

  try {
    const now = new Date().toISOString();
    const { results } = await env.DB.prepare(
      `SELECT id, business_name, sector, promo_headline, promo_copy,
              image_url, cta_text, cta_url, instagram, tiktok,
              created_at, expires_at
       FROM promos
       WHERE status = 'active' AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
      .bind(now)
      .all();

    return json(results || []);
  } catch (err) {
    console.error("promos query failed:", err);
    return json([], 200);
  }
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
