"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getIngestionStatus } from "@/lib/ingestion";

interface BrainStatusProps {
  repoUrl?: string;
}

type HealthStatus = "idle" | "healthy" | "indexing" | "error";

export function BrainStatus({ repoUrl }: BrainStatusProps) {
  const [status, setStatus] = useState<HealthStatus>("idle");
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!repoUrl) {
      setStatus("idle");
      setIsPolling(false);
      return;
    }

    // Check initial status
    const checkStatus = () => {
      const ingestionStatus = getIngestionStatus(repoUrl);
      
      if (ingestionStatus.status === "completed") {
        setStatus("healthy");
        setIsPolling(false);
      } else if (
        ingestionStatus.status === "fetching" ||
        ingestionStatus.status === "chunking" ||
        ingestionStatus.status === "embedding"
      ) {
        setStatus("indexing");
        setIsPolling(true);
      } else if (ingestionStatus.status === "error") {
        setStatus("error");
        setIsPolling(false);
      } else {
        setStatus("idle");
        setIsPolling(false);
      }
    };

    checkStatus();

    // Set up polling interval if indexing
    let pollInterval: NodeJS.Timeout | null = null;
    if (isPolling || status === "indexing") {
      pollInterval = setInterval(checkStatus, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [repoUrl, isPolling, status]);

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
