import React from "react";
import type { NegotiationState, ScenarioTemplate } from "../../types";

interface ArenaControlsProps {
  state: NegotiationState | null;
  template: ScenarioTemplate | undefined;
  loading: boolean;
  autoRun: boolean;
  speedMultiplier: 1 | 2 | 5;
  practiceMode: boolean;
  humanRole: string;
  isHumanTurn: boolean;
  onRunNextTurn: () => void;
  onToggleAutoRun: () => void;
  onChangeSpeed: (speed: 1 | 2 | 5) => void;
  onTogglePracticeMode: (isPractice: boolean) => void;
  onChangeHumanRole: (role: string) => void;
  onReset: () => void;
  onStartNegotiation: () => void;
  onAutoComplete?: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  showOutcome: boolean;
  onToggleOutcome: () => void;
}

export const ArenaControls: React.FC<ArenaControlsProps> = ({
  state,
  template,
  loading,
  autoRun,
  speedMultiplier,
  practiceMode,
  humanRole,
  isHumanTurn,
  onRunNextTurn,
  onToggleAutoRun,
  onChangeSpeed,
  onTogglePracticeMode,
  onChangeHumanRole,
  onReset,
  onStartNegotiation,
  onAutoComplete,
  onExportJSON,
  onExportMarkdown,
  showOutcome,
  onToggleOutcome,
}) => {
  const isFinished = state && state.status !== "active";

  return (
    <div className="arena-controls-bar">
      {/* Left: Mode Selection & Action Buttons */}
      <div className="controls-left-group">
        {/* Mode Selector Toggle */}
        <div className="mode-toggle-pill-group">
          <button
            type="button"
            className={`mode-toggle-btn ${!practiceMode ? "active" : ""}`}
            onClick={() => onTogglePracticeMode(false)}
            title="AI agents negotiate autonomously against each other"
          >
            🤖 AI Simulation
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${practiceMode ? "active" : ""}`}
            onClick={() => onTogglePracticeMode(true)}
            title="Step into the arena and negotiate directly with AI stakeholders"
          >
            🎮 Practice Mode
          </button>
        </div>

        {/* Practice Role Selector */}
        {practiceMode && template && (
          <div className="human-role-selector-wrap">
            <span className="role-selector-label">Play as:</span>
            <select
              value={humanRole}
              onChange={(e) => onChangeHumanRole(e.target.value)}
              className="human-role-select"
              disabled={state?.status === "active"}
            >
              {template.agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.icon} {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {!state ? (
          <button
            type="button"
            className="primary-button"
            onClick={onStartNegotiation}
            disabled={loading}
          >
            {loading
              ? "Starting Arena..."
              : practiceMode
              ? "🎮 Enter Arena as Participant"
              : "🚀 Launch AI Negotiation"}
          </button>
        ) : isFinished ? (
          <>
            <button
              type="button"
              className="primary-button"
              onClick={onStartNegotiation}
              disabled={loading}
            >
              ↺ Run Again
            </button>
            <button
              type="button"
              className="outline-button"
              onClick={onReset}
            >
              ✕ Clear Arena
            </button>
          </>
        ) : (
          <>
            {!isHumanTurn && (
              <button
                type="button"
                className="primary-button"
                onClick={onRunNextTurn}
                disabled={loading || autoRun}
              >
                {loading ? "AI Thinking..." : "⏭ Next AI Move (Step)"}
              </button>
            )}

            {practiceMode && onAutoComplete && (
              <button
                type="button"
                className="personality-btn selected"
                onClick={onAutoComplete}
                disabled={loading}
                title="Automatically simulate remaining turns and generate final conclusion debrief"
                style={{ padding: "8px 14px", fontSize: "13px", background: "#4f46e5", color: "white" }}
              >
                ⚡ Fast-Forward to Conclusion
              </button>
            )}

            {!practiceMode && (
              <button
                type="button"
                className={autoRun ? "personality-btn selected" : "personality-btn"}
                onClick={onToggleAutoRun}
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                {autoRun ? "⏸ Pause Simulation" : "▶ Auto-Play Arena"}
              </button>
            )}

            {!practiceMode && (
              <div className="speed-control-btn-group">
                <button
                  type="button"
                  className={`speed-toggle-btn ${speedMultiplier === 1 ? "active" : ""}`}
                  onClick={() => onChangeSpeed(1)}
                >
                  1x
                </button>
                <button
                  type="button"
                  className={`speed-toggle-btn ${speedMultiplier === 2 ? "active" : ""}`}
                  onClick={() => onChangeSpeed(2)}
                >
                  2x
                </button>
                <button
                  type="button"
                  className={`speed-toggle-btn ${speedMultiplier === 5 ? "active" : ""}`}
                  onClick={() => onChangeSpeed(5)}
                >
                  5x
                </button>
              </div>
            )}

            <button
              type="button"
              className="outline-button compact-btn danger-hover"
              onClick={onReset}
            >
              ↺ Reset
            </button>
          </>
        )}
      </div>

      {/* Right: Export options */}
      <div className="controls-right-group">
        {state && (
          <>
            {isFinished && (
              <button
                type="button"
                className={showOutcome ? "primary-button compact-btn" : "outline-button compact-btn"}
                onClick={onToggleOutcome}
              >
                {showOutcome ? "↩ Arena View" : "🏁 Outcome Screen"}
              </button>
            )}
            <button
              type="button"
              className="outline-button compact-btn"
              onClick={onExportJSON}
              title="Download machine-readable JSON negotiation data"
            >
              📥 Export JSON
            </button>
            <button
              type="button"
              className="outline-button compact-btn"
              onClick={onExportMarkdown}
              title="Download formatted Markdown summary report"
            >
              📄 Export Summary
            </button>
          </>
        )}
      </div>
    </div>
  );
};
