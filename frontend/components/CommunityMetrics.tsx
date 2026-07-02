"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSupportMetrics } from "@/services/api";
import { SupportMetrics } from "@/types";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
}

function AnimatedCounter({ value, prefix = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 850; // duration in ms for counting effect

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}</span>;
}

export default function CommunityMetrics() {
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSupportMetrics()
      .then((data) => {
        if (active) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      id: "chais",
      title: "Total Chais Funded",
      value: metrics?.total_chais_funded ?? 0,
      icon: "🍵",
      borderColor: "hover:border-brutal-yellow/50 border-border dark:hover:border-accent-yellow/50",
      bgColor: "bg-brutal-yellow/[0.02] dark:bg-brutal-yellow/[0.04]",
    },
    {
      id: "supporters",
      title: "Total Supporters",
      value: metrics?.total_supporters ?? 0,
      icon: "❤️",
      borderColor: "hover:border-brutal-red/50 border-border dark:hover:border-accent-red/50",
      bgColor: "bg-brutal-red/[0.02] dark:bg-brutal-red/[0.04]",
    },
    {
      id: "amount",
      title: "Total Amount Raised",
      value: metrics?.total_amount_raised ?? 0,
      icon: "🚀",
      borderColor: "hover:border-brutal-blue/50 border-border dark:hover:border-accent-blue/50",
      bgColor: "bg-brutal-blue/[0.02] dark:bg-brutal-blue/[0.04]",
      prefix: "₹",
    },
  ];

  return (
    <div className="w-full border border-border bg-card p-6 rounded-2xl shadow-sm mt-6 select-none">
      {/* Tracker Header */}
      <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
            Community Support Tracker
          </h3>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-accent-light text-foreground text-[10px] font-bold uppercase rounded-full border border-border shadow-xs">
          <span className="w-1.5 h-1.5 bg-brutal-blue rounded-full animate-pulse" />
          <span>Milestones</span>
        </div>
      </div>

      {/* Grid Layout for Milestone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
            whileHover={{ y: -3, scale: 1.005 }}
            className={`p-4 rounded-xl border ${card.bgColor} ${card.borderColor} flex items-center justify-between gap-4 transition-all duration-200 cursor-pointer shadow-xs`}
          >
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-semibold text-muted block uppercase tracking-wider">
                {card.title}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-foreground font-mono-custom tracking-tight flex items-center">
                {loading ? (
                  <span className="h-6 w-12 bg-accent-light rounded animate-pulse" />
                ) : (
                  <AnimatedCounter value={card.value} prefix={card.prefix} />
                )}
              </span>
            </div>

            <div className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center shrink-0 shadow-xs text-xl select-none hover:scale-105 active:scale-95 transition-transform duration-200">
              <span>{card.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
