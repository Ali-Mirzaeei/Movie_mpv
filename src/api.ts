export const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const submitVote = (data: any) =>
  fetch(`${API_BASE}/api/submissions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getAIRecommendation = () =>
  fetch(`${API_BASE}/api/ai/recommend/`);
