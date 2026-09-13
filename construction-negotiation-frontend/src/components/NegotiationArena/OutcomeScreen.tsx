import React, { useMemo } from "react";
import type {
  EvaluationData,
  NegotiationHistoryEntry,
  NegotiationOutcome,
  NegotiationState,
  Personality,
  ScenarioTemplate,
} from "../../types";

const AGENT_LINE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
];

interface OutcomeScreenProps {
  template: ScenarioTemplate | undefined;
  personalities: Record<string, Personality>;
  state: NegotiationState;
  evaluations: (EvaluationData | null)[];
  outcome: NegotiationOutcome | null;
  loadingOutcome: boolean;
}

function formatOffer(value: number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined) return "—";
  const unitLabel = unit && unit.trim() && unit !== "INR" ? ` ${unit}` : "";
  return `₹${Number(value).toLocaleString()}${unitLabel}`;
}

function outcomeLabel(status: string) {
  if (status === "agreement") return { title: "Agreement Reached", tone: "success" as const };
  if (status === "breakdown") return { title: "Negotiation Breakdown", tone: "danger" as const };
  return { title: "No Agreement (Max Rounds)", tone: "warn" as const };
}

function scoreColor(score: number) {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#ca8a04";
  return "#dc2626";
}

function lastEvalForAgent(
  agentName: string,
  outcomeEvals: EvaluationData[],
  turnEvals: (EvaluationData | null)[]
) {
  const fromOutcome = outcomeEvals.find((e) => e.agent_name === agentName);
  if (fromOutcome) return fromOutcome;
  return [...turnEvals].reverse().find((e) => e && e.agent_name === agentName) ?? null;
}

