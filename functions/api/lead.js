/**
 * 757 Local — lead intake (Cloudflare Pages Function)
 * Receives custom form posts and upserts a contact into GHL with mapped
 * custom fields + tags. The GHL token lives ONLY here, as a Cloudflare
 * env secret (GHL_TOKEN). Never expose it client-side.
 *
 * Route: POST /api/lead
 * Body (JSON): { form_type: "consumer" | "raffle" | "b2b", ...fields }
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "fv75fGhbpyWdREppovnX";

// GHL custom field IDs (created 2026-06-08)
const CF = {
  buying_preferences: "7IpkHSRe5KDUXdmmjIPT", // MULTIPLE_OPTIONS
  business_sector:    "IU2OKuACoN08bRENK4GA", // SINGLE_OPTIONS
  partner_tier:       "G1oHZFymd505Ji77cWgD", // SINGLE_OPTIONS
  signup_source:      "LyAFoFh4e50PRiaIMLkC", // SINGLE_OPTIONS
  marketing_consent:  "URsReiu9FJ4wNPvo9L1l", // CHECKBOX
  event_attended:     "xKDHQbGUiLlzE8qGJS8s", // TEXT
};

// Map the site's sector / tier labels to their tags
const SECTOR_TAG = {
  "Wellness & Boutique Fitness": "757-wellness",
  "Local Eateries & Cafes": "757-eateries",
  "Small Farmers & Growers": "757-farmers",
  "Independent Craftsmen & Makers": "757-makers",
};
const TIER_TAG = {
  "Tier 1 - AI Directory ($49/mo)": "757-tier1-49",
  "Tier 2 - Co-Op Promo Partner ($199/mo)": "757-tier2-199",
  "Tier 3 - Ultimate Event Host ($999/mo)": "757-tier3-999",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const clean = (v) => (typeof v === "string" ? v.trim() : v);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GHL_TOKEN) {
    return json({ ok: false, error: "Server not configured." }, 500);
  }

  let body;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = {};
      for (const [k, v] of form.entries()) {
        if (body[k] !== undefined) {
          body[k] = [].concat(body[k], v); // collect repeats (multi-select)
        } else {
          body[k] = v;
        }
      }
    }
  } catch {
    return json({ ok: false, error: "Bad request." }, 400);
  }

  const type = clean(body.form_type);
  const email = clean(body.email);
  const phone = clean(body.phone);

  // Honeypot: silently accept bots without writing to GHL
  if (clean(body.company_website)) return json({ ok: true });

  if (!email && !phone) {
    return json({ ok: false, error: "Email or phone is required." }, 400);
  }

  const tags = [];
  const customFields = [];
  const push = (id, value) => {
    if (value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length))
      customFields.push({ id, field_value: value });
  };

  const payload = {
    locationId: LOCATION_ID,
    firstName: clean(body.first_name) || undefined,
    lastName: clean(body.last_name) || undefined,
    email: email || undefined,
    phone: phone || undefined,
    postalCode: clean(body.zip) || undefined,
    source: "757local.pages.dev",
  };

  const consent = body.consent ? "I agree to receive SMS & email from 757 Local" : "";
  if (consent) push(CF.marketing_consent, [consent]);

  if (type === "consumer") {
    tags.push("757-consumer-list");
    push(CF.signup_source, "Consumer List");
    const prefs = [].concat(body.buying_preferences || []).map(clean).filter(Boolean);
    push(CF.buying_preferences, prefs);
  } else if (type === "raffle") {
    tags.push("757-bucket-raffle");
    push(CF.signup_source, "Bucket Raffle");
    push(CF.event_attended, clean(body.event_attended));
    const prefs = [].concat(body.buying_preferences || []).map(clean).filter(Boolean);
    push(CF.buying_preferences, prefs);
  } else if (type === "b2b") {
    tags.push("757-b2b-applicant");
    push(CF.signup_source, "B2B Application");
    payload.companyName = clean(body.business_name) || undefined;
    const sector = clean(body.business_sector);
    const tier = clean(body.partner_tier);
    if (sector) {
      push(CF.business_sector, sector);
      if (SECTOR_TAG[sector]) tags.push(SECTOR_TAG[sector]);
    }
    if (tier) {
      push(CF.partner_tier, tier);
      if (TIER_TAG[tier]) tags.push(TIER_TAG[tier]);
    }
  } else {
    return json({ ok: false, error: "Unknown form type." }, 400);
  }

  payload.tags = tags;
  payload.customFields = customFields;

  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GHL_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ ok: false, error: "Could not save your info. Please try again." , status: res.status, detail }, 502);
  }

  return json({ ok: true });
}

export async function onRequest(context) {
  // Only POST is supported; anything else gets a clear 405.
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed." }, 405);
}
