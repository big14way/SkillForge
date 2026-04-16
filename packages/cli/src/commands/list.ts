import Table from 'cli-table3';
import { formatEther } from 'ethers';
import { SkillForgeClient, type Hex } from '@skillforge/sdk';
import { ui } from '../ui.js';

export interface ListOpts {
  category?: string;
  creator?: string;
}

export async function runList(opts: ListOpts): Promise<void> {
  const sdk = SkillForgeClient.fromEnv();
  ui.heading(
    opts.category
      ? `Skills — category "${opts.category}"`
      : opts.creator
        ? `Skills — creator ${opts.creator}`
        : 'Top skills',
  );

  const filter: { category?: string; creator?: Hex } = {};
  if (opts.category) filter.category = opts.category;
  if (opts.creator) filter.creator = opts.creator as Hex;
  const skills = await sdk.listSkills(filter);

  if (skills.length === 0) {
    ui.warn('no skills match that filter');
    return;
  }

  const table = new Table({
    head: ['id', 'name', 'category', 'price (OG)', 'score', 'rentals'],
    style: { head: ['cyan'] },
  });
  for (const s of skills) {
    table.push([
      s.tokenId.toString(),
      s.name.slice(0, 40),
      s.category,
      formatEther(s.pricePerUse),
      s.qualityScore.toString(),
      s.totalRentals.toString(),
    ]);
  }
  console.log(table.toString());
}
