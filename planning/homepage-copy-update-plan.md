# 757 Local Homepage Block 1 Copy Update Plan

## Context
Reframing the hero section (block 1) to accurately represent the business model and marketing focus:
- **Phase 1 priority**: Get businesses registered/paying for membership listings across all 7 Hampton Roads cities
- **Phase 2**: Launch memberships, promotions, PR
- **Phase 3**: Launch first event (Virginia Beach)

Current copy emphasizes meetups/events, but the actual first-order business is business listings + AI discovery. Need to reposition around "good vibes" energy + AI-powered local business discovery while preserving brand identity.

## Current Block 1 Structure
- Headline: "The 757 Local Comeback"
- Subheading: (currently about meetups/walks)
- Body: Describes meetups/pop-ins as primary offering
- CTAs: "SEE THE NEXT MEETUP" | "PARTNER WITH US"
- Stats: "2 CITIES | Free TO ATTEND | 4 PRIORITY NICHES"

## Proposed Changes

### Headline
Keep: "The 757 Local Comeback"

### Subheading
"Support Local. Bring the Vibes."

### Body Copy
"The local business network that brings good vibes to the 757. AI-powered discovery. Real people. Real connections."

### CTAs
1. Primary: "PARTNER WITH US" (get businesses to register/pay)
2. Secondary: "EXPLORE LOCAL BUSINESSES + MEETUPS" (browse listings)

### Stats Section
Current: "2 CITIES | Free TO ATTEND | 4 PRIORITY NICHES"

Proposed updates:
- "1 ACTIVE EVENT CITY" (was "2 CITIES" - only VA Beach events launching first)
- "Free TO ATTEND" (keep as-is)
- "4 PRIORITY NICHES" (confirm what these are / if still accurate)
- Add 4th stat: "AI-POWERED DISCOVERY"

## Final Stats (User-Confirmed)
- "7 CITIES" (all Hampton Roads geographic reach, businesses can list)
- "AI-POWERED DISCOVERY" (unique competitive advantage)
- "FREE TO ATTEND" (events when they launch)
- "STARTING SUMMER 2026" (timeline for first event)

## Design Decisions (User-Confirmed)
✅ Keep both "The 757 Local Comeback" headline + "Support Local. Bring the Vibes" subheading (layered messaging)
✅ Keep block 1 pure business-focused (no events mention; save for later section)
✅ Replace "4 PRIORITY NICHES" with "STARTING SUMMER 2026" for clarity on event timeline

---

# BLOCK 3: NICHE PRIORITY SHOWCASE
✅ **NO CHANGES** — Block 3 approved as-is

---

# BLOCK 2: UPCOMING MEETUPS / EVENTS SECTION

## Current Structure
1. Section header: "NEXT MOVEMENT - FREE TO ATTEND"
2. Subheading: "Where the city actually shows up."
3. Body description
4. Event cards (currently 2 live events)
5. QR code raffle callout
6. **Email signup form** (currently positioned in middle)
7. "JOIN THE LIST" button

## Proposed Changes

### Restructure Order
Move email signup form to BOTTOM of section:
1. Header & subheading (keep as-is)
2. Event cards / Placeholder events
3. QR raffle callout
4. Email signup form (moved from top to bottom)

### Placeholder Events
- Create placeholder event cards for future launch (building a library for phase 3)
- These will be shown as "TENTATIVE" or coming soon
- When phase 1 (memberships) completes and phase 2 (promotions) starts, can email list about upcoming launch

### Social Media Integration
- Add Instagram as primary social media call-to-action
- Link/reference in this block (user to confirm placement)

## Design Decisions (User-Confirmed)
✅ Placeholder events: 2-3 more (total 4-5 visible events on page)
✅ Instagram placement: Below events in footer area (separate from "JOIN THE LIST" button)
✅ Event labels: "TENTATIVE" for placeholder events

---

## Files to Modify
- `757local/content/_index.md` (homepage content)
- `757local/themes/757local-theme/layouts/index.html` (templates if separate)

---

# BLOCK 4: PARTNER PROGRAM
✅ **NO CHANGES** — Block 4 approved as-is

---

# FOOTER SECTION

## Current State
- Logo displays as "LO CAL" (spacing/formatting issue with "757 LOCAL")
- Currently shows: "Virginia Beach · Norfolk · Hampton Roads"

## Proposed Changes
1. **Fix "757 LOCAL" logo display** (currently broken as "LO CAL")
2. **Add all 7 Hampton Roads cities** for SEO + UX

## Cities (Correct List - User Confirmed)
- Virginia Beach
- Norfolk
- Chesapeake
- Suffolk
- Portsmouth
- Hampton
- Newport News

## Design Decisions (User-Confirmed)
✅ City display: Pipe-separated (Virginia Beach | Norfolk | Chesapeake | Suffolk | Portsmouth | Hampton | Newport News)
✅ Prominence: Secondary line in footer (smaller text, below logo/main info)
✅ Footer subheading: "Bringing good vibes to 757 businesses. AI-powered visibility."
✅ Fix "LO CAL" logo display bug (should read "757 LOCAL")

---

## Verification
1. Start Hugo dev server
2. Screenshot all blocks (hero, events, niches, partner, footer)
3. Verify: block 1 copy updated, block 2 restructured with placeholders, footer fixed with all 7 cities
4. Check responsive layout on mobile