export const OutcomeScreen: React.FC<OutcomeScreenProps> = ({
  template,
  personalities,
  state,
  evaluations,
  outcome,
  loadingOutcome,
}) => {
  const label = outcomeLabel(state.status);
  const roundsElapsed =
    outcome?.rounds_elapsed ??
    new Set(state.history.map((h) => h.round)).size ??
    Math.min(state.round, state.max_rounds);
  const turnsElapsed = outcome?.turns_elapsed ?? state.history.length;
  const finalOffer = outcome?.final_offer ?? state.current_offer;
  const finalUnit = outcome?.final_offer_unit ?? state.current_offer_unit;
  const acceptedBy = outcome?.accepted_by ?? null;
  const outcomeEvals = outcome?.evaluations ?? [];

  const agents = template?.agents ?? state.scenario.agents;

  const concessionSeries = useMemo(() => {
    return agents.map((agent, index) => {
      const points: { round: number; offer: number; action: string }[] = [];
      state.history.forEach((entry: NegotiationHistoryEntry) => {
        if (entry.agent === agent.name && entry.offer !== null && entry.offer !== undefined) {
          points.push({
            round: entry.round,
            offer: Number(entry.offer),
            action: entry.action,
          });
        }
      });
      return {
        name: agent.name,
        icon: agent.icon,
        color: AGENT_LINE_COLORS[index % AGENT_LINE_COLORS.length],
        points,
      };
    });
  }, [agents, state.history]);

  const allOffers = concessionSeries.flatMap((s) => s.points.map((p) => p.offer));
  const minOffer = allOffers.length ? Math.min(...allOffers) : 0;
  const maxOffer = allOffers.length ? Math.max(...allOffers) : 1;
  const range = maxOffer - minOffer || 1;
  const maxRound = Math.max(state.max_rounds, ...state.history.map((h) => h.round), 1);

  const satisfactionRows = agents.map((agent) => {
    const ev = lastEvalForAgent(agent.name, outcomeEvals, evaluations);
    const score = ev?.offer_score?.score ?? 0;
    const met = ev?.offer_score?.constraints_met ?? 0;
    const total = ev?.offer_score?.constraints_total ?? agent.constraints.length;
    const concessionPct = Math.round((ev?.concession_data?.concession_rate ?? 0) * 100);
    return {
      agent,
      personality: personalities[agent.name] || "Collaborative",
      score,
      met,
      total,
      concessionPct,
      summary: ev?.offer_score?.summary ?? "Awaiting final evaluation.",
      checks: ev?.offer_score?.constraint_checks ?? [],
      opening: ev?.concession_data?.opening_offer ?? null,
    };
  });

  const avgSatisfaction = satisfactionRows.length
    ? Math.round(
        satisfactionRows.reduce((sum, row) => sum + row.score, 0) / satisfactionRows.length
      )
    : 0;

  return (
    <section className="outcome-screen" aria-label="Negotiation outcome">
      <header className={`outcome-hero outcome-hero-${label.tone}`}>
        <div>
          <p className="outcome-kicker">Outcome Screen</p>
          <h3>{label.title}</h3>
          <p>
            {template?.name || state.scenario.name} · {template?.category || state.scenario.category}
          </p>
        </div>
        <div className="outcome-hero-stats">
          <div>
            <span>Rounds elapsed</span>
            <strong>
              {roundsElapsed}
              <small> / {state.max_rounds}</small>
            </strong>
          </div>
          <div>
            <span>Turns</span>
            <strong>{turnsElapsed}</strong>
          </div>
          <div>
            <span>Avg. satisfaction</span>
            <strong style={{ color: scoreColor(avgSatisfaction) }}>{avgSatisfaction}%</strong>
          </div>
        </div>
      </header>

      <div className="outcome-grid">
        <article className="outcome-card">
          <h4>Final agreement terms</h4>
          <dl className="outcome-terms">
            <div>
              <dt>Settled value</dt>
              <dd>{formatOffer(finalOffer, finalUnit)}</dd>
            </div>
            <div>
              <dt>Deal status</dt>
              <dd>{label.title}</dd>
            </div>
            <div>
              <dt>Accepted by</dt>
              <dd>{acceptedBy || (state.status === "agreement" ? "Consensus" : "Not accepted")}</dd>
            </div>
            <div>
              <dt>Participating agents</dt>
              <dd>{agents.length}</dd>
            </div>
          </dl>
          {state.status === "agreement" && (
            <p className="outcome-terms-note">
              Binding terms reflect the last accepted offer on the table. Each agent’s objective
              score below is evaluated against this settlement.
            </p>
          )}
          {state.status !== "agreement" && (
            <p className="outcome-terms-note">
              No binding settlement was recorded. Scores below evaluate the last offer on the table
              against each agent’s constraints.
            </p>
          )}
        </article>

        <article className="outcome-card">
          <h4>Rounds elapsed</h4>
          <div className="outcome-rounds-meter">
            {Array.from({ length: state.max_rounds }, (_, i) => {
              const roundNum = i + 1;
              const used = roundNum <= roundsElapsed;
              const hadAccept = state.history.some(
                (h) => h.round === roundNum && h.action === "accept"
              );
              return (
                <div
                  key={roundNum}
                  className={`outcome-round-pip ${used ? "used" : ""} ${hadAccept ? "accepted" : ""}`}
                  title={`Round ${roundNum}`}
                >
                  {roundNum}
                </div>
              );
            })}
          </div>
          <p className="outcome-terms-note">
            Simulation used {roundsElapsed} of {state.max_rounds} allocated rounds
            {state.status === "max_rounds" ? " and hit the round ceiling." : "."}
          </p>
        </article>
      </div>

      <article className="outcome-card outcome-card-wide">
        <div className="outcome-card-header">
          <h4>Concession timeline</h4>
          <div className="outcome-legend">
            {concessionSeries.map((series) => (
              <span key={series.name} className="outcome-legend-item">
                <i style={{ background: series.color }} />
                {series.icon} {series.name}
              </span>
            ))}
          </div>
        </div>

        {allOffers.length > 1 ? (
          <svg viewBox="0 0 640 220" className="outcome-timeline-svg" role="img" aria-label="Concession timeline">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = 24 + t * 160;
              const value = maxOffer - t * range;
              return (
                <g key={t}>
                  <line x1="56" y1={y} x2="620" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x="8" y={y + 4} fontSize="11" fill="#64748b">
                    {Math.round(value).toLocaleString()}
                  </text>
                </g>
              );
            })}
            {concessionSeries.map((series) => {
              if (series.points.length === 0) return null;
              const path = series.points
                .map((p, i) => {
                  const x = 56 + ((p.round - 1) / Math.max(maxRound - 1, 1)) * 564;
                  const y = 24 + ((maxOffer - p.offer) / range) * 160;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");
              return (
                <g key={series.name}>
                  <path d={path} fill="none" stroke={series.color} strokeWidth="2.5" strokeLinejoin="round" />
                  {series.points.map((p, i) => {
                    const x = 56 + ((p.round - 1) / Math.max(maxRound - 1, 1)) * 564;
                    const y = 24 + ((maxOffer - p.offer) / range) * 160;
                    return (
                      <circle key={`${series.name}-${i}`} cx={x} cy={y} r="4.5" fill={series.color}>
                        <title>
                          {series.name} R{p.round}: {formatOffer(p.offer)} ({p.action})
                        </title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
            {Array.from({ length: maxRound }, (_, i) => {
              const roundNum = i + 1;
              const x = 56 + (i / Math.max(maxRound - 1, 1)) * 564;
              return (
                <text key={roundNum} x={x} y="210" textAnchor="middle" fontSize="11" fill="#64748b">
                  R{roundNum}
                </text>
              );
            })}
          </svg>
        ) : (
          <p className="outcome-empty">Not enough numeric offers to plot a concession timeline.</p>
        )}
      </article>

      <article className="outcome-card outcome-card-wide">
        <div className="outcome-card-header">
          <h4>Per-agent objective satisfaction</h4>
          {loadingOutcome && <span className="outcome-loading">Scoring final terms…</span>}
        </div>
        <div className="outcome-satisfaction-list">
          {satisfactionRows.map((row) => (
            <div key={row.agent.name} className="outcome-satisfaction-row">
              <div className="outcome-agent-meta">
                <span className="outcome-agent-icon">{row.agent.icon}</span>
                <div>
                  <strong>{row.agent.name}</strong>
                  <small>
                    {row.agent.role} · {row.personality}
                  </small>
                </div>
                <span className="outcome-score-chip" style={{ color: scoreColor(row.score) }}>
                  {row.score}/100
                </span>
              </div>
              <div className="outcome-bar-track">
                <div
                  className="outcome-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, row.score))}%`, background: scoreColor(row.score) }}
                />
              </div>
              <div className="outcome-sat-meta">
                <span>
                  Constraints met {row.met}/{row.total}
                </span>
                <span>Concession {row.concessionPct}%</span>
                <span>Opened at {formatOffer(row.opening, finalUnit)}</span>
              </div>
              <p className="outcome-sat-summary">{row.summary}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};
