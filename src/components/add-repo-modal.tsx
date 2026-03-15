"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, X, Loader2 } from "lucide-react";
import { getIngestionStatus } from "@/lib/ingestion";

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoAdded?: () => void;
}

type ModalState = "idle" | "submitting" | "polling";

export function AddRepoModal({ isOpen, onClose, onRepoAdded }: AddRepoModalProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [error, setError] = useState("");
  const [pollingProgress, setPollingProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!repoUrl.trim()) {
      setError("Please enter a repository URL");
      return;
    }

    setModalState("submitting");

    try {
      // POST to /api/ingest to start the ingestion process
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          githubToken: githubToken.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to start ingestion");
        setModalState("idle");
        return;
      }

      // Transition to polling state
      setModalState("polling");
      await pollIngestionStatus(repoUrl.trim());

      // Success: reset and close
      setRepoUrl("");
      setGithubToken("");
      setError("");
      setPollingProgress(0);
      setModalState("idle");
      onRepoAdded?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setModalState("idle");
    }
  };

  const pollIngestionStatus = async (repoUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const maxAttempts = 120; // 2 minutes with 1s intervals
      let attempts = 0;

      const poll = async () => {
        try {
          const response = await fetch(`/api/ingest?repoUrl=${encodeURIComponent(repoUrl)}`);
          if (!response.ok) throw new Error("Failed to get status");

          const data = await response.json();
          const status = data.status;

          // Update progress based on current status
          if (status.status === "fetching") setPollingProgress(25);
          else if (status.status === "chunking") setPollingProgress(50);
          else if (status.status === "embedding") setPollingProgress(75);
          else if (status.status === "completed") {
            setPollingProgress(100);
            resolve();
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            reject(new Error("Ingestion timed out"));
          }
        } catch (err) {
          reject(err);
        }
      };

      poll();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <Github className="w-5 h-5 text-teal-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-100">Add Repository</h2>
                </div>
                <button
                  onClick={onClose}
                  disabled={modalState !== "idle"}
                  className="text-zinc-400 hover:text-zinc-100 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {modalState === "idle" ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Repository URL
                      </label>
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/user/repo"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        GitHub Token (Optional)
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        For private repos or higher rate limits
                      </p>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-400"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add Repo
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Polling State */
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-teal-500 animate-spin" />
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-200 mb-1">
                        {modalState === "submitting"
                          ? "Starting ingestion..."
                          : "Indexing your code..."}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {pollingProgress > 0
                          ? `${pollingProgress}% complete`
                          : "Please wait, this may take a minute"}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {pollingProgress > 0 && (
                      <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pollingProgress}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-teal-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
