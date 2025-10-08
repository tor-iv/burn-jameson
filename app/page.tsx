"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgeGate from "@/components/age-gate";

export default function Home() {
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user has already verified their age
    const ageVerified = localStorage.getItem("keepersHeartAgeVerified");
    if (ageVerified === "true") {
      setIsAgeVerified(true);
      router.push("/intro");
    }
    setIsLoading(false);
  }, [router]);

  const handleAgeVerified = () => {
    localStorage.setItem("keepersHeartAgeVerified", "true");
    setIsAgeVerified(true);
    router.push("/intro");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-cream text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAgeVerified) {
    return <AgeGate onVerified={handleAgeVerified} />;
  }

  return null;
}
