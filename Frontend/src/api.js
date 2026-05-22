const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * POST /predict
 * Send household details, get back water consumption prediction
 */
export async function predictWaterUsage(formData) {
  const response = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const json = await response.json();

  if (!response.ok || json.status === "failed") {
    throw new Error(json.error || "Prediction request failed");
  }

  return json;
}

/**
 * GET /
 * Check if Flask API is reachable
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    return await response.json();
  } catch {
    return { status: "unreachable" };
  }
}

/**
 * GET /history
 * Fetch last 20 predictions from MongoDB
 */
export async function fetchHistory() {
  const response = await fetch(`${BASE_URL}/history`);
  if (!response.ok) throw new Error("Could not fetch history");
  return response.json();
}

/**
 * GET /stats
 * Aggregate stats across all predictions
 */
export async function fetchStats() {
  const response = await fetch(`${BASE_URL}/stats`);
  if (!response.ok) throw new Error("Could not fetch stats");
  return response.json();
}
