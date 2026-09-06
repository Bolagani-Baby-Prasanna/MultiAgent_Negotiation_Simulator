import React from "react";
import type { EvaluationData, NegotiationState, Personality, ScenarioTemplate } from "../../types";

interface AgentStancePanelProps {
  template: ScenarioTemplate | undefined;
  personalities: Record<string, Personality>;
  state: NegotiationState | null;
  evaluations: (EvaluationData | null)[];
  isThinking: boolean;
  humanRole?: string;
}

export const AgentStancePanel: React.FC<AgentStancePanelProps> = ({
  template,
  personalities,
  state,
  evaluations,
  isThinking,
  humanRole,
}) => {
  if (!template) return null;

  const currentAgentIndex = state
    ? state.history.length % template.agents.length
    : 0;

  return (
    <div className="stance-sidebar">
      <div className="stance-card-container">
        <div className="stance-section-header">
          <h3>
            <span>👥</span> Live Agent Stances
          </h3>
          <span className="count-badge">{template.agents.length} Active</span>
        </div>

        <div className="agent-stances-list">
          {template.agents.map((agent, index) => {
            const personality = personalities[agent.name] || "Collaborative";
            const isSpeaking =
              state?.status === "active" &&
              currentAgentIndex === index &&
              isThinking;

            // Find all history entries for this agent
            const agentHistory =
              state?.history.filter((h) => h.agent === agent.name) || [];
            const lastEntry = agentHistory[agentHistory.length - 1];
            const openingEntry = agentHistory.find(
              (h) => h.offer !== null && h.offer !== undefined
            );

            // Latest evaluation for this agent
            const agentLatestEval = [...evaluations]
              .reverse()
              .find((e) => e && e.agent_name === agent.name);

            // Concession computation
            const concessionData = agentLatestEval?.concession_data;
            const concessionRate = concessionData?.concession_rate ?? 0;
            const concessionPct = Math.round(concessionRate * 100);

            // Stance Sentiment logic
            let sentiment: "Firm" | "Flexible" | "Collaborating" | "Cautious" | "Agreed" = "Flexible";
            if (state?.status === "agreement") {
              sentiment = "Agreed";
            } else if (personality === "Aggressive") {
              sentiment = concessionPct > 20 ? "Flexible" : "Firm";
            } else if (personality === "Risk-Averse") {
              sentiment = "Cautious";
            } else {
              sentiment = concessionPct > 15 ? "Collaborating" : "Flexible";
            }

            const isAgreed = lastEntry?.action === "accept" || state?.status === "agreement";
            const isHumanAgent = humanRole === agent.name;

            return (
              <div
                key={agent.name}
                className={`agent-stance-card ${
                  isSpeaking ? "is-active-speaker" : ""
                } ${isAgreed ? "is-agreed" : ""} ${isHumanAgent ? "is-human-agent-card" : ""}`}
              >
                <div className="agent-stance-header">
                  <div className="agent-identity">
                    <div className="agent-stance-avatar">{agent.icon}</div>
                    <div className="agent-identity-meta">
                      <strong>
                        {agent.name} {isHumanAgent && <span className="human-you-tag">🎮 YOU</span>}
                      </strong>
                      <span>{agent.role}</span>
                    </div>
                  </div>

                  <span className={`personality-chip ${personality}`}>
                    {personality === "Aggressive"
                      ? "🔥"
                      : personality === "Collaborative"
                      ? "🤝"
                      : "🛡️"}{" "}
                    {personality}
                  </span>
                </div>

                <div className="agent-stance-metrics">
                  <div className="stance-metric-item">
                    <span>Opening</span>
                    <strong>
                      {openingEntry?.offer
                        ? `${openingEntry.offer.toLocaleString()}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="stance-metric-item" style={{ textAlign: "right" }}>
                    <span>Current Offer</span>
                    <strong>
                      {lastEntry?.offer
                        ? `${lastEntry.offer.toLocaleString()}`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="concession-meter-wrap">
                  <div className="concession-meter-labels">
                    <span>Concession Progress</span>
                    <strong>{concessionPct}%</strong>
                  </div>
                  <div className="concession-meter-bar">
                    <div
                      className="concession-meter-fill"
                      style={{ width: `${Math.min(concessionPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="stance-tag-row">
                  <span className={`sentiment-badge ${sentiment}`}>
                    {sentiment === "Agreed"
                      ? "✅ Deal Accepted"
                      : sentiment === "Firm"
                      ? "⚡ Firm Position"
                      : sentiment === "Cautious"
                      ? "🛡️ Risk Guarded"
                      : "🤝 Conceding Ground"}
                  </span>

                  {isSpeaking && (
                    <span className="speaking-live-pill" style={{ fontSize: "11px", color: "#6366f1", fontWeight: 700 }}>
                      🎙️ Responding...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
