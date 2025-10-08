"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Camera, X, CheckCircle } from "lucide-react";
import { getScanById, type LocalScan } from "@/lib/local-storage";

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params.scanId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scan, setScan] = useState<LocalScan | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [venmoUsername, setVenmoUsername] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!scanId) {
      router.push("/intro");
      return;
    }

    const foundScan = getScanById(scanId);
    if (!foundScan) {
      router.push("/intro");
      return;
    }

    setScan(foundScan);
  }, [scanId, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !venmoUsername) {
      alert("Please upload a receipt and enter your Venmo username");
      return;
    }

    // In production, this would upload to Supabase Storage
    // For now, we'll just simulate a successful upload
    console.log("Receipt uploaded:", {
      scanId,
      file: selectedFile.name,
      venmoUsername,
    });

    setIsSubmitted(true);
  };

  const clearPreview = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oak">
        <div className="text-charcoal text-xl">Loading...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-oak flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-cream" />
          </div>
          <h1 className="text-3xl font-playfair font-bold text-charcoal mb-4">
            Receipt Submitted!
          </h1>
          <p className="text-charcoal/70 mb-8">
            We'll review your receipt and send your $5 rebate to{" "}
            <strong>@{venmoUsername}</strong> within 3-5 business days.
          </p>
          <button
            onClick={() => router.push("/intro")}
            className="w-full tap-target bg-whiskey-amber hover:bg-whiskey-light text-cream font-bold py-4 px-6 rounded-xl transition-all duration-300 active:scale-95"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oak py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-playfair font-bold text-charcoal mb-2">
            Upload Your Receipt
          </h1>
          <p className="text-charcoal/70 text-lg">
            Get $5 cash back via Venmo
          </p>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-whiskey-amber/10 border-2 border-whiskey-amber/30 rounded-xl p-6 mb-8"
        >
          <h2 className="font-bold text-charcoal mb-3">Requirements:</h2>
          <ul className="space-y-2 text-charcoal/70">
            <li className="flex items-start gap-2">
              <span className="text-whiskey-amber mt-1">✓</span>
              <span>Receipt must show Keeper's Heart Whiskey purchase</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-whiskey-amber mt-1">✓</span>
              <span>Must be dated within the last 14 days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-whiskey-amber mt-1">✓</span>
              <span>Image must be clear and readable</span>
            </li>
          </ul>
        </motion.div>

        {/* Upload Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-charcoal font-medium mb-3">
              Receipt Photo
            </label>

            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-charcoal/30 rounded-xl p-12 text-center cursor-pointer hover:border-whiskey-amber hover:bg-whiskey-amber/5 transition-all tap-target"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-whiskey-amber/20 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-whiskey-amber" />
                  </div>
                  <div>
                    <p className="text-charcoal font-medium mb-1">
                      Take a photo or upload
                    </p>
                    <p className="text-charcoal/60 text-sm">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border-2 border-whiskey-amber">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full h-auto"
                />
                <button
                  type="button"
                  onClick={clearPreview}
                  className="absolute top-4 right-4 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center tap-target hover:bg-charcoal transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Venmo Username */}
          <div className="mb-8">
            <label
              htmlFor="venmo"
              className="block text-charcoal font-medium mb-3"
            >
              Venmo Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-charcoal/60 font-medium">
                @
              </span>
              <input
                id="venmo"
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="yourvenmo"
                className="w-full pl-8 pr-4 py-4 border-2 border-charcoal/30 rounded-xl focus:border-whiskey-amber focus:outline-none transition-colors text-charcoal"
                required
              />
            </div>
            <p className="text-charcoal/60 text-sm mt-2">
              We'll send your $5 rebate here
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedFile || !venmoUsername}
            className="w-full tap-target bg-whiskey-amber hover:bg-whiskey-light text-cream font-bold py-5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-whiskey-amber"
          >
            <Upload className="w-5 h-5" />
            Submit Receipt
          </button>

          <p className="text-charcoal/60 text-xs text-center mt-4">
            By submitting, you agree to our terms and conditions
          </p>
        </motion.form>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/reveal/${scanId}`)}
            className="text-charcoal/60 hover:text-charcoal text-sm"
          >
            ← Back to Coupon
          </button>
        </div>
      </div>
    </div>
  );
}
