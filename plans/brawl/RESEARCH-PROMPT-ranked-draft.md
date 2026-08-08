# Deep research prompt — Mythic+ Ranked drafting (Brawl Stars)

Paste this into a deep-research agent **with** your YouTube (and other) links. Do **not** mix this with the separate “questions for me” doc — that one is for the human product owner.

---

## Role

You are a competitive Brawl Stars analyst specializing in **Mythic+ / Legendary / Masters Ranked 3v3**. Your job is to extract **actionable drafting doctrine** from the attached videos and any reputable competitive sources you cite — not vibes, not ladder casual advice unless it still applies at high Ranked.

## Product context (why this research exists)

We are building a Ranked companion that:

- Syncs real player rosters (Power 11 legality)
- Tracks bans + picks on a shared trio board
- Uses coin-flip → first pick, with seat order 1st/2nd/3rd
- Uses pick sequence: **A1 → B1 → B2 → A2 → A3 → B3** (A = coin-flip winners)
- Will later suggest brawlers, and ideally **gadgets / star powers / gears / hypercharge** when owned
- Will later support **post-draft 15s ready swaps** if both teammates own both brawlers at P11

The tool is currently **too shallow** (generic role tags + personal fit). Your research must make it **think like a strong Ranked player**.

## Inputs

I will attach:

- YouTube links (pro analysis, drafting guides, high-level VODs, ranked tip videos)
- Optional: written notes / tier lists / patch context

Use those as primary evidence. When you generalize beyond them, label confidence: **High / Medium / Low** and say why.

## Deliverable format (strict)

Produce a structured report with these sections:

### 1. Draft flow truth table
Confirm or correct the pick order mechanics for current Ranked 3v3 (coin flip, ban phase if any, pick cadence, ready-phase swaps). Note if anything changed by patch/season.

### 2. Ban philosophy
- What to ban first vs later (if multi-ban)
- Map/mode dependent “auto-bans”
- When to ban a pocket vs a meta staple
- Common ban traps at Mythic+ vs true high elo

### 3. First pick doctrine (A1)
- What makes a good/safe first pick by mode family
- When first pick should be a flex vs a stake-claim
- How seat 1 skill/pocket should change A1

### 4. Double-pick windows (B1–B2 and A2–A3)
- How pros use back-to-back picks (synergy lock, counter pair, deny)
- What “passing” a counter looks like
- Communication scripts teams actually use

### 5. Last pick (B3) doctrine
- Classic last-pick jobs (hard counter, missing role, comfort lock)
- When last pick is forced comfort vs forced counter

### 6. Mode × map frameworks
For each major Ranked mode (Gem Grab, Brawl Ball, Knockout, Hot Zone, Heist, Bounty, Wipeout, others if Ranked):

- Win conditions
- Preferred comp skeletons (2–4 archetypes, not a 80-brawler list)
- Lane/position notes if relevant
- Example openers + example punishes

Prefer **skeletons** (“control + mid damage + assassin”) over endless name lists. When naming brawlers, group as **examples**, not eternal truth.

### 7. Counter & synergy graph (practical)
Give a **usable** matrix style:

- Archetype → strong into / weak into
- Notable hard counters that survive patch volatility
- Synergy pairs that are draft-defining

### 8. Loadout layer (gadgets / SP / gears / HC)
This is critical and often ignored by shallow tools:

- When loadout choice flips a matchup
- Examples of “same brawler, different gadget” draft meaning
- Which modes punish wrong gears hardest
- How a coach would phrase a loadout suggestion in 1 line mid-draft

### 9. Ready-phase swaps (15s)
- When teams swap seats/brawlers after picks
- Rules of thumb for who should end on which pick
- How comfort vs counter trades get resolved

### 10. Decision checklist (coach card)
A short mid-draft checklist a trio captain can run in <10 seconds before each pick.

### 11. Data shape for software
Propose JSON-friendly schemas we can encode, e.g.:

- `mode`, `mapTags[]`, `phase` (`ban`|`pick`|`ready`)
- `seat`, `side`, `stepIndex`
- `compNeeds[]`, `threatTags[]`
- `suggestionRules[]` with weights and hard filters
- `loadoutHints[]` keyed by brawler + matchup tags

### 12. Anti-patterns
What bad Ranked tools get wrong (and what we must not ship).

### 13. Open uncertainties
Anything the videos contradict, or that needs a human Ranked player to confirm.

## Constraints

- Prefer **process and frameworks** over patch-disposable tier spam.
- Separate **eternal principles** vs **seasonal meta**.
- Call out when advice is creator-opinion vs consensus.
- No fluff intro. Start with Draft flow truth table.

## Links

(Paste YouTube / docs below)

1.
2.
3.

---
