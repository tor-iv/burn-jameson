"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgeGate from "@/components/age-gate";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user has already verified their age
    const ageVerified = localStorage.getItem("kh_age_verified");
    const seenIntro = localStorage.getItem("kh_seen_intro");

    if (ageVerified) {
      // Skip landing page if already verified
      if (seenIntro) {
        router.push("/scan");
      } else {
        router.push("/intro");
      }
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleGetStarted = () => {
    setShowAgeGate(true);
  };

  const handleAgeVerified = () => {
    localStorage.setItem("kh_age_verified", Date.now().toString());
    setShowAgeGate(false);
    router.push("/intro");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="text-cream text-xl">Loading...</div>
      </div>
    );
  }

  if (showAgeGate) {
    return <AgeGate onVerified={handleAgeVerified} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal px-6 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/keepers-heart-logo.png"
            alt="Keeper's Heart Whiskey"
            width={160}
            height={160}
            className="w-40 h-40"
            priority
          />
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-cream tracking-tight">
            BURN THAT AD
          </h1>
          <p className="text-3xl md:text-4xl font-playfair text-whiskey-amber font-semibold">
            Get $5 Back
          </p>
        </div>

        {/* Body Copy */}
        <p className="text-lg text-cream/90 leading-relaxed max-w-sm mx-auto">
          Scan competitor whiskey, buy ours, get cash back
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="w-full max-w-xs text-xl py-6 h-auto font-bold tracking-wide"
          >
            I'm 21+ Let's Go
          </Button>
        </div>

        {/* Footer Links */}
        <div className="pt-8 text-sm text-cream/60 space-x-4">
          <a href="/terms" className="hover:text-cream transition-colors">
            Terms
          </a>
          <span>•</span>
          <a href="/privacy" className="hover:text-cream transition-colors">
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}
