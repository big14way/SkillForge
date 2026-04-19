# Screenshot capture guide

The README references screenshots in this directory. The Next.js dev server
renders visually — I can't capture live images from this automation
environment, so this file lists the exact URLs + click paths to snap once
you (Gwill) run `pnpm dev` locally.

Save screenshots at **1440×900** if you can; use PNG.

## 1. Marketplace landing

- URL: `http://localhost:3000/`
- Filename: `marketplace.png`
- Setup: ensure at least one skill is registered (run a publish via the CLI first so the grid isn't empty)

## 2. Skill detail

- URL: `http://localhost:3000/skills/<tokenId>` — pick any tokenId that shows up in the grid
- Filename: `skill-detail.png`
- The page shows the INFT panel with data hash + storage URI + explorer links. Snap with the "Rent this skill" button visible.

## 3. Publish wizard — Step 3 (Preview)

- URL: `http://localhost:3000/publish`
- Filename: `publish-wizard.png`
- Click through: Content → Metadata → Preview. Capture on the preview step so the stepper shows 3 completed dots.

## 4. Rental detail — state machine

- URL: `http://localhost:3000/rentals/<rentalId>`
- Filename: `rental-state-machine.png`
- Exercise the flow end-to-end via the CLI (or wallet) so the rental reaches `Active` or `Submitted` — best visual impact.

## 5. Agent profile — Memory tab (preview mode banner)

- URL: `http://localhost:3000/agent/<your-address>`
- Filename: `agent-memory-preview.png`
- Click the "Memory" tab to get the amber "preview mode" banner. This is an
  intentional demo artefact — judges will see it and know which surface is
  live vs which is awaiting upstream 0G infrastructure.

## 6. OpenClaw CLI output

- From `packages/openclaw-skill/`: `uv run skillforge discover --category trading`
- Filename: `openclaw-discover.png`
- Capture the rich table output. If your terminal is dark-themed, the colour
  should match the web UI's visual register.

Once all six screenshots are saved in this directory, either keep their
filenames as above or update the README references accordingly.
