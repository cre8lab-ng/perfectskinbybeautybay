// /hooks/useAccessManager.ts
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

      const result = await res.json();

      return {
        accessGranted: result.access_granted,
        source: result.source,
        reason: result.reason,
      };
    } catch (err) {
      console.error("Access check error:", err);
      setError("Failed to check access");
      return { accessGranted: false, error: "Failed to check access" };
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (email) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "mark-paid" }),
      });

      const result = await res.json();
      return result.access_granted === true;
    } catch (err) {
      console.error("Mark paid error:", err);
      setError("Failed to update access");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { checkAccess, markAsPaid, loading, error };
}
