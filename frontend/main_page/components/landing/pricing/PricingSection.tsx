"use client";

import { useState } from "react";
import MembershipPlans, { type MembershipBillingInterval } from "@/components/features/membership/MembershipPlans";
import PricingBackground from "./PricingBackground";

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const billingInterval: MembershipBillingInterval = annual ? "annual" : "monthly";

  return (
    <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28">
      <PricingBackground />
      <div className="relative mx-auto w-[calc(100%-2.5rem)] max-w-[92.8125rem] sm:w-[calc(100%-4rem)]">
        <MembershipPlans
          variant="landing"
          currentPlan="free"
          currentBillingInterval={null}
          billingInterval={billingInterval}
          onBillingIntervalChange={(interval) => setAnnual(interval === "annual")}
          onSubscribe={() => undefined}
          onManageBilling={() => undefined}
          onPlanAction={() => undefined}
          onCancelScheduledPlanChange={() => undefined}
          hasStripeSubscription={false}
          portalEnabled={false}
          checkoutEnabled={false}
          trialEligible
          className="relative z-10"
        />
      </div>
    </section>
  );
}
