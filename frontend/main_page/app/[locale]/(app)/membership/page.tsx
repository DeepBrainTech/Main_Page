"use client";

import { useEffect, useState } from "react";
import MembershipPlans, {
  type MembershipBillingInterval,
  type MembershipPlan,
} from "@/components/features/membership/MembershipPlans";
import { fetchAuthMeMembership, updateMembershipPlan } from "@/services/userApi";

export default function MembershipPage() {
  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>("free");
  const [billingInterval, setBillingInterval] = useState<MembershipBillingInterval>("monthly");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await fetchAuthMeMembership();
        if (cancelled) {
          return;
        }
        const p = m.membership_plan;
        if (p === "free" || p === "plus" || p === "premium") {
          setCurrentPlan(p);
        }
        setBillingInterval(m.membership_billing_interval === "annual" ? "annual" : "monthly");
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError("load_failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlanChange = async (plan: MembershipPlan) => {
    try {
      const interval: MembershipBillingInterval = plan === "free" ? "monthly" : billingInterval;
      await updateMembershipPlan(plan, interval);
      setCurrentPlan(plan);
      if (plan === "free") {
        setBillingInterval("monthly");
      }
      window.dispatchEvent(new Event("membership-plan-change"));
    } catch {
      setLoadError("save_failed");
    }
  };

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-center text-sm text-red-600" role="alert">
          Unable to load membership. Sign in and try again.
        </p>
      ) : null}
      <MembershipPlans
        currentPlan={currentPlan}
        billingInterval={billingInterval}
        onBillingIntervalChange={setBillingInterval}
        onPlanChange={handlePlanChange}
      />
    </div>
  );
}
