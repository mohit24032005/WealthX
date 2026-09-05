import React, { useState, useRef, useEffect } from "react";
import api from "../../utils/apiClient";
import "./AskWealthXCopilot.css";

const QUICK_PROMPTS = [
  "How much revenue is currently at risk?",
  "How much revenue did AI recover today?",
  "Show high-probability recovery opportunities.",
  "What are today's reconciliation exceptions?",
  "What is my current recovery rate?",
  "Which customers have repeated payment failures?",
];

export const AskWealthXCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am your WealthX AI Revenue & Finance Intelligence Agent. Ask me anything regarding live revenue at risk, automated recovery metrics, or settlement reconciliation exceptions.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/api/copilot/query", { query: textToSend });
      if (res && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.data.answer,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        throw new Error(res.message || "Failed to retrieve grounded response");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Error retrieving financial data: ${err.message}. Please ensure the server is online.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Launcher */}
      <button
        type="button"
        className="copilot-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Ask WealthX Copilot"
      >
        <span className="copilot-badge-live"></span>
        <span>Ask WealthX AI</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="copilot-drawer-overlay" onClick={() => setIsOpen(false)}>
          <div className="copilot-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="copilot-header">
              <div className="copilot-title-group">
                <div className="copilot-avatar">⚡</div>
                <div>
                  <h3 className="copilot-name">WealthX Copilot</h3>
                  <span className="badge-simulated" style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                    Grounded in WealthX transaction data
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="copilot-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close copilot"
              >
                ✕
              </button>
            </div>

            <div className="copilot-body">
              <div className="copilot-intro-card">
                <strong>Data-Grounded Intelligence</strong>: Every answer is queried dynamically from your live MongoDB database records (payments, audit logs, and settlements). Zero fabricated numbers.
              </div>

              {/* Quick Query Prompts */}
              <div className="copilot-chips-container">
                <span className="copilot-chips-title">Suggested Inquiries</span>
                <div className="copilot-chips">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="copilot-chip"
                      onClick={() => handleSend(prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="copilot-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`copilot-msg ${msg.role}`}>
                    <div className="msg-bubble">{msg.text}</div>
                    <span className="msg-meta">{msg.time}</span>
                  </div>
                ))}
                {loading && (
                  <div className="copilot-loading">
                    <span className="copilot-spinner"></span>
                    <span>Querying MongoDB financial ledger...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Footer */}
            <div className="copilot-footer">
              <form
                className="copilot-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <input
                  type="text"
                  className="copilot-input"
                  placeholder="Ask about revenue at risk, TXN_1024, or settlements..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" className="copilot-send-btn" disabled={!input.trim() || loading}>
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AskWealthXCopilot;
