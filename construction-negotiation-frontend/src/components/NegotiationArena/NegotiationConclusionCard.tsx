import React from "react";
import type { NegotiationState } from "../../types";

export interface StakeholderConcession {
  agent: string;
  role: string;
  initial_offer: number | null;
  final_position: number | null;
  concession_amount: number;
  concession_pct: number;
  is_human?: boolean;
}

export interface HumanPerformanceDebrief {
  role: string;
  tactical_score: number;
  turns_played: number;
  verdict: string;
  strengths: string[];
  recommendations: string[];
}

export interface NegotiationConclusionData {
  outcome: string;
  outcome_label: string;
  title: string;
  executive_summary: string;
  final_offer: number | null;
  final_offer_unit: string;
  total_rounds: number;
  total_turns: number;
  key_agreements: string[];
  stakeholder_concessions: StakeholderConcession[];
  human_performance?: HumanPerformanceDebrief | null;
}

interface NegotiationConclusionCardProps {
  state: NegotiationState;
  conclusionData: NegotiationConclusionData | null;
  loadingConclusion: boolean;
  practiceMode: boolean;
  humanRole: string;
  onReset: () => void;
  onStartNegotiation: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
}

export const NegotiationConclusionCard: React.FC<NegotiationConclusionCardProps> = ({
  state,
  conclusionData,
  loadingConclusion,
  practiceMode,
  humanRole,
  onReset,
  onStartNegotiation,
  onExportMarkdown,
  onExportJSON,
}) => {
  const isAgreement = state.status === "agreement";
  const isBreakdown = state.status === "breakdown";

  const outcomeTitle = isAgreement
    ? "🎉 Consensus Achieved: Commercial Agreement Finalized"
    : isBreakdown
    ? "❌ Negotiation Breakdown: Irreconcilable Position"
    : "⚠️ Negotiation Concluded: Maximum Round Limit Reached";

  const bannerClass = isAgreement
    ? "conclusion-success"
    : isBreakdown
    ? "conclusion-breakdown"
    : "conclusion-max-rounds";

  // Fallback calculations if backend conclusion is still loading
  const finalOfferStr = state.current_offer
    ? `₹${state.current_offer.toLocaleString()} ${state.current_offer_unit || ""}`
    : "None Settled";

  return (
    <div className={`negotiation-conclusion-card ${bannerClass}`}>
      {/* Top Banner */}
      <div className="conclusion-header">
        <div className="conclusion-header-left">
          <div className="conclusion-icon-badge">
            {isAgreement ? "🤝" : isBreakdown ? "⚠️" : "⏱️"}
          </div>
          <div>
            <span className="conclusion-kicker">
              {practiceMode ? `🎮 Practice Mode Debrief · Playing as ${humanRole}` : "🤖 Autonomous AI Simulation Debrief"}
            </span>
            <h2>{conclusionData?.title || outcomeTitle}</h2>
          </div>
        </div>

        <div className="conclusion-actions-top">
          <button
            type="button"
            className="primary-button compact-btn"
            onClick={onStartNegotiation}
          >
            ↺ Re-run Scenario
          </button>
          <button
            type="button"
            className="outline-button compact-btn"
            onClick={onExportMarkdown}
          >
            📄 Export Report
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="conclusion-kpi-row">
        <div className="conclusion-kpi-item">
          <span>Settlement Status</span>
          <strong className={isAgreement ? "text-success" : "text-danger"}>
            {isAgreement ? "✓ Deal Locked" : isBreakdown ? "✕ Breakdown" : "⏱️ Max Rounds"}
          </strong>
        </div>

        <div className="conclusion-kpi-item">
          <span>Final Agreed Terms</span>
          <strong>{finalOfferStr}</strong>
        </div>

        <div className="conclusion-kpi-item">
          <span>Negotiation Rounds</span>
          <strong>
            {state.round} of {state.max_rounds} ({state.history.length} turns)
          </strong>
        </div>

        {practiceMode && conclusionData?.human_performance && (
          <div className="conclusion-kpi-item highlight-score">
            <span>Your Performance Score</span>
            <strong className="text-score">
              {conclusionData.human_performance.tactical_score}/100
            </strong>
          </div>
        )}
      </div>

      {/* Executive Summary Body */}
      <div className="conclusion-summary-section">
        <h3>📋 Executive Deal Summary & Arbitrator Verdict</h3>
        {loadingConclusion ? (
          <p className="loading-pulsing">Generating executive debrief analysis...</p>
        ) : (
          <p className="summary-paragraph">
            {conclusionData?.executive_summary ||
              `The negotiation concluded after ${state.history.length} turns across Round ${state.round}. All participating stakeholders exchanged strategic positions balancing project constraints, timelines, and commercial margins.`}
          </p>
        )}
      </div>

      {/* 2-Column Grid: Agreed Terms & Human Performance / Concession Table */}
      <div className="conclusion-grid-columns">
        {/* Left Column: Key Agreed Terms & Scope */}
        <div className="conclusion-col-card">
          <h4>📌 Key Agreed Conditions & Guarantees</h4>
          <ul className="conclusion-terms-list">
            {(conclusionData?.key_agreements && conclusionData.key_agreements.length > 0
              ? conclusionData.key_agreements
              : [
                  `Settled commercial terms: ${finalOfferStr}`,
                  `Total elapsed rounds: ${state.round} / ${state.max_rounds}`,
                  "Hard constraint boundaries respected across all active parties",
                ]
            ).map((term, idx) => (
              <li key={idx}>
                <span className="term-check">✓</span> {term}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Human Debrief OR Concessions Breakdown */}
        <div className="conclusion-col-card">
          {practiceMode && conclusionData?.human_performance ? (
            <div className="human-debrief-box">
              <div className="debrief-score-header">
                <h4>🎯 Negotiator Performance: {humanRole}</h4>
                <span className="debrief-badge">
                  {conclusionData.human_performance.verdict}
                </span>
              </div>

              <div className="debrief-feedback-group">
                <div className="debrief-strengths">
                  <span className="feedback-label">✨ Key Strengths:</span>
                  <ul>
                    {conclusionData.human_performance.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="debrief-tips">
                  <span className="feedback-label">💡 Tactical Tips for Future Deals:</span>
                  <ul>
                    {conclusionData.human_performance.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4>📊 Stakeholder Concessions Summary</h4>
              <div className="concessions-mini-table">
                {conclusionData?.stakeholder_concessions.map((sc, i) => (
                  <div key={i} className="concession-row-item">
                    <div className="concession-party-info">
                      <strong>{sc.agent}</strong>
                      <span>{sc.role}</span>
                    </div>
                    <div className="concession-diff-info">
                      <span>Conceded {sc.concession_pct}%</span>
                      <strong>
                        {sc.initial_offer ? `₹${sc.initial_offer.toLocaleString()}` : "—"} →{" "}
                        {sc.final_position ? `₹${sc.final_position.toLocaleString()}` : "—"}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="conclusion-footer-bar">
        <button
          type="button"
          className="primary-button"
          onClick={onStartNegotiation}
        >
          🔄 Start Fresh Practice Run
        </button>
        <button
          type="button"
          className="outline-button"
          onClick={onExportJSON}
        >
          📥 Export Audit JSON
        </button>
        <button
          type="button"
          className="outline-button"
          onClick={onReset}
        >
          ✕ Close Arena
        </button>
      </div>
    </div>
  );
};
