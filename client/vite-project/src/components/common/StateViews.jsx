import React from "react";
import "./StateViews.css";

export const LoadingState = ({ message = "Loading financial data...", fullPage = false }) => {
  return (
    <div className={`state-container loading-state ${fullPage ? "full-page" : ""}`}>
      <div className="spinner-glow">
        <div className="spinner-inner"></div>
      </div>
      <p className="state-message">{message}</p>
    </div>
  );
};

export const EmptyState = ({
  icon = "📂",
  title = "No Records Found",
  description = "Get started by adding your first record to begin tracking.",
  actionText,
  onAction,
}) => {
  return (
    <div className="state-container empty-state glass-panel">
      <div className="state-icon">{icon}</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description">{description}</p>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export const ErrorState = ({
  title = "Unable to Load Data",
  message = "An unexpected error occurred while connecting to the server.",
  onRetry,
}) => {
  return (
    <div className="state-container error-state glass-panel">
      <div className="error-icon">⚠️</div>
      <h3 className="state-title text-rose">{title}</h3>
      <p className="state-description">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export const SuccessState = ({
  title = "Action Completed",
  message = "Your changes have been saved securely.",
  actionText,
  onAction,
}) => {
  return (
    <div className="state-container success-state glass-panel">
      <div className="success-icon">✓</div>
      <h3 className="state-title text-teal">{title}</h3>
      <p className="state-description">{message}</p>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};
