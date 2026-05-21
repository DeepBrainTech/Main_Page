import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface GameLikeState {
  game_key: string;
  like_count: number;
  liked_by_me: boolean;
}

export async function postGamePlayedRecord(gameKey: string): Promise<{
  played_game_count: number;
  is_new: boolean;
}> {
  const res = await credentialedFetch(getApiUrl("/api/games/play-record"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ game_key: gameKey }),
  });
  if (!res.ok) throw new Error("play_record_failed");
  const json = await res.json();
  if (!json?.success || !json?.data) throw new Error("invalid_response");
  return json.data as { played_game_count: number; is_new: boolean };
}

export async function fetchGameLikes(): Promise<GameLikeState[]> {
  const res = await credentialedFetch(getApiUrl("/api/games/likes"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_game_likes_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}

export async function likeGame(gameKey: string): Promise<GameLikeState[]> {
  const res = await credentialedFetch(getApiUrl(`/api/games/likes/${encodeURIComponent(gameKey)}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("like_game_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}

export async function unlikeGame(gameKey: string): Promise<GameLikeState[]> {
  const res = await credentialedFetch(getApiUrl(`/api/games/likes/${encodeURIComponent(gameKey)}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("unlike_game_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}
