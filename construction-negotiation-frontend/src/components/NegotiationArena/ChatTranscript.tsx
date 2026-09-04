import React, { useEffect, useRef, useState } from "react";
import type { EvaluationData, NegotiationState, Personality, ScenarioTemplate } from "../../types";

interface ChatTranscriptProps {
  template: ScenarioTemplate | undefined;
  personalities: Record<string, Personality>;
  state: NegotiationState | null;
  reasoning: string[];
  evaluations: (EvaluationData | null)[];
  loading: boolean;
  onStartNegotiation: () => void;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  template,
  personalities,
  state,
  reasoning,
  evaluations,
  loading,
  onStartNegotiation,
}) => {
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-expand latest turn's reasoning by default
  useEffect(() => {
    if (state && state.history.length > 0) {
      const latestIndex = state.history.length - 1;
      setExpandedReasoning((prev) => ({ ...prev, [latestIndex]: true }));
    }
  }, [state?.history.length]);

  // Smooth scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.history.length, loading]);

  const toggleReasoning = (index: number) => {
    setExpandedReasoning((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAllReasoning = () => {
    if (!state) return;
    const allExpanded = state.history.every((_, idx) => expandedReasoning[idx]);
    const newState: Record<number, boolean> = {};
    state.history.forEach((_, idx) => {
      newState[idx] = !allExpanded;
    });
    setExpandedReasoning(newState);
  };

  const currentSpeaker = template?.agents[
    state ? state.history.length % template.agents.length : 0
  ];

  const filteredHistory = (state?.history || []).map((entry, idx) => ({
    entry,
    idx,
    reasoning: reasoning[idx],
    evaluation: evaluations[idx],
  })).filter(({ entry }) => {
    if (filterAgent !== "all" && entry.agent !== filterAgent) return false;
    if (filterAction !== "all" && entry.action.toLowerCase() !== filterAction.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="transcript-card">
      {/* Transcript Header & Filters */}
      <div className="transcript-header">
        <div className="transcript-header-info">
          <h3>
            <span>💬</span> Negotiation Transcript
          </h3>
          <p>
            {state
              ? `${state.history.length} turns recorded across Round ${state.round} of ${state.max_rounds}`
              : "Live transcript will stream once simulation begins"}
          </p>
        </div>

        {state && state.history.length > 0 && (
          <div className="transcript-filter-bar">
            <select
              className="filter-chip-btn"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
            >
              <option value="all">All Agents</option>
              {template?.agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              className="filter-chip-btn"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="offer">Offers</option>
              <option value="counter">Counters</option>
              <option value="accept">Acceptances</option>
              <option value="reject">Rejections</option>
            </select>

            <button
              type="button"
              className="filter-chip-btn"
              onClick={toggleAllReasoning}
            >
              💭 Toggle Reasonings
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="transcript-messages-area">
        {!state || state.history.length === 0 ? (
          <div className="arena-empty-state">
            <div className="arena-empty-icon">⚔️</div>
            <h4>Arena is Ready for Negotiation</h4>
            <p>
              Agents are initialized with their configured constraints and goals.
              Click below to initiate the multi-agent negotiation.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={onStartNegotiation}
              disabled={loading}
            >
              {loading ? "Initializing..." : "🚀 Launch Negotiation Arena"}
            </button>
          </div>
        ) : (
          <>
            {filteredHistory.map(({ entry, idx, reasoning: turnReasoning, evaluation }) => {
              const agentObj = template?.agents.find((a) => a.name === entry.agent);
              const personality = personalities[entry.agent];
              const isExpanded = !!expandedReasoning[idx];
              const evalScore = evaluation?.offer_score?.score;
              const evalRec = evaluation?.recommendation?.action;
              const constraintChecks = evaluation?.offer_score?.constraint_checks || [];

              const scoreClass =
                evalScore !== undefined
                  ? evalScore >= 75
                    ? "score-high"
                    : evalScore >= 50
                    ? "score-mid"
                    : "score-low"
                  : "";

              return (
                <div key={idx} className="chat-turn-container">
                  <div className="chat-turn-header">
                    <div className="chat-turn-sender">
                      <div className="turn-avatar-badge">{agentObj?.icon || "🤖"}</div>
                      <strong>{entry.agent}</strong>
                      <span className="role-sublabel">({agentObj?.role || "Agent"})</span>
                      {personality && (
                        <span className={`personality-chip ${personality}`}>
                          {personality}
                        </span>
                      )}
                    </div>
                    <span className="chat-turn-timestamp">
                      Round {entry.round} · Turn #{idx + 1}
                    </span>
                  </div>

                  <div className={`chat-bubble action-${entry.action.toLowerCase()}`}>
                    <div className="bubble-top-row">
                      <span className={`action-pill ${entry.action.toLowerCase()}`}>
                        {entry.action.toUpperCase()}
                      </span>

                      {entry.offer !== null && entry.offer !== undefined && (
                        <div className="offer-value-badge">
                          <span>₹{entry.offer.toLocaleString()}</span>
                          {entry.unit && <span className="offer-unit">({entry.unit})</span>}
                        </div>
                      )}
                    </div>

                    <p className="chat-message-text">{entry.message}</p>

                    {/* Per-Turn Inner Reasoning Drawer */}
                    {(turnReasoning || evaluation) && (
                      <div className="turn-reasoning-drawer">
                        <button
                          type="button"
                          className="reasoning-toggle-btn"
                          onClick={() => toggleReasoning(idx)}
                        >
                          <span>{isExpanded ? "▾" : "▸"}</span>
                          <span>💭 Inner Agent Reasoning & Decision Logic</span>
                        </button>

                        {isExpanded && (
                          <div className="reasoning-content-card">
                            {turnReasoning && (
                              <p className="reasoning-rationale">"{turnReasoning}"</p>
                            )}

                            {evaluation && (
                              <div className="reasoning-eval-badges">
                                {evalScore !== undefined && (
                                  <span className={`score-eval-pill ${scoreClass}`}>
                                    Score: {evalScore}/100
                                  </span>
                                )}

                                {evalRec && (
                                  <span className="score-eval-pill score-mid">
                                    Strategy: {evalRec.toUpperCase()}
                                  </span>
                                )}

                                {constraintChecks.length > 0 && (
                                  <div className="constraint-chips-mini">
                                    {constraintChecks.map((cc, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="constraint-chip-mini"
                                        title={cc.detail || cc.text}
                                      >
                                        {cc.status === "pass"
                                          ? "✅"
                                          : cc.status === "warn"
                                          ? "⚠️"
                                          : "❌"}{" "}
                                        {cc.text.slice(0, 24)}...
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Thinking / Typing Indicator */}
            {loading && state.status === "active" && currentSpeaker && (
              <div className="agent-thinking-indicator">
                <div className="turn-avatar-badge">{currentSpeaker.icon}</div>
                <span>
                  <strong>{currentSpeaker.name}</strong> is evaluating constraints and formulating turn...
                </span>
                <div className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
};
