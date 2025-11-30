// frontend/src/api.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const MBTI_BASE = `${BASE_URL}/api/v1/mbti`;
const RIASEC_BASE = `${BASE_URL}/api/v1/riasec`;

/* ---------- MBTI ---------- */

export async function mbtiStart(user) {
  const r = await fetch(`${MBTI_BASE}/sessionStart/${encodeURIComponent(user)}`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("MBTI start failed");
  return r.json();
}

export async function mbtiCapture(sessionID, questionID, answer) {
  const r = await fetch(
    `${MBTI_BASE}/captureRes/${encodeURIComponent(sessionID)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionID, answer }),
    }
  );
  if (!r.ok) throw new Error("MBTI capture failed");
  return r.json(); // next question or sentinel
}

export async function mbtiNext(sessionID) {
  const r = await fetch(
    `${MBTI_BASE}/getQues/${encodeURIComponent(sessionID)}`,
    { method: "POST" }
  );
  if (!r.ok) throw new Error("MBTI next failed");
  return r.json();
}

export async function mbtiResult(sessionID) {
  const r = await fetch(
    `${MBTI_BASE}/result/${encodeURIComponent(sessionID)}`,
    { method: "POST" }
  );
  if (!r.ok) throw new Error("MBTI result failed");
  return r.json();
}

/* ---------- RIASEC ---------- */

export async function riasecStart(user) {
  const r = await fetch(
    `${RIASEC_BASE}/sessionStart/${encodeURIComponent(user)}`,
    { method: "POST" }
  );
  if (!r.ok) throw new Error("RIASEC start failed");
  return r.json(); // includes first question
}

export async function riasecCapture(sessionID, questionID, value) {
  const r = await fetch(
    `${RIASEC_BASE}/captureRes/${encodeURIComponent(sessionID)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionID, value }),
    }
  );
  if (!r.ok) {
    const errorText = await r.text();
    let errorMessage = "RIASEC capture failed";
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return r.json(); // next question or sentinel
}

export async function riasecResult(sessionID) {
  const r = await fetch(
    `${RIASEC_BASE}/result/${encodeURIComponent(sessionID)}`,
    { method: "POST" }
  );
  if (!r.ok) throw new Error("RIASEC result failed");
  return r.json();
}

/* ---------- Career Cluster Recommendation ---------- */

export async function recommendClusters(mbtiType, riasecRaw) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/cluster/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mbti: mbtiType,
        riasec_raw: riasecRaw, // {R:8, I:14, A:24, S:20, E:12, C:6}
      }),
    });

    if (!res.ok) {
      let errorMsg = `Cluster recommend failed: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {
        try {
          const errorText = await res.text();
          errorMsg = errorText || errorMsg;
        } catch {
          // Use default error message
        }
      }
      throw new Error(errorMsg);
    }

    return await res.json(); // [{cluster, probability, explanation, ...}, ...]
  } catch (error) {
    // Re-throw with better error message
    if (error.message && !error.message.includes('Cluster recommend failed')) {
      throw new Error(`Cluster recommend failed: ${error.message}`);
    }
    throw error;
  }
}
