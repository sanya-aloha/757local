/**
 * 757 Local — lead intake (Cloudflare Pages Function)
 * Receives custom form posts and upserts a contact into GHL with mapped
 * custom fields + tags. The GHL token lives ONLY here, as a Cloudflare
 * env secret (GHL_TOKEN). Never expose it client-side.
 *
 * Route: POST /api/lead
 * Body (JSON): { form_type: "consumer" | "raffle" | "b2b" | "vip" | "concierge", ...fields }
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

// 757LTC custom field IDs (created 2026-08-21, confirmed live 2026-08-24)
const CF_LTC = {
  account_type:        "7nVU4Gq3ErElKwkQBh0E", // MULTIPLE_OPTIONS: Merchant-Vendor, Concierge Client
  vip_access_code_used: "mEPNLmwze8EbOoo7qI4k", // TEXT
  vip_code_status:      "3NLMOLzALHTRLXSneayj", // MULTIPLE_OPTIONS: Unredeemed, Redeemed, Rejected
  niche:                "mvo97Y7poWukjWCm53i2", // MULTIPLE_OPTIONS
  retainer_tier:        "M39ogPfxTKjdHIGsyxfw", // MULTIPLE_OPTIONS: None, COLLECTIVE, NEPTUNE, ELITE VIBE (renamed 2026-08-24)
};

// Retainer tier -> billing tag. Internal tag slugs kept as the original
// tier1/tier2/tier3 names; only the customer-facing tier NAME changed.
const RETAINER_TIER_TAG = {
  "COLLECTIVE": "757ltc:billing:tier1-corporate",
  "NEPTUNE":    "757ltc:billing:tier2-marine-aviation",
  "ELITE VIBE": "757ltc:billing:tier3-estate",
};

// Slug map for the 757ltc: tag taxonomy (all tags are lowercase, GHL forces this anyway)
const LTC_ROLE_TAG = {
  "Merchant-Vendor":   "757ltc:role:vendor-partner",
  "Concierge Client":  "757ltc:role:vip-buyer",
};
const LTC_NICHE_TAG = {
  "Aviation-FBO":    "757ltc:niche:aviation-fbo",
  "Marine-Yacht":    "757ltc:niche:marine-yacht",
  "Corporate":       "757ltc:niche:corporate",
  "Estate":          "757ltc:niche:estate",
  "Local Merchant":  "757ltc:niche:local-merchant",
};

// Map the site's sector / tier labels to their tags
const SECTOR_TAG = {
  "Wellness & Boutique Fitness": "757-wellness",
  "Local Eateries & Cafes": "757-eateries",
  "Small Farmers & Growers": "757-farmers",
  "Independent Craftsmen & Makers": "757-makers",
};
const TIER_TAG = {
  "VENDOR ($22/mo)": "757ltc:billing:vendor-22",
  "FOUNDER ($99/mo)": "757ltc:billing:founder-99",
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

  const LTC_CONSENT_TEXT = "By providing your mobile number you agree to receive service and account text messages from 757 Local Trading Co. Message and data rates may apply. Message frequency varies. Reply STOP to opt out, HELP for help. See our Privacy Policy and SMS Terms.";
  const CONSENT_TEXT = {
    vip: LTC_CONSENT_TEXT,
    concierge: LTC_CONSENT_TEXT,
  };
  const consent = body.consent ? (CONSENT_TEXT[type] || "I agree to receive SMS & email from 757 Local") : "";
  if (consent) push(CF.marketing_consent, [consent]);

  if (type === "vip") {
    tags.push("757ltc:source:vip-card-qr");
    const accountType = clean(body.account_type);
    if (accountType) {
      push(CF_LTC.account_type, [accountType]);
      if (LTC_ROLE_TAG[accountType]) tags.push(LTC_ROLE_TAG[accountType]);
      if (accountType === "Merchant-Vendor") {
        payload.companyName = clean(body.business_name) || undefined;
      }
    }
    const niche = clean(body.niche);
    if (niche) {
      push(CF_LTC.niche, [niche]);
      if (LTC_NICHE_TAG[niche]) tags.push(LTC_NICHE_TAG[niche]);
    }
    const vipCode = clean(body.vip_code);
    if (vipCode) {
      push(CF_LTC.vip_access_code_used, vipCode);
      // Code is captured here, not validated. Validation/redemption is a downstream
      // GHL workflow step (Phase 4, Flow A) once a code registry exists.
      push(CF_LTC.vip_code_status, ["Unredeemed"]);
    }
  } else if (type === "concierge") {
    // Open-web concierge inquiry from /concierge — no VIP code, not gated.
    tags.push("757ltc:source:direct-inquiry", "757ltc:role:vip-buyer");
    push(CF_LTC.account_type, ["Concierge Client"]);
    const niche = clean(body.niche);
    if (niche) {
      push(CF_LTC.niche, [niche]);
      if (LTC_NICHE_TAG[niche]) tags.push(LTC_NICHE_TAG[niche]);
    }
    const tier = clean(body.retainer_tier);
    if (tier) {
      push(CF_LTC.retainer_tier, [tier]);
      if (RETAINER_TIER_TAG[tier]) tags.push(RETAINER_TIER_TAG[tier]);
    }
  } else if (type === "consumer") {
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
