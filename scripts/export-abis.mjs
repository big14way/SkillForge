#!/usr/bin/env node
/**
 * Reads Foundry build artifacts from contracts/out/ and emits typed TypeScript
 * ABI modules under packages/sdk/src/contracts/. Each module exports the ABI
 * `as const` (so viem/ethers can infer signatures) plus the contract name.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = join(repoRoot, 'contracts', 'out');
const outDir = join(repoRoot, 'packages', 'sdk', 'src', 'contracts');

const targets = [
  { name: 'SkillINFT', artifact: 'SkillINFT.sol/SkillINFT.json' },
  { name: 'SkillRegistry', artifact: 'SkillRegistry.sol/SkillRegistry.json' },
  { name: 'SkillEscrow', artifact: 'SkillEscrow.sol/SkillEscrow.json' },
];

if (!existsSync(artifactDir)) {
  console.error(`Foundry artifact dir missing: ${artifactDir}\nRun \`forge build\` first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const { name, artifact } of targets) {
  const artifactPath = join(artifactDir, artifact);
  const json = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const abi = json.abi;
  const out = `// AUTO-GENERATED from contracts/out/${artifact} — do not edit by hand.
// Regenerate with \`pnpm abi:export\`.

export const ${name}ABI = ${JSON.stringify(abi, null, 2)} as const;

export const ${name}ContractName = '${name}' as const;
`;
  const outPath = join(outDir, `${name}.ts`);
  writeFileSync(outPath, out);
  console.log(`wrote ${outPath} (${abi.length} ABI entries)`);
}

writeFileSync(
  join(outDir, 'index.ts'),
  targets
    .map(({ name }) => `export { ${name}ABI, ${name}ContractName } from './${name}.js';`)
    .join('\n') + '\n',
);
console.log('done');
