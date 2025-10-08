"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Camera, Flame, Gift } from "lucide-react";

export default function IntroPage() {
  const router = useRouter();

  const steps = [
    {
      icon: Camera,
      title: "Scan Any Jameson Ad",
      description: "Point your camera at Jameson advertisements, menus, or bottles",
    },
    {
      icon: Flame,
      title: "Watch It Transform",
      description: "Experience the AR burn effect as the ad disappears",
    },
    {
      icon: Gift,
      title: "Get Your Reward",
      description: "Receive exclusive discounts and offers for Keeper's Heart Whiskey",
    },
  ];

  return (
    <div className="min-h-screen bg-oak relative overflow-hidden">
      {/* Wood grain texture overlay */}
      <div className="absolute inset-0 bg-[url('/wood-texture.png')] opacity-5 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-oak/95 backdrop-blur-sm border-b border-charcoal/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-whiskey-amber rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-cream" />
            </div>
            <span className="font-playfair font-bold text-xl text-charcoal">
              Burn That Ad
            </span>
          </div>
          <button className="w-10 h-10 flex flex-col gap-1.5 items-center justify-center">
            <span className="w-6 h-0.5 bg-charcoal" />
            <span className="w-6 h-0.5 bg-charcoal" />
            <span className="w-6 h-0.5 bg-charcoal" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h1 className="font-playfair font-bold text-5xl md:text-6xl lg:text-7xl text-charcoal mb-4">
            Discover Hidden Whiskey
          </h1>
          <div className="w-32 h-1 bg-whiskey-amber mx-auto rounded-full mb-6" />
          <p className="text-lg md:text-xl text-charcoal/80 max-w-2xl mx-auto leading-relaxed">
            Turn competitor advertisements into exclusive rewards from Keeper's Heart Whiskey
          </p>
        </motion.div>

        {/* Steps Section */}
        <div className="space-y-16 mb-20">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-whiskey-amber to-copper flex items-center justify-center shadow-lg">
                    <Icon className="w-12 h-12 text-cream" strokeWidth={2} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald text-cream font-bold flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-playfair font-bold text-2xl md:text-3xl text-charcoal mb-3">
                  {step.title}
                </h3>
                <p className="text-base md:text-lg text-charcoal/70 max-w-md leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <button
            onClick={() => router.push("/scan")}
            className="tap-target bg-whiskey-amber text-cream font-bold text-lg px-16 py-5 rounded-xl shadow-xl hover:bg-whiskey-light transition-all duration-300 hover:scale-105 active:scale-95"
          >
            START SCANNING
          </button>
          <p className="mt-6 text-sm text-charcoal/60">
            Must be 21+ to participate. Terms & conditions apply.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-charcoal/10 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-charcoal/60">
          <p>© 2025 Keeper's Heart Whiskey. Drink Responsibly.</p>
        </div>
      </footer>
    </div>
  );
}
