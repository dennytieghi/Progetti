import { it } from "@/lib/i18n/it";
import type { PollOptionRow, PollVoteRow } from "@/lib/db/types";

/** Risultati con barre: percentuali sui votanti (non sulle selezioni). */
export function PollResults({
  options,
  votes,
}: {
  options: PollOptionRow[];
  votes: PollVoteRow[];
}) {
  const totalVoters = new Set(votes.map((v) => v.voter_hash)).size;

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const count = votes.filter((v) => v.option_id === option.id).length;
        const percent = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
        return (
          <div key={option.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="font-semibold">{option.label}</span>
              <span className="shrink-0 text-[15px] text-ink-soft">
                {count} {count === 1 ? it.sondaggio.voto : it.sondaggio.voti} ({percent}
                %)
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-paper-soft border border-line">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
      <p className="text-[15px] text-ink-soft">
        {totalVoters} {totalVoters === 1 ? it.sondaggio.voto : it.sondaggio.voti}
      </p>
    </div>
  );
}
