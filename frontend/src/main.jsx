import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global error handlers to catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress known browser extension errors
  const message = event.reason?.message || String(event.reason || '');
  if (message.includes('message channel closed') || 
      message.includes('Extension context invalidated') ||
      message.includes('receiving end does not exist')) {
    // These are typically browser extension errors, suppress them
    event.preventDefault();
    return;
  }
  // Log other unhandled rejections for debugging
  console.error('Unhandled promise rejection:', event.reason);
});

// Global error handler for general errors
window.addEventListener('error', (event) => {
  // Suppress known browser extension errors
  if (event.message && (
    event.message.includes('message channel closed') ||
    event.message.includes('Extension context invalidated') ||
    event.message.includes('receiving end does not exist')
  )) {
    event.preventDefault();
    return;
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
