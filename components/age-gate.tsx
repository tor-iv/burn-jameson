"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import Image from "next/image"

interface AgeGateProps {
  onVerified: () => void
}

export default function AgeGate({ onVerified }: AgeGateProps) {
  const [rememberMe, setRememberMe] = useState(true)

  const handleExit = () => {
    window.location.href = "https://www.responsibility.org/"
  }

  const handleVerify = () => {
    if (rememberMe) {
      localStorage.setItem("keepersHeartAgeVerified", "true")
    }
    onVerified()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2a2a] p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/keepers-heart-logo.png"
            alt="Keeper's Heart Whiskey"
            width={200}
            height={200}
            className="w-48 h-48"
          />
        </div>

        <div className="space-y-4">
          <h1 className="font-serif text-5xl md:text-6xl font-normal text-[#c87d4a] tracking-wide">ID PLEASE.</h1>

          <p className="text-base text-gray-300 text-balance leading-relaxed max-w-sm mx-auto">
            To access this website you must be of legal drinking age or older in your country of access.
          </p>
        </div>

        <div className="space-y-6 pt-4">
          <p className="text-lg text-gray-300">Are you over 21 years of age?</p>

          <div className="flex gap-6 justify-center">
            <Button
              onClick={handleExit}
              variant="outline"
              size="lg"
              className="border-2 border-[#c87d4a] text-[#c87d4a] hover:bg-[#c87d4a]/10 font-semibold text-lg px-12 py-6 rounded-none bg-transparent uppercase tracking-wider"
            >
              NO
            </Button>
            <Button
              onClick={handleVerify}
              variant="outline"
              size="lg"
              className="border-2 border-[#c87d4a] text-[#c87d4a] hover:bg-[#c87d4a]/10 font-semibold text-lg px-12 py-6 rounded-none bg-transparent uppercase tracking-wider"
            >
              YES
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="border-primary data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer">
              Remember me
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
