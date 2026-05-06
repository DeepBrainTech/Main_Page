"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultLearningAccess,
  mapBundleAccessToLearningAccess,
  type LearningAccess,
} from "@/lib/learningUnlock";
import { fetchMentalMathBundleAccess } from "@/services/userApi";

export function useLearningAccess(): LearningAccess {
  const [access, setAccess] = useState<LearningAccess>(defaultLearningAccess);

  const load = useCallback(async () => {
    try {
      const data = await fetchMentalMathBundleAccess();
      setAccess(mapBundleAccessToLearningAccess(data));
    } catch {
      setAccess(defaultLearningAccess);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => {
      void load();
    };
    window.addEventListener("learning-unlock-change", sync);
    window.addEventListener("membership-plan-change", sync);
    return () => {
      window.removeEventListener("learning-unlock-change", sync);
      window.removeEventListener("membership-plan-change", sync);
    };
  }, [load]);

  return access;
}
