const API_BASE = "https://movie-mind-ol9e.onrender.com";

export const submitVote = (data: any) =>
  fetch(`${API_BASE}/api/submit/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
