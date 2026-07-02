"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Coffee, Sparkles, CheckCircle2, AlertTriangle, CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { createSupportOrder, verifySupportPayment } from "@/services/api";

interface SupportModalProps {
  onClose: () => void;
}

type PaymentState = "idle" | "custom_input" | "creating_order" | "verifying" | "mock_checkout" | "success" | "failed";

export default function SupportModal({ onClose }: SupportModalProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [completedAmount, setCompletedAmount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [rzpKey, setRzpKey] = useState<string>("");

  // Load Razorpay Checkout Script
  useEffect(() => {
    const scriptId = "razorpay-checkout-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Predefined options
  const presets = [
    { id: "1_chai", title: "Buy 1 Chai", subtitle: "A warm cup of appreciation", amount: 20, icon: "🍵" },
    { id: "3_chais", title: "Buy 3 Chais", subtitle: "Fueling our coding sessions", amount: 60, icon: "🍵🍵🍵" },
    { id: "5_chais", title: "Buy 5 Chais", subtitle: "Keeping the servers caffeinated", amount: 100, icon: "🍵🍵🍵🍵🍵" },
  ];

  // Handle preset selection pay trigger
  const handlePayPreset = async (amount: number) => {
    setSelectedAmount(amount);
    await initiatePayment(amount);
  };

  // Handle custom amount input trigger
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(customAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Invalid Amount", {
        description: "Please enter a valid contribution amount.",
      });
      return;
    }
    setSelectedAmount(amountVal);
    await initiatePayment(amountVal);
  };

  // Master payment initiator
  const initiatePayment = async (amount: number) => {
    setPaymentState("creating_order");
    try {
      // 1. Create order on the backend
      const orderData = await createSupportOrder(amount);

      if (orderData.is_mock) {
        // Run in mock simulation mode if keys are not set on server
        setOrderId(orderData.order_id);
        setRzpKey(orderData.key_id);
        setPaymentState("mock_checkout");
      } else {
        // Run in real Razorpay mode
        if (!(window as any).Razorpay) {
          throw new Error("Razorpay payment gateway failed to load. Please check your network.");
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Verity IQ",
          description: amount === 20 ? "Buy 1 Chai ☕" : amount === 60 ? "Buy 3 Chais ☕☕☕" : amount === 100 ? "Buy 5 Chais ☕☕☕☕☕" : `Buy Custom Chai ✨`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              setPaymentState("verifying");
              await verifySupportPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
              setCompletedAmount(amount);
              setPaymentState("success");
              toast.success("Payment Successful", {
                description: "Thank you for supporting Verity IQ!",
              });
            } catch (err: any) {
              setErrorMsg(err.message || "Payment verification failed.");
              setPaymentState("failed");
            }
          },
          modal: {
            ondismiss: function () {
              toast.info("Payment Cancelled", {
                description: "You closed the checkout window.",
              });
              setPaymentState("idle");
            },
          },
          prefill: {
            name: "Verity IQ Supporter",
          },
          theme: {
            color: "#4285F4", // Google Blue
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setPaymentState("idle"); // reset state so user can select options again if checkout window closes
      }
    } catch (err: any) {
      console.error("[ERROR] Checkout initialization failed:", err);
      setErrorMsg(err.message || "Failed to initialize payment.");
      setPaymentState("failed");
    }
  };

  // Mock sandbox simulation triggers
  const handleSimulateSuccess = async () => {
    setPaymentState("verifying");
    try {
      // Simulate backend verify
      await verifySupportPayment("pay_mock_12345", orderId, "sig_mock_12345");
      setCompletedAmount(selectedAmount);
      setPaymentState("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Mock verification failed.");
      setPaymentState("failed");
    }
  };

  const handleSimulateFailure = () => {
    setErrorMsg("Simulated payment transaction failure.");
    setPaymentState("failed");
  };

  const handleSimulateCancel = () => {
    toast.info("Payment Cancelled", {
      description: "You cancelled the sandbox checkout simulation.",
    });
    setPaymentState("idle");
  };

  // Personalization cup string formatter
  const getSuccessMessage = (amount: number) => {
    if (amount === 20) {
      return "You just bought us 1 cup of chai! ☕";
    } else if (amount === 60) {
      return "You just bought us 3 cups of chai! ☕☕☕";
    } else if (amount === 100) {
      return "You just bought us 5 cups of chai! ☕☕☕☕☕";
    } else {
      return `You just contributed ₹${amount} worth of chais! ✨`;
    }
  };

  // Setup array of floating nodes for the success screen
  const floatingNodes = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    x: (i % 2 === 0 ? 1 : -1) * (15 + (i * 12) % 110),
    delay: (i * 0.25) % 2.5,
    duration: 3 + (i % 3) * 1,
    scale: 0.6 + ((i * 0.15) % 0.8),
    type: i % 3 === 0 ? "☕" : i % 3 === 1 ? "❤️" : "✨",
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred background overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer transition-opacity"
      />

      {/* Modal Dialog container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        className="relative w-full max-w-lg bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] z-10 font-display"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full text-muted hover:bg-accent-light hover:text-foreground transition-all flex items-center justify-center cursor-pointer z-20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Modal content based on paymentState */}
        <AnimatePresence mode="wait">
          {/* STATE 1: SELECTION DASHBOARD */}
          {(paymentState === "idle" || paymentState === "custom_input") && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header Title */}
              <div className="text-center pt-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-brutal-blue/10 text-brutal-blue rounded-full mb-3">
                  <Coffee className="w-6 h-6 stroke-[2]" />
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Support Verity IQ
                </h2>
                <p className="text-xs text-muted mt-2 max-w-sm mx-auto leading-relaxed">
                  We build features out of pure passion. Your contribution helps us cover Gemini API usage and keep the platform free for developers and learners.
                </p>
              </div>

              {/* Preset Items Stack */}
              <div className="space-y-3">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border bg-accent-light/20 hover:bg-accent-light/45 hover:border-brutal-blue/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none">{preset.icon}</span>
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-foreground">{preset.title}</h4>
                        <p className="text-[11px] text-muted font-medium mt-0.5">{preset.subtitle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayPreset(preset.amount)}
                      className="font-bold text-xs px-4 py-2 bg-brutal-blue text-white rounded-full hover:bg-brutal-blue/90 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      Pay ₹{preset.amount}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Custom Amount Button or Form */}
              {paymentState !== "custom_input" ? (
                <button
                  onClick={() => setPaymentState("custom_input")}
                  className="w-full py-3.5 border border-dashed border-border bg-transparent text-foreground hover:bg-accent-light/35 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-brutal-yellow" />
                  Or Contribution Custom Amount
                </button>
              ) : (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleCustomSubmit}
                  className="space-y-3 pt-2 border-t border-border/40"
                >
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block text-left">
                    Enter Custom Contribution (INR)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="150"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        required
                        className="w-full bg-accent-light/50 border border-border pl-8 pr-4 py-3 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brutal-blue/50 focus:border-brutal-blue transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-3 bg-brutal-blue text-white font-bold text-xs rounded-full hover:bg-brutal-blue/90 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentState("idle")}
                    className="text-[10px] text-muted hover:text-foreground font-semibold underline block text-center mx-auto"
                  >
                    Go Back
                  </button>
                </motion.form>
              )}
            </motion.div>
          )}

          {/* STATE 2: LOADING / PROCESSING */}
          {(paymentState === "creating_order" || paymentState === "verifying") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center space-y-4"
            >
              <div className="inline-block relative">
                <Loader2 className="w-12 h-12 text-brutal-blue animate-spin stroke-[2]" />
                <span className="absolute inset-0 flex items-center justify-center text-xs">☕</span>
              </div>
              <h3 className="font-bold text-base text-foreground">
                {paymentState === "creating_order"
                  ? "Securing Checkout Order..."
                  : "Verifying Secure Transaction..."}
              </h3>
              <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                Please do not refresh this page or close the window while we communicate with Razorpay.
              </p>
            </motion.div>
          )}

          {/* STATE 3: SANDBOX SIMULATOR FALLBACK */}
          {paymentState === "mock_checkout" && (
            <motion.div
              key="mock_checkout"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pt-2 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-brutal-yellow/15 text-brutal-yellow rounded-full">
                <CreditCard className="w-6 h-6 stroke-[2]" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Verity IQ Sandbox Checkout
                </h3>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-brutal-yellow/10 border border-brutal-yellow/20 rounded-full text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-brutal-yellow rounded-full animate-ping" />
                  Development Sandbox
                </div>
              </div>

              <div className="bg-accent-light/30 border border-border p-4 rounded-2xl text-xs space-y-2 leading-relaxed text-left text-muted">
                <p>
                  We detected that no Razorpay API credentials are configured in your server environment variables.
                </p>
                <div className="font-mono-custom text-[10px] bg-accent-light/70 p-2 rounded-lg text-foreground border border-border/40 mt-1 flex flex-col gap-0.5">
                  <span>Order: {orderId}</span>
                  <span>Amount: ₹{selectedAmount}</span>
                </div>
                <p className="text-[10px] mt-1 italic text-muted">
                  Choose a simulation behavior to verify the UI checkout results:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={handleSimulateSuccess}
                  className="w-full py-3 bg-brutal-green text-white font-bold text-xs rounded-full hover:bg-brutal-green/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simulate Successful Payment
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSimulateFailure}
                    className="py-2.5 bg-brutal-red text-white font-bold text-xs rounded-full hover:bg-brutal-red/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Fail Payment
                  </button>
                  <button
                    onClick={handleSimulateCancel}
                    className="py-2.5 bg-accent-light text-foreground border border-border font-bold text-xs rounded-full hover:bg-accent-light/80 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 4: SUCCESS / THANK YOU CARD */}
          {paymentState === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center space-y-6 relative overflow-hidden"
            >
              {/* Floating Emojis Celebration Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                {floatingNodes.map((node) => (
                  <motion.div
                    key={node.id}
                    initial={{ y: 220, opacity: 0, x: node.x, scale: node.scale }}
                    animate={{
                      y: -250,
                      opacity: [0, 0.95, 0.95, 0],
                      x: node.x + Math.sin(node.id) * 30,
                    }}
                    transition={{
                      delay: node.delay,
                      duration: node.duration,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute bottom-0 left-1/2 text-lg z-0"
                  >
                    {node.type}
                  </motion.div>
                ))}
              </div>

              {/* Success content box */}
              <div className="relative z-10 space-y-5">
                {/* Check Icon and Cup */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-brutal-green/10 text-brutal-green rounded-full">
                  <Coffee className="w-10 h-10 stroke-[2] animate-bounce" />
                  <span className="absolute -bottom-1 -right-1 bg-brutal-green text-white p-1 rounded-full border-4 border-card">
                    <CheckCircle2 className="w-4 h-4 fill-brutal-green stroke-white" />
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    Thank You So Much!
                  </h3>
                  <div className="inline-block px-4 py-1.5 bg-brutal-green/10 border border-brutal-green/20 text-brutal-green text-xs font-bold rounded-full">
                    {getSuccessMessage(completedAmount)}
                  </div>
                </div>

                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Your generous cup of coffee helps keep our servers awake, pays our API tokens, and guarantees we can keep adding custom features to Verity IQ. We truly appreciate you!
                </p>

                <button
                  onClick={onClose}
                  className="w-full max-w-xs py-3.5 bg-brutal-blue text-white rounded-full font-bold text-xs hover:bg-brutal-blue/90 active:scale-95 transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  Continue Using Platform
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 5: PAYMENT FAILED / ERROR CARD */}
          {paymentState === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brutal-red/10 text-brutal-red rounded-full">
                <AlertTriangle className="w-8 h-8 stroke-[2] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  Transaction Failed
                </h3>
                <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                  We could not complete the payment check. {errorMsg || "The transaction was declined or timed out."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto w-full">
                <button
                  onClick={() => {
                    setErrorMsg("");
                    setPaymentState("idle");
                  }}
                  className="w-full py-3.5 bg-brutal-blue text-white font-bold text-xs rounded-full hover:bg-brutal-blue/90 active:scale-95 transition-all cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 border border-border bg-transparent text-muted hover:text-foreground font-bold text-xs rounded-full hover:bg-accent-light/50 active:scale-95 transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
