export const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

export const submitVote = (data: any) =>
  fetch(`${API_BASE}/api/submissions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getAIRecommendation = () =>
  fetch(`${API_BASE}/api/ai/recommend/`);
