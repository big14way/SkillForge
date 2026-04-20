# Screenshot capture guide

The README references screenshots in this directory. Next.js renders
visually — capturing screenshots needs a real browser. Follow the steps
below **in order** so each page has real data to show.

Tip: save at **1440×900** PNG if you can.

## Zero: seed the indexer + UI with real data

Don't skip — several pages 404 without data.

```bash
# In terminal 1 — run the indexer (keep it running for all screenshots).
cd SkillForge
set -a && source contracts/.env && set +a
node packages/indexer/dist/index.js
# Wait ~60s for backfill; the health endpoint shows "skillsIndexed": 4+

# In terminal 2 — seed a rental on-chain so /rentals/1 has something to show.
set -a && source contracts/.env && set +a
node packages/services/scripts/seed-rental.mjs --authorize
# Prints the rentalId + the direct URL. Wait another ~30s for the indexer
# to pick up the rental (re-hit /api/rentals/1 to confirm).

# In terminal 3 — boot the web app.
cd SkillForge
NEXT_PUBLIC_INDEXER_API_URL=http://127.0.0.1:4000 \
  pnpm --filter @skillforge/web dev
# Visit http://localhost:3000/
```

If `/api/skills?limit=5` returns at least one item, you're ready to start
capturing.

## 1. Marketplace landing

- **URL**: http://localhost:3000/
- **Filename**: `marketplace.png`
- The grid populates from the indexer. You should see 4 skills (tokenIds
  1 through 4) categorized as `trading`. If you see the empty state
  ("First skill on SkillForge is coming"), your indexer hasn't finished
  backfilling yet.

## 2. Skill detail

- **URL**: http://localhost:3000/skills/4
- **Filename**: `skill-detail.png`
- TokenId 4 is the newest. Shows the INFT panel with real data hash +
  storage URI + explorer links. The "Rent this skill" button links to
  `/skills/4/rent`.
- Alternative URLs (any of tokenIds `1`, `2`, `3`, or `4` work).

## 3. Publish wizard — Step 3 (Preview)

- **URL**: http://localhost:3000/publish
- **Filename**: `publish-wizard.png`
- Click through: Content (paste anything >20 chars) → Metadata (fill
  name/category/price) → Preview. Capture on the Preview step so the
  stepper shows 3 completed dots.

## 4. Rental detail — state machine

- **URL**: http://localhost:3000/rentals/1
- **Filename**: `rental-state-machine.png`
- The seed-rental script from step 0 takes the rental all the way to
  `Submitted`, so the state-machine chip strip shows 4 completed dots
  (Requested → Funded → Active → Submitted) with Verified + Completed
  still pending. Great visual.

## 5. Agent profile — Memory tab (preview mode banner)

- **URL**: http://localhost:3000/agent/0x208B2660e5F62CDca21869b389c5aF9E7f0faE89
- **Filename**: `agent-memory-preview.png`
- This is the deployer address — it's both the creator of all 4 skills
  and the renter on rental #1, so "Created" and "Rented" tabs both show
  data. Click the **Memory** tab to get the amber "preview mode" banner
  (this is intentional — judges see we're honest about which surface is
  live vs awaiting upstream 0G infrastructure).

## 6. OpenClaw CLI output

- From `packages/openclaw-skill/`: `uv run skillforge discover --category trading`
- **Filename**: `openclaw-discover.png`
- Expect a rich table of 4 rows. Keep the terminal wide enough to avoid
  wrapping; dark-themed terminal matches the web UI's visual register.

## If a page still shows "not found"

After the fixes in commit that followed screenshot feedback, every "not
found" path now shows a helpful card instead of the bare "Not found"
text. Check:

- The URL **doesn't contain literal angle brackets** — `/skills/4`, not
  `/skills/<tokenId>`.
- The **indexer is running** — `curl http://localhost:4000/api/health`.
- The **indexer has caught up** — health's `lastBlocks` should be within
  a few blocks of `cast block-number --rpc-url $GALILEO_RPC_URL`.

Once all six screenshots are saved in this directory, either keep their
filenames as listed or update the README references to match.
