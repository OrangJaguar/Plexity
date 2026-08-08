# Plan 10 — Admin ranked pool + nav + save

## Goal

Make `/admin/brawledit` trustworthy: visible Save, curated pools actually drive Ranked dropdowns, admin nav slider matches Brawl tool quality.

## Problems (reported)

- Selected maps still showed ~100/mode in Ranked (empty curated → noisy API fallback; Save was easy to miss at page bottom)
- Admin slider clipped “Feedback” / “Brawl edit”
- No obvious Save

## Deliver

- [x] Save in header + after map pool + bottom (“Save pool” / “Save all”)
- [x] Dirty banner if unsaved
- [x] Default admin list = **selected only**; “Browse API maps to add” for the long list
- [x] If any mode is curated, never fall back to full API list for empty modes
- [x] Wider admin nav slider; shorter “Brawl” label; no thumb clipping text

## Acceptance

- [ ] You click Save → toast with map counts  
- [ ] Reload admin → selections persist  
- [ ] Ranked mode/map dropdown shows **only** curated maps for that mode  
- [ ] Admin slider: Tools | Feedback | Brawl all readable  

## Manual gate

Re-check maps per mode → **Save** → open `/brawl` → pick mode → confirm short list.

## Status: DONE (agent) — await your Save + smoke
