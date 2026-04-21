"use client";

import TestTab from "@/components/features/test/TestTab";
import { useAuthedUser } from "@/components/layout/AuthedUserContext";

export default function TestPage() {
  const { dateOfBirth } = useAuthedUser();
  return <TestTab dateOfBirth={dateOfBirth} />;
}
