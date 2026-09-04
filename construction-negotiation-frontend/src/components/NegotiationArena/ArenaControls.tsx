import React from "react";
import type { NegotiationState } from "../../types";

interface ArenaControlsProps {
  state: NegotiationState | null;
  loading: boolean;
  autoRun: boolean;
  speedMultiplier: 1 | 2 | 5;
  onRunNextTurn: () => void;
  onToggleAutoRun: () => void;
  onChangeSpeed: (speed: 1 | 2 | 5) => void;
  onReset: () => void;
  onStartNegotiation: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
}

export const ArenaControls: React.FC<ArenaControlsProps> = ({
  state,
  loading,
  autoRun,
  speedMultiplier,
  onRunNextTurn,
  onToggleAutoRun,
  onChangeSpeed,
  onReset,
  onStartNegotiation,
  onExportJSON,
  onExportMarkdown,
}) => {
  const isFinished = state && state.status !== "active";

  return (
    <div className="arena-controls-bar">
      <div className="controls-left-group">
        {!state ? (
          <button
            type="button"
            className="primary-button"
            onClick={onStartNegotiation}
            disabled={loading}
          >
            {loading ? "Starting Arena..." : "🚀 Launch Negotiation Arena"}
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
            <button
              type="button"
              className="primary-button"
              onClick={onRunNextTurn}
              disabled={loading || autoRun}
            >
              {loading ? "Thinking..." : "⏭ Next Turn (Step)"}
            </button>

            <button
              type="button"
              className={autoRun ? "personality-btn selected" : "personality-btn"}
              onClick={onToggleAutoRun}
              style={{ padding: "8px 14px", fontSize: "13px" }}
            >
              {autoRun ? "⏸ Pause Simulation" : "▶ Auto-Play Arena"}
            </button>

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

      <div className="controls-right-group">
        {state && (
          <>
            <button
              type="button"
              className="outline-button compact-btn"
              onClick={onExportJSON}
              title="Download full machine-readable JSON data"
            >
              📥 Export JSON
            </button>
            <button
              type="button"
              className="outline-button compact-btn"
              onClick={onExportMarkdown}
              title="Download formatted markdown audit report"
            >
              📄 Export Summary
            </button>
          </>
        )}
      </div>
    </div>
  );
};
