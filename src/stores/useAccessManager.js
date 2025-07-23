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
          error: "Invalid response from server. Please try again later.",
        };
      }

      // Catch rate-limiting or trial block
      if (
        res.status === 429 ||
        result?.error?.toLowerCase().includes("trial limit")
      ) {
        return {
          accessGranted: false,
          error:
            "You’ve reached the trial limit. Please try again in the next 12 hours.",
          reason: "trial_limit",
        };
      }

      if (!res.ok) {
        return {
          accessGranted: false,
          error: result.error || "Something went wrong. Please try again.",
          reason: result.reason || "unknown",
        };
      }

      return {
        accessGranted: !!result.access_granted,
        source: result.source || null,
        reason: result.access_granted ? null : result.reason || "unknown",
      };
    } catch (err) {
      console.error("Network or server error:", err);
      return {
        accessGranted: false,
        error:
          "Network error. Please check your internet connection and try again.",
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
