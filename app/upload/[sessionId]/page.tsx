"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { saveReceipt, validateSession } from "@/lib/supabase-helpers";

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [venmoUsername, setVenmoUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const [validationError, setValidationError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load saved Venmo username
    const savedVenmo = localStorage.getItem("kh_venmo");
    if (savedVenmo) {
      setVenmoUsername(savedVenmo);
    }

    // Validate session
    validateSession(sessionId).then(({ valid, error }) => {
      if (!valid) {
        setSessionValid(false);
        setValidationError(error || "Invalid session");
      }
    });
  }, [sessionId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const removeReceipt = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
  };

  const handleVenmoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Auto-prefix with @
    if (!value.startsWith("@") && value.length > 0) {
      value = "@" + value;
    }
    setVenmoUsername(value);
  };

  const handleVenmoBlur = () => {
    // Save to localStorage
    if (venmoUsername) {
      localStorage.setItem("kh_venmo", venmoUsername);
    }
  };

  const validateVenmo = (username: string) => {
    const regex = /^@[a-zA-Z0-9_-]{1,30}$/;
    return regex.test(username);
  };

  const isFormValid = receiptImage && venmoUsername && validateVenmo(venmoUsername);

  const handleSubmit = async () => {
    if (!isFormValid || !receiptImage) return;

    setIsSubmitting(true);

    try {
      // Upload receipt to Supabase
      const result = await saveReceipt(
        sessionId,
        receiptImage,
        venmoUsername
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      router.push(`/confirmation/${sessionId}`);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Show error if session is invalid
  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-cream">Session Invalid</h2>
          <p className="text-cream/70">{validationError}</p>
          <Button
            onClick={() => router.push('/scan')}
            size="lg"
            className="mt-4"
          >
            Scan Another Bottle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-cream mb-3">
            Upload Your Receipt
          </h1>
          <p className="text-cream/70">
            Must show Keeper's Heart purchase
          </p>
        </div>

        {/* Receipt Upload */}
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!receiptPreview ? (
            <button
              onClick={handleCameraCapture}
              className="w-full h-48 border-2 border-dashed border-whiskey-amber/50 rounded-xl bg-charcoal/50 hover:bg-charcoal/70 transition-colors flex flex-col items-center justify-center gap-3 text-cream/70 hover:text-cream"
            >
              <Camera className="w-12 h-12" />
              <span className="text-lg">Tap to take photo</span>
            </button>
          ) : (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Receipt"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                onClick={removeReceipt}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Venmo Input */}
        <div className="space-y-2">
          <label htmlFor="venmo" className="block text-cream font-medium">
            Your Venmo
          </label>
          <input
            id="venmo"
            type="text"
            placeholder="@username"
            value={venmoUsername}
            onChange={handleVenmoChange}
            onBlur={handleVenmoBlur}
            className="w-full h-14 px-4 bg-charcoal/50 border-2 border-whiskey-amber/50 rounded-xl text-cream text-lg focus:outline-none focus:border-whiskey-amber transition-colors"
            autoComplete="off"
          />
          {venmoUsername && !validateVenmo(venmoUsername) && (
            <p className="text-red-400 text-sm">
              Username should look like @yourname
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          size="lg"
          className="w-full text-xl py-6 h-auto font-bold"
        >
          {isSubmitting ? "Submitting..." : "Submit & Get $5"}
        </Button>

        <p className="text-center text-cream/50 text-sm">
          Max file size: 10MB
        </p>
      </motion.div>
    </div>
  );
}
