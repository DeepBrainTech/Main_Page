import { getApiUrl } from "@/lib/api-config";

export interface MonkeyChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MonkeyChatResponse {
  answer: string;
  in_scope: boolean;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function sendMonkeyChatMessage(payload: {
  message: string;
  locale: "zh" | "en";
  history: MonkeyChatMessage[];
}): Promise<MonkeyChatResponse> {
  const res = await fetch(getApiUrl("/api/monkey-chat"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  const answer = json?.data?.answer;
  if (!res.ok || typeof answer !== "string") {
    throw new Error(json?.message || "monkey_chat_failed");
  }

  return {
    answer,
    in_scope: Boolean(json?.data?.in_scope),
  };
}
