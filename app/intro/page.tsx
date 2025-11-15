"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Camera, ShoppingCart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

export default function IntroPage() {
  const router = useRouter();
  const [skipIntro, setSkipIntro] = useState(false);

  useEffect(() => {
    // Preload camera permissions in background
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {
          // Ignore errors during preload
        });
    }
  }, []);

  const handleStartScanning = () => {
    if (skipIntro) {
      localStorage.setItem('kh_seen_intro', 'true');
    }
    router.push('/scan');
  };

  const steps = [
    {
      icon: Camera,
      emoji: "📸",
      number: "①",
      title: "Scan",
      description: "Point camera at competitor whiskey bottle",
    },
    {
      icon: ShoppingCart,
      emoji: "🛒",
      number: "②",
      title: "Buy",
      description: "Purchase Keeper's Heart whiskey",
    },
    {
      icon: DollarSign,
      emoji: "💰",
      number: "③",
      title: "Get $5",
      description: "Upload receipt, get instant rebate",
    },
  ];

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-cream mb-8">
            How It Works
          </h1>
        </motion.div>

        {/* Steps */}
        <div className="space-y-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="flex gap-6 items-start"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-whiskey-amber flex items-center justify-center text-2xl">
                {step.emoji}
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold text-cream mb-1 flex items-center gap-2">
                  <span className="text-whiskey-amber">{step.number}</span>
                  {step.title}
                </h3>
                <p className="text-cream/80 text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 pt-6"
        >
          <Button
            onClick={handleStartScanning}
            size="lg"
            className="w-full text-xl py-6 h-auto font-bold tracking-wide"
          >
            Start Scanning
          </Button>

          {/* Skip intro checkbox */}
          <div className="flex items-center justify-center gap-2">
            <Checkbox
              id="skip-intro"
              checked={skipIntro}
              onCheckedChange={(checked) => setSkipIntro(checked)}
            />
            <label
              htmlFor="skip-intro"
              className="text-sm text-cream/70 cursor-pointer select-none"
            >
              Skip intro next time
            </label>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
