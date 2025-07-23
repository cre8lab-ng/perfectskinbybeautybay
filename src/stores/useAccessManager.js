import { useState } from "react";

export function useAccessManager() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkAccess = async (email) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "check" }),
      });

      let result;
      try {
        result = await res.json();
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        return {
          accessGranted: false,
          error: "Invalid response from server.",
          reason: "invalid_json",
        };
      }

      if (!res.ok || result.error) {
        const errorMsg =
          result.error ?? "Something went wrong. Please try again.";
        return {
          accessGranted: false,
          error: errorMsg,
          reason: result.reason ?? "unknown",
        };
      }

      return {
        accessGranted: !!result.access_granted,
        reason: result.access_granted ? null : result.reason ?? "unknown",
        source: result.source ?? null,
      };
    } catch (err) {
      console.error("Network or server error:", err);
      return {
        accessGranted: false,
        error: "Network error. Please check your internet and try again.",
        reason: "network",
      };
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (email, reference) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reference, type: "mark-paid" }),
      });

      const result = await res.json();
      return result.access_granted === true;
    } catch (err) {
      console.error("Mark paid error:", err);
      setError("Failed to update access.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { checkAccess, markAsPaid, loading, error };
}
