"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface BrainStatusProps {
  repoUrl?: string;
}

type HealthStatus = "idle" | "healthy" | "indexing" | "error";

export function BrainStatus({ repoUrl }: BrainStatusProps) {
  const [status, setStatus] = useState<HealthStatus>("idle");

  const checkStatus = useCallback(async () => {
    if (!repoUrl) {
      setStatus("idle");
      return;
    }

    try {
      const response = await fetch(`/api/repos/status?repoUrl=${encodeURIComponent(repoUrl)}`);
      if (!response.ok) throw new Error("Failed to fetch status");
      
      const data = await response.json();
      const ingestionStatus = data.status?.status;

      if (ingestionStatus === "completed") {
        setStatus("healthy");
      } else if (
        ingestionStatus === "fetching" ||
        ingestionStatus === "chunking" ||
        ingestionStatus === "embedding"
      ) {
        setStatus("indexing");
      } else if (ingestionStatus === "error") {
        setStatus("error");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  }, [repoUrl]);

  useEffect(() => {
    checkStatus();

    // Poll every 2 seconds if indexing
    const pollInterval = setInterval(() => {
      if (status === "indexing") {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [checkStatus, status]);

  const getStatusColor = (): string => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "indexing":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-zinc-600";
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case "healthy":
        return "Brain Ready";
      case "indexing":
        return "Indexing...";
      case "error":
        return "Index Error";
      default:
        return "No Code Yet";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-2.5 h-2.5">
        <div className={`absolute inset-0 rounded-full ${getStatusColor()}`} />
        {status === "indexing" && (
          <motion.div
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full ${getStatusColor()}`}
          />
        )}
      </div>
      <span className="text-xs font-medium text-zinc-400">{getStatusText()}</span>
    </div>
  );
}
