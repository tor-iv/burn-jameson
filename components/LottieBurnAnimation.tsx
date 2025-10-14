"use client";

import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import fireAnimation from "@/public/animations/fire-burn.json";

interface BurnAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

export default function LottieBurnAnimation({ boundingBox, imageUrl }: BurnAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    // Play animation once component mounts
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  }, []);

  if (!imageUrl) {
    return null;
  }

  // Convert normalized coordinates to viewport percentages
  const style = {
    position: "absolute" as const,
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
    pointerEvents: "none" as const,
    zIndex: 10,
  };

  return (
    <div style={style}>
      <Lottie
        lottieRef={lottieRef}
        animationData={fireAnimation}
        loop={false}
        autoplay={true}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
