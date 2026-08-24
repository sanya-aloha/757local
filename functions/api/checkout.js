/**
 * 757 Local — Promo Spotlight checkout (Cloudflare Pages Function)
 *
 * POST /api/checkout  (no stripe-signature header)
 *   Body: JSON form fields from the /promo page
 *   Returns: { clientSecret, sessionId }
 *   Creates a Stripe embedded checkout session for $29.
 *
 * POST /api/checkout  (with stripe-signature header)
 *   Stripe webhook handler — on checkout.session.completed,
 *   inserts the promo row into D1 with expires_at = now + 7 days.
 *
 * Env secrets required (set in Cloudflare Pages project settings):
 *   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
 * D1 binding required: DB
 */

const STRIPE_API = "https://api.stripe.com/v1";
const PRICE_CENTS = 2900;
const PROMO_DAYS = 7;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

/** Verify Stripe webhook signature using Web Crypto (no Node SDK needed). */
async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  const encoder = new TextEncoder();
  const parts = signatureHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const expectedSig = v1Part.slice(3);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${rawBody}`)
  );
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === expectedSig;
}

/** Call the Stripe REST API directly (no npm SDK). */
async function stripeRequest(path, method, params, secretKey) {
  const body =
    method === "POST" ? new URLSearchParams(flattenForStripe(params)) : null;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return res.json();
}

/** Stripe API requires nested params as foo[bar]=value */
function flattenForStripe(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenForStripe(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") {
          Object.assign(out, flattenForStripe(item, `${key}[${i}]`));
        } else {
          out[`${key}[${i}]`] = String(item);
        }
      });
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

/** Handle webhook: insert promo into D1 on checkout.session.completed */
async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  const valid = await verifyStripeWebhook(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) return json({ ok: false, error: "Invalid signature" }, 401);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "Bad JSON" }, 400);
  }

  if (event.type !== "checkout.session.completed") {
    return json({ ok: true, skipped: true });
  }

  const session = event.data.object;
  const m = session.metadata || {};
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROMO_DAYS * 86400 * 1000);

  try {
    await env.DB.prepare(
      `INSERT INTO promos
        (business_name, sector, promo_headline, promo_copy, image_url,
         cta_text, cta_url, instagram, tiktok, created_at, expires_at,
         status, stripe_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
    )
      .bind(
        m.business_name || "",
        m.sector || "",
        m.promo_headline || "",
        m.promo_copy || "",
        m.image_url || "",
        m.cta_text || "Learn More",
        m.cta_url || "",
        m.instagram || "",
        m.tiktok || "",
        now.toISOString(),
        expiresAt.toISOString(),
        session.id
      )
      .run();
  } catch (err) {
    console.error("D1 insert failed:", err);
    return json({ ok: false, error: "DB error" }, 500);
  }

  return json({ ok: true });
}

/** Handle session creation: returns clientSecret for embedded checkout */
async function handleCreateSession(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ ok: false, error: "Payment not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Bad request." }, 400);
  }

  const required = ["business_name", "sector", "promo_headline", "promo_copy", "image_url"];
  for (const f of required) {
    if (!body[f] || !String(body[f]).trim()) {
      return json({ ok: false, error: `${f} is required.` }, 400);
    }
  }

  const origin = new URL(request.url).origin;

  const sessionParams = {
    mode: "payment",
    ui_mode: "embedded",
    return_url: `${origin}/promo?success=true&session_id={CHECKOUT_SESSION_ID}`,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: String(PRICE_CENTS),
          product_data: {
            name: "757 Local 7-Day Promo Spotlight",
            description: `Feature ${body.business_name} on 757 Local for 7 days ($29 one-time)`,
          },
        },
        quantity: "1",
      },
    ],
    metadata: {
      business_name: String(body.business_name).slice(0, 499),
      sector: String(body.sector).slice(0, 499),
      promo_headline: String(body.promo_headline).slice(0, 499),
      promo_copy: String(body.promo_copy).slice(0, 499),
      image_url: String(body.image_url).slice(0, 499),
      cta_text: String(body.cta_text || "Learn More").slice(0, 499),
      cta_url: String(body.cta_url || "").slice(0, 499),
      instagram: String(body.instagram || "").slice(0, 499),
      tiktok: String(body.tiktok || "").slice(0, 499),
    },
  };

  const session = await stripeRequest(
    "/checkout/sessions",
    "POST",
    sessionParams,
    env.STRIPE_SECRET_KEY
  );

  if (!session.client_secret) {
    console.error("Stripe session error:", JSON.stringify(session));
    return json({ ok: false, error: "Could not create payment session." }, 502);
  }

  return json({
    ok: true,
    clientSecret: session.client_secret,
    sessionId: session.id,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const isWebhook = !!request.headers.get("stripe-signature");
  if (isWebhook) return handleWebhook(request, env);
  return handleCreateSession(request, env);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
    },
  });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "OPTIONS") return onRequestOptions();
  return json({ ok: false, error: "Method not allowed." }, 405);
}
