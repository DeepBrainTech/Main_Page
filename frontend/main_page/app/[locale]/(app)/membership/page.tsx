"use client";

import { useEffect, useState } from "react";
import MembershipPlans, { type MembershipPlan } from "@/components/features/membership/MembershipPlans";

export default function MembershipPage() {
  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>("free");

  useEffect(() => {
    const savedPlan = window.localStorage.getItem("membership_plan");
    if (savedPlan === "free" || savedPlan === "plus" || savedPlan === "premium") {
      setCurrentPlan(savedPlan);
    }
  }, []);

  const handlePlanChange = (plan: MembershipPlan) => {
    setCurrentPlan(plan);
    window.localStorage.setItem("membership_plan", plan);
    window.dispatchEvent(new Event("membership-plan-change"));
  };

  return <MembershipPlans currentPlan={currentPlan} onPlanChange={handlePlanChange} />;
}
