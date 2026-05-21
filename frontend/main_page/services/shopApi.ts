import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export async function fetchShopItems(gameMode?: string): Promise<Record<string, {
  name: string;
  games: string[];
  cost: { coins: number; diamonds: number; flowers: number };
}>> {
  const query = new URLSearchParams();
  if (gameMode) query.set("game_mode", gameMode);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await credentialedFetch(getApiUrl(`/api/user/shop/items${suffix}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_shop_items_failed");
  const json = await res.json();
  return (json?.data?.items ?? {}) as Record<string, {
    name: string;
    games: string[];
    cost: { coins: number; diamonds: number; flowers: number };
  }>;
}

export async function fetchShopInventory(): Promise<Array<{ item_id: string; quantity: number }>> {
  const res = await credentialedFetch(getApiUrl("/api/user/shop/inventory"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_inventory_failed");
  const json = await res.json();
  return (json?.data?.items ?? []) as Array<{ item_id: string; quantity: number }>;
}

export async function redeemShopItem(itemId: string, gameMode?: string): Promise<{
  item_id: string;
  item_name: string;
  games: string[];
  game_mode: string | null;
  cost: { coins: number; diamonds: number; flowers: number };
  inventory_quantity: number;
  assets: { coins: number; diamonds: number; flowers: number };
}> {
  const query = new URLSearchParams({ item_id: itemId });
  if (gameMode) query.set("game_mode", gameMode);
  const res = await credentialedFetch(getApiUrl(`/api/user/shop/redeem?${query.toString()}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "redeem_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("redeem_failed");
  return json.data;
}
