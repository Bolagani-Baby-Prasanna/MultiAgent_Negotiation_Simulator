import React from "react";
import type { EvaluationData, NegotiationState, ScenarioTemplate } from "../../types";

interface RoundMetricsPanelProps {
  template: ScenarioTemplate | undefined;
  state: NegotiationState | null;
  evaluations: (EvaluationData | null)[];
}

export const RoundMetricsPanel: React.FC<RoundMetricsPanelProps> = ({
  template,
  state,
  evaluations,
}) => {
  const latestEval = [...evaluations].reverse().find((e) => e !== null) ?? null;

  // Compute multi-agent trajectory lines
  const numericHistory = (state?.history || []).filter(
    (h) => h.offer !== null && h.offer !== undefined
  );

  const offers = numericHistory.map((h) => Number(h.offer));
  const minOffer = offers.length > 0 ? Math.min(...offers) : 0;
  const maxOffer = offers.length > 0 ? Math.max(...offers) : 100000;
  const offerSpread = maxOffer - minOffer;
  const range = offerSpread || 1;

  // SVG Points for overall offer trajectory
  const sparklinePoints = offers
    .map((v, i) => {
      const x = (i / Math.max(offers.length - 1, 1)) * 100;
      const y = 85 - ((v - minOffer) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  // Convergence calculation: only computed when 2 or more distinct turns with offers exist
  const hasConvergenceData = offers.length >= 2;
  const firstSpread = hasConvergenceData ? Math.abs(offers[0] - offers[1]) : range;
  const lastSpread = hasConvergenceData ? Math.abs(offers[offers.length - 1] - offers[offers.length - 2]) : range;
  const rawConvergencePct = firstSpread > 0 ? Math.round((1 - lastSpread / (firstSpread || 1)) * 100) : 50;
  const convergencePct = Math.min(100, Math.max(0, rawConvergencePct));

  // Settlement Probability calculation: only when active offers/evaluations exist
  const hasScore = latestEval?.offer_score?.score !== undefined;
  const scoreVal = latestEval?.offer_score?.score ?? 50;
  
  let settlementProbability: number | null = null;
  if (state?.status === "agreement") {
    settlementProbability = 100;
  } else if (state?.status === "max_rounds" || state?.status === "breakdown") {
    settlementProbability = 0;
  } else if (offers.length > 0 || hasScore) {
    const effConvergence = hasConvergenceData ? convergencePct : 20;
    settlementProbability = Math.min(95, Math.max(15, Math.round(scoreVal * 0.7 + effConvergence * 0.3)));
  }

  // Gauge parameters for latest score
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (scoreVal / 100) * circumference;
  const scoreColor =
    scoreVal >= 75 ? "#22c55e" : scoreVal >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="metrics-sidebar">
      {/* Round & Key Metrics KPI Grid */}
      <div className="metrics-card-container">
        <h4>
          <span>📊</span> Arena Analytics
          <span className="count-badge">
            {state ? `R${state.round}/${state.max_rounds}` : "Ready"}
          </span>
        </h4>

        <div className="metrics-kpi-grid">
          <div className="metric-kpi-box">
            <span>Settlement Odds</span>
            <strong
              style={{
                color:
                  settlementProbability !== null
                    ? settlementProbability > 60
                      ? "#16a34a"
                      : "#dc2626"
                    : "#64748b",
              }}
            >
              {settlementProbability !== null ? `${settlementProbability}%` : "—"}
            </strong>
          </div>

          <div className="metric-kpi-box">
            <span>Latest Offer</span>
            <strong>
              {state?.current_offer
                ? `₹${state.current_offer.toLocaleString()}`
                : "—"}
            </strong>
          </div>

          <div className="metric-kpi-box">
            <span>Turns Elapsed</span>
            <strong>{state?.history.length || 0}</strong>
          </div>

          <div className="metric-kpi-box">
            <span>Rounds Left</span>
            <strong>
              {state
                ? Math.max(0, state.max_rounds - state.round)
                : template?.estimatedRounds ?? 10}
            </strong>
          </div>
        </div>

        {/* Convergence & Spread Tracker */}
        <div className="convergence-meter-wrap">
          <div className="convergence-header">
            <span>Deal Convergence</span>
            <strong>
              {state?.status === "agreement"
                ? "100% (Settled)"
                : hasConvergenceData
                ? `${convergencePct}%`
                : "—"}
            </strong>
          </div>
          <div className="convergence-bar-track">
            <div
              className="convergence-bar-fill"
              style={{
                width: `${state?.status === "agreement" ? 100 : hasConvergenceData ? convergencePct : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Multi-Turn Price Trajectory Sparkline */}
        <div className="trajectory-chart-wrap">
          <div className="trajectory-header">
            <span>Offer Trajectory</span>
            <span>
              {offers.length > 0 ? `Spread: ₹${offerSpread.toLocaleString()}` : "No data yet"}
            </span>
          </div>

          {offers.length > 1 ? (
            <svg viewBox="0 0 100 90" className="trajectory-svg">
              <defs>
                <linearGradient id="arenaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
              {offers.map((v, i) => {
                const x = (i / Math.max(offers.length - 1, 1)) * 100;
                const y = 85 - ((v - minOffer) / range) * 70;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#4ade80"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: "12px" }}>
              Trajectory chart will render as agents submit offers
            </div>
          )}
        </div>
      </div>

      {/* Counteroffer Evaluation & Decision Matrix */}
      {latestEval && (
        <div className="metrics-card-container">
          <h4>
            <span>🎯</span> Offer Quality Score
            <span className="eval-agent-tag" style={{ fontSize: "11px", color: "#6366f1" }}>
              {latestEval.agent_name}
            </span>
          </h4>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
            <div style={{ position: "relative", width: "90px", height: "90px", flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <strong style={{ fontSize: "18px", color: scoreColor, fontWeight: 800 }}>
                  {scoreVal}
                </strong>
                <span style={{ fontSize: "10px", color: "#64748b" }}>/100</span>
              </div>
            </div>

            <div style={{ fontSize: "12.5px", color: "#334155" }}>
              <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
                {latestEval.offer_score.summary || "Evaluation against agent constraints"}
              </p>
              <small style={{ color: "#64748b" }}>
                {latestEval.offer_score.constraints_met} of {latestEval.offer_score.constraints_total} constraints met
              </small>
            </div>
          </div>

          {/* Suggested Counter Range */}
          {latestEval.recommendation.suggested_counter_low && latestEval.recommendation.suggested_counter_high && (
            <div
              style={{
                background: "#f1f5f9",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Target Counter Range:</span>
              <strong style={{ color: "#4f46e5" }}>
                ₹{latestEval.recommendation.suggested_counter_low.toLocaleString()} – ₹{latestEval.recommendation.suggested_counter_high.toLocaleString()}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
