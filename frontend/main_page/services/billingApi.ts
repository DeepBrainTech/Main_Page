import {
  credentialedFetch,
  getApiUrl,
  getAuthHeaders,
  readApiErrorDetail,
} from "@/services/apiClient";

/** Map FastAPI `detail` strings to membership i18n error keys (camelCase). */
export function membershipErrorKeyFromDetail(detail: string): string {
  switch (detail) {
    case "cancel_via_billing_portal":
      return "cancelViaPortal";
    case "stripe_not_configured":
    case "stripe_price_not_configured":
    case "stripe_webhook_not_configured":
      return "stripeNotConfigured";
    case "already_has_active_subscription":
      return "alreadySubscribed";
    case "subscription_no_change":
      return "subscriptionNoChange";
    case "plan_switch_need_resume":
      return "planSwitchNeedResume";
    case "stripe_change_failed":
    case "payment_method_setup_failed":
    case "payment_method_update_failed":
    case "payment_method_customer_mismatch":
    case "subscription_missing":
    case "subscription_not_active":
    case "subscription_price_unknown":
    case "subscription_item_missing":
    case "subscription_period_missing":
    case "Internal Server Error":
      return "stripeChangeFailed";
    case "stripe_customer_missing":
      return "portalFailed";
    case "checkout_failed":
      return "checkoutFailed";
    case "portal_failed":
      return "portalFailed";
    case "validation_error":
      return "saveFailed";
    case "request_failed":
      return "portalUnavailable";
    default:
      return "generic";
  }
}

