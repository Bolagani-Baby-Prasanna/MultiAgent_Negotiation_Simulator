import React, { useEffect, useState } from "react";
import type { AgentConfig, EvaluationData, NegotiationState } from "../../types";

interface HumanInputTrayProps {
  humanAgent: AgentConfig | undefined;
  state: NegotiationState | null;
  loading: boolean;
  evaluations: (EvaluationData | null)[];
  onSubmitTurn: (turn: {
    action: string;
    offer: number | null;
    unit: string;
    message: string;
  }) => void;
}

export const HumanInputTray: React.FC<HumanInputTrayProps> = ({
  humanAgent,
  state,
  loading,
  evaluations,
  onSubmitTurn,
}) => {
  const [action, setAction] = useState<"counter" | "accept" | "offer" | "reject">("counter");
  const [offerValue, setOfferValue] = useState<number | "">("");
  const [message, setMessage] = useState<string>("");

  const currentOffer = state?.current_offer ?? null;
  const currentUnit = state?.current_offer_unit || "₹ / unit";

  // Latest evaluation for tactical hints
  const latestEval = [...evaluations].reverse().find((e) => e !== null) ?? null;

  // Initialize offer value when turn activates
  useEffect(() => {
    if (currentOffer !== null) {
      if (action === "accept") {
        setOfferValue(currentOffer);
      } else if (action === "counter") {
        // Default to suggested counter if available, or slight adjustment
        if (latestEval?.recommendation?.suggested_counter_low) {
          setOfferValue(Math.round(latestEval.recommendation.suggested_counter_low));
        } else {
          const isSeller = humanAgent?.role.toLowerCase().includes("supplier") || humanAgent?.role.toLowerCase().includes("provider");
          const defaultStep = isSeller ? currentOffer * 1.05 : currentOffer * 0.95;
          setOfferValue(Math.round(defaultStep));
        }
      }
    }
  }, [currentOffer, action, latestEval, humanAgent?.role]);

  if (!humanAgent || !state || state.status !== "active") return null;

  const handleQuickAdjust = (delta: number) => {
    const currentNum = typeof offerValue === "number" ? offerValue : (currentOffer || 50000);
    setOfferValue(Math.max(0, currentNum + delta));
  };

  const handleSetQuickPhrase = (phrase: string) => {
    setMessage((prev) => (prev ? `${prev} ${phrase}` : phrase));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (action !== "reject" && offerValue === "" && action !== "accept") return;

    const finalOffer =
      action === "accept"
        ? currentOffer
        : action === "reject"
        ? null
        : typeof offerValue === "number"
        ? offerValue
        : null;

    const defaultMsg =
      action === "accept"
        ? `As ${humanAgent.role}, I accept the proposed terms at ${currentOffer?.toLocaleString()} to lock in this agreement.`
        : action === "reject"
        ? `As ${humanAgent.role}, we cannot accept these terms as they breach our non-negotiable project constraints.`
        : `As ${humanAgent.role}, we propose a revised position of ${finalOffer?.toLocaleString()} ${currentUnit} to advance consensus.`;

    onSubmitTurn({
      action,
      offer: finalOffer,
      unit: currentUnit,
      message: message.trim() || defaultMsg,
    });

    setMessage("");
  };

  // Constraint safety check
  const constraints = humanAgent.constraints || [];
  let constraintWarning = "";
  let isConstraintSafe = true;

  if (typeof offerValue === "number") {
    for (const c of constraints) {
      const lower = c.toLowerCase();
      // Extract numeric bound from constraint string (e.g. ₹52,000 -> 52000)
      const cleanText = c.replace(/,/g, "");
      const match = cleanText.match(/\d+(\.\d+)?/);
      if (match) {
        const bound = parseFloat(match[0]);
        // Ignore tiny values like "2 sub-suppliers" or "3 business days" when evaluating big money offers
        if (bound > 100 || (bound <= 100 && offerValue <= 100)) {
          if (
            (lower.includes("cap") ||
              lower.includes("budget") ||
              lower.includes("max") ||
              lower.includes("acceptable") ||
              lower.includes("ceiling") ||
              lower.includes("cannot extend") ||
              lower.includes("not exceed")) &&
            offerValue > bound
          ) {
            constraintWarning = `⚠️ Warning: Your offer ₹${offerValue.toLocaleString()} exceeds your specified constraint limit (${c}).`;
            isConstraintSafe = false;
            break;
          }
          if (
            (lower.includes("min") ||
              lower.includes("floor") ||
              lower.includes("at least") ||
              lower.includes("lowest")) &&
            offerValue < bound
          ) {
            constraintWarning = `⚠️ Warning: Your offer ₹${offerValue.toLocaleString()} is below your required minimum limit (${c}).`;
            isConstraintSafe = false;
            break;
          }
        }
      }
    }
  }

  return (
    <div className="human-input-tray-container">
      <div className="human-tray-header">
        <div className="human-tray-title">
          <div className="human-avatar-glow">{humanAgent.icon}</div>
          <div>
            <h3>
              Your Turn to Negotiate: <span>{humanAgent.name}</span>
            </h3>
            <p>
              Role: <strong>{humanAgent.role}</strong> · Outstanding Offer:{" "}
              <strong>
                {currentOffer !== null ? `₹${currentOffer.toLocaleString()} (${currentUnit})` : "None (Opening)"}
              </strong>
            </p>
          </div>
        </div>

        <div className="human-mandate-chip" title={constraints.join(" | ")}>
          <span>🎯 Goal:</span> {humanAgent.goal.slice(0, 45)}...
        </div>
      </div>

      <form onSubmit={handleSubmit} className="human-tray-form">
        {/* Action Type Selector */}
        <div className="action-selector-group">
          <label className="action-type-btn-label">Action Strategy:</label>
          <div className="action-type-btns">
            <button
              type="button"
              className={`action-btn-pill ${action === "counter" ? "selected counter-sel" : ""}`}
              onClick={() => setAction("counter")}
            >
              🔄 Propose Counter-Offer
            </button>
            <button
              type="button"
              className={`action-btn-pill ${action === "accept" ? "selected accept-sel" : ""}`}
              onClick={() => setAction("accept")}
              disabled={currentOffer === null}
            >
              ✅ Accept Deal ({currentOffer ? `₹${currentOffer.toLocaleString()}` : "N/A"})
            </button>
            <button
              type="button"
              className={`action-btn-pill ${action === "offer" ? "selected offer-sel" : ""}`}
              onClick={() => setAction("offer")}
            >
              ⚡ New Opening Offer
            </button>
            <button
              type="button"
              className={`action-btn-pill ${action === "reject" ? "selected reject-sel" : ""}`}
              onClick={() => setAction("reject")}
            >
              ❌ Reject / Walk Away
            </button>
          </div>
        </div>

        {/* Offer Input & Steppers (for Counter / Offer) */}
        {action !== "reject" && action !== "accept" && (
          <div className="human-offer-input-row">
            <div className="numeric-input-wrap">
              <label>Your Numeric Proposal (₹)</label>
              <div className="input-currency-box">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  placeholder="Enter numeric offer..."
                  value={offerValue}
                  onChange={(e) =>
                    setOfferValue(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
                <span className="unit-label-tag">{currentUnit}</span>
              </div>
            </div>

            <div className="quick-adjust-chips">
              <span className="quick-label">Quick Adjust:</span>
              <button type="button" onClick={() => handleQuickAdjust(-5000)}>
                -₹5,000
              </button>
              <button type="button" onClick={() => handleQuickAdjust(-1000)}>
                -₹1,000
              </button>
              <button type="button" onClick={() => handleQuickAdjust(1000)}>
                +₹1,000
              </button>
              <button type="button" onClick={() => handleQuickAdjust(5000)}>
                +₹5,000
              </button>
              {currentOffer && (
                <button
                  type="button"
                  className="match-btn"
                  onClick={() => setOfferValue(currentOffer)}
                >
                  Match Current (₹{currentOffer.toLocaleString()})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Constraint Safety Guard */}
        {constraintWarning ? (
          <div className="constraint-safety-alert warning">
            {constraintWarning}
          </div>
        ) : typeof offerValue === "number" && offerValue > 0 ? (
          <div className="constraint-safety-alert pass">
            ✅ Offer complies with your assigned operational constraints.
          </div>
        ) : null}

        {/* Conversational Spoken Message Box */}
        <div className="human-message-box">
          <label>
            Your Spoken Dialogue to AI Stakeholders (First-Person Speech):
          </label>
          <textarea
            rows={3}
            placeholder={`Speak as the ${humanAgent.role}... e.g. "Look team, I understand the delivery pressure, but we need to balance this with our site budget..."`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* Quick Phrasing Templates */}
          <div className="quick-phrases-tray">
            <span className="phrase-hint">💡 Quick Phrases:</span>
            <button
              type="button"
              className="phrase-chip"
              onClick={() =>
                handleSetQuickPhrase(
                  "I appreciate your previous concession, but our baseline budget requires a more balanced figure."
                )
              }
            >
              + "Appreciate concession..."
            </button>
            <button
              type="button"
              className="phrase-chip"
              onClick={() =>
                handleSetQuickPhrase(
                  "If you can commit to delivering certified Fe-500 grade on schedule, I can meet you at this number."
                )
              }
            >
              + "If delivery committed..."
            </button>
            <button
              type="button"
              className="phrase-chip"
              onClick={() =>
                handleSetQuickPhrase(
                  "We have recalculated our buffers to make a meaningful step forward and close the spread."
                )
              }
            >
              + "Recalculated buffers..."
            </button>
            <button
              type="button"
              className="phrase-chip"
              onClick={() =>
                handleSetQuickPhrase(
                  "This represents our best viable position without triggering critical path milestone delays."
                )
              }
            >
              + "Best viable position..."
            </button>
          </div>
        </div>

        {/* Tactical Coach Hint */}
        {latestEval?.recommendation && (
          <div className="coach-hint-box">
            <span>🧠 Tactical Coach Advice:</span>
            <p>
              The algorithmic evaluator suggests <strong>{latestEval.recommendation.action.toUpperCase()}</strong>{" "}
              {latestEval.recommendation.suggested_counter_low && latestEval.recommendation.suggested_counter_high
                ? `within ₹${latestEval.recommendation.suggested_counter_low.toLocaleString()} – ₹${latestEval.recommendation.suggested_counter_high.toLocaleString()}`
                : ""}.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="human-tray-submit-row">
          <button
            type="submit"
            className="primary-button human-submit-btn"
            disabled={loading || (!isConstraintSafe && action === "offer")}
          >
            {loading ? "AI Stakeholders Evaluating..." : "🚀 Transmit Move to AI Stakeholders"}
          </button>
        </div>
      </form>
    </div>
  );
};
