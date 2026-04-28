import Link from 'next/link';
import type { ApiSkill } from '@/lib/api-client';
import { formatOG, relativeTime, shortAddress } from '@/lib/utils';
import { ReputationTrajectory } from '@/components/badges/ReputationTrajectory';

export function SkillCard({ skill }: { skill: ApiSkill }) {
  return (
    <Link
      href={`/skills/${skill.tokenId}`}
      className="card group flex flex-col justify-between gap-3 transition-colors hover:border-accent/30 hover:bg-bg-hover"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white line-clamp-2">{skill.name}</h3>
          <ReputationTrajectory tokenId={skill.tokenId} limit={10} size="sm" />
        </div>
        {skill.description && (
          <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{skill.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="pill">{skill.category}</span>
          <span className="text-zinc-500">
            by <span className="mono text-zinc-400">{shortAddress(skill.creator)}</span>
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{formatOG(skill.pricePerUse)}</div>
          <div className="text-[11px] text-zinc-500">
            {skill.totalRentals} rental{skill.totalRentals === 1 ? '' : 's'} ·{' '}
            {relativeTime(skill.createdAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}