export async function createStripeCheckoutSession(params: {
  plan: "plus" | "premium";
  billing_interval: "monthly" | "annual";
  locale: string;
}): Promise<string> {
  const res = await credentialedFetch(getApiUrl("/api/billing/checkout-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("checkout_failed");
  return url;
}

export async function createDiamondCheckoutSession(params: {
  bundle_id: "diamonds10" | "diamonds25" | "diamonds70" | "diamonds200" | "diamonds300";
  locale: string;
}): Promise<string> {
  const res = await credentialedFetch(getApiUrl("/api/billing/diamond-checkout-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("checkout_failed");
  return url;
}

export async function createCoinCheckoutSession(params: {
  bundle_id: "coins100" | "coins250" | "coins800" | "coins1500" | "coins2500";
  locale: string;
}): Promise<string> {
  const res = await credentialedFetch(getApiUrl("/api/billing/coin-checkout-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("checkout_failed");
  return url;
}

export async function createStripeBillingPortalSession(locale: string): Promise<string> {
  const res = await credentialedFetch(getApiUrl("/api/billing/portal-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("portal_failed");
  return url;
}

export async function changeStripeSubscription(params: {
  plan: "plus" | "premium";
  billing_interval: "monthly" | "annual";
  locale: string;
  proration_date?: number;
}): Promise<{
  action: "updated" | "scheduled" | "payment_pending";
  plan?: "plus" | "premium";
  billing_interval?: "monthly" | "annual";
  effective_at?: string;
  hosted_invoice_url?: string | null;
}> {
  const res = await credentialedFetch(getApiUrl("/api/billing/change-subscription"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as {
    data?: {
      action?: "updated" | "scheduled" | "payment_pending";
      plan?: "plus" | "premium";
      billing_interval?: "monthly" | "annual";
      effective_at?: string;
      hosted_invoice_url?: string | null;
    };
  };
  const data = json?.data;
  if (!data?.action) throw new Error("stripe_change_failed");
  return data as {
    action: "updated" | "scheduled" | "payment_pending";
    plan?: "plus" | "premium";
    billing_interval?: "monthly" | "annual";
    effective_at?: string;
    hosted_invoice_url?: string | null;
  };
}

export async function cancelScheduledStripeSubscriptionChange(): Promise<void> {
  const res = await credentialedFetch(getApiUrl("/api/billing/cancel-scheduled-change"), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
}

export interface StripeSubscriptionChangePreview {
  action: "immediate" | "scheduled";
  plan: "plus" | "premium";
  billing_interval: "monthly" | "annual";
  amount_due: number;
  currency: string;
  amount_due_display: string;
  payment_method_display?: string | null;
  proration_date: number;
  effective_at?: string | null;
  lines: Array<{
    description: string;
    amount: number;
    currency: string;
    amount_display: string;
  }>;
}

export async function previewStripeSubscriptionChange(params: {
  plan: "plus" | "premium";
  billing_interval: "monthly" | "annual";
  locale: string;
}): Promise<StripeSubscriptionChangePreview> {
  const res = await credentialedFetch(getApiUrl("/api/billing/change-preview"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: Partial<StripeSubscriptionChangePreview> };
  const data = json?.data;
  if (!data?.action || !data.plan || !data.billing_interval) throw new Error("stripe_change_failed");
  return {
    action: data.action,
    plan: data.plan,
    billing_interval: data.billing_interval,
    amount_due: typeof data.amount_due === "number" ? data.amount_due : 0,
    currency: data.currency ?? "usd",
    amount_due_display: data.amount_due_display ?? "USD 0.00",
    payment_method_display: data.payment_method_display ?? null,
    proration_date: typeof data.proration_date === "number" ? data.proration_date : Math.floor(Date.now() / 1000),
    effective_at: data.effective_at ?? null,
    lines: Array.isArray(data.lines) ? data.lines : [],
  };
}

export async function createStripePaymentMethodSetup(): Promise<string> {
  const res = await credentialedFetch(getApiUrl("/api/billing/payment-method-setup"), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { client_secret?: string } };
  const clientSecret = json?.data?.client_secret;
  if (!clientSecret) throw new Error("payment_method_setup_failed");
  return clientSecret;
}

export async function updateStripeSubscriptionPaymentMethod(paymentMethodId: string): Promise<{
  payment_method_display: string | null;
}> {
  const res = await credentialedFetch(getApiUrl("/api/billing/payment-method"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { payment_method_display?: string | null } };
  return {
    payment_method_display: json?.data?.payment_method_display ?? null,
  };
}

export async function fetchBillingStatus(): Promise<{
  checkout_enabled: boolean;
  portal_enabled: boolean;
  has_stripe_subscription: boolean;
  subscription_cancel_at_period_end: boolean | null;
  pending_plan: "plus" | "premium" | null;
  pending_billing_interval: "monthly" | "annual" | null;
  pending_effective_at: string | null;
}> {
  const res = await credentialedFetch(getApiUrl("/api/billing/status"), { headers: getAuthHeaders() });
  if (!res.ok) {
    return {
      checkout_enabled: false,
      portal_enabled: false,
      has_stripe_subscription: false,
      subscription_cancel_at_period_end: null,
      pending_plan: null,
      pending_billing_interval: null,
      pending_effective_at: null,
    };
  }
  const json = (await res.json()) as {
    data?: {
      checkout_enabled?: boolean;
      portal_enabled?: boolean;
      has_stripe_subscription?: boolean;
      subscription_cancel_at_period_end?: boolean | null;
      pending_plan?: string | null;
      pending_billing_interval?: string | null;
      pending_effective_at?: string | null;
    };
  };
  const d = json?.data ?? {};
  return {
    checkout_enabled: Boolean(d.checkout_enabled),
    portal_enabled: Boolean(d.portal_enabled),
    has_stripe_subscription: Boolean(d.has_stripe_subscription),
    subscription_cancel_at_period_end:
      typeof d.subscription_cancel_at_period_end === "boolean" ? d.subscription_cancel_at_period_end : null,
    pending_plan: d.pending_plan === "plus" || d.pending_plan === "premium" ? d.pending_plan : null,
    pending_billing_interval:
      d.pending_billing_interval === "monthly" || d.pending_billing_interval === "annual"
        ? d.pending_billing_interval
        : null,
    pending_effective_at: typeof d.pending_effective_at === "string" ? d.pending_effective_at : null,
  };
}
