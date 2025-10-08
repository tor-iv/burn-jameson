"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraScanner from "@/components/camera-scanner";
import BurnAnimation from "@/components/burn-animation";
import { saveScan, getScansCount } from "@/lib/local-storage";

export default function ScanPage() {
  const router = useRouter();
  const [showBurnAnimation, setShowBurnAnimation] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scansCount, setScansCount] = useState(0);
  const [scanId, setScanId] = useState<string | null>(null);

  useEffect(() => {
    setScansCount(getScansCount());
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    console.log("QR Code scanned:", decodedText);
    setScannedCode(decodedText);

    // Save scan to localStorage
    try {
      const scan = saveScan(decodedText);
      setScanId(scan.id);

      // Trigger burn animation
      setShowBurnAnimation(true);
    } catch (error) {
      console.error("Error saving scan:", error);
      alert("Failed to save scan. Please try again.");
    }
  };

  const handleBurnComplete = () => {
    setShowBurnAnimation(false);

    // Navigate to reveal page with the scan ID
    if (scanId) {
      router.push(`/reveal/${scanId}`);
    }
  };

  const handleClose = () => {
    router.push("/intro");
  };

  return (
    <>
      <CameraScanner
        onScanSuccess={handleScanSuccess}
        onClose={handleClose}
        scansCount={scansCount}
      />

      <BurnAnimation
        isActive={showBurnAnimation}
        onComplete={handleBurnComplete}
      />
    </>
  );
}
