import { sendSkinAnalysisEmail } from "@/services/skinanalysis";
import React, { useState } from "react";

export default function SendResultModal({
  isOpen,
  onClose,
  scoreInfo,
  recommendations,
}: {
  isOpen: boolean;
  onClose: () => void;
  scoreInfo: any;
  recommendations: any[];
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!email) return setError("Please enter a valid email.");
    setSending(true);
    setError("");
    try {
      const resultsHtml = `
        <p><strong>Wrinkle:</strong> ${scoreInfo?.wrinkle?.ui_score}</p>
        <p><strong>Pore:</strong> ${scoreInfo?.pore?.ui_score}</p>
        <p><strong>Texture:</strong> ${scoreInfo?.texture?.ui_score}</p>
        <p><strong>Acne:</strong> ${scoreInfo?.acne?.ui_score}</p>
      `;

      await sendSkinAnalysisEmail(email, resultsHtml, recommendations);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[400px] shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Send Results via Email</h2>
        <input
          type="email"
          placeholder="Enter email address"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {success ? (
          <p className="text-green-600 font-medium">✅ Email sent successfully!</p>
        ) : (
          <button
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded w-full"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        )}
        <button
          className="text-sm text-gray-500 mt-4 underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
