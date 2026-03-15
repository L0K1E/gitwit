"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { Github, LogOut, PanelLeftClose, PanelLeftOpen, Terminal, Send, Loader2 } from "lucide-react";
import { AddRepoModal } from "@/components/add-repo-modal";
import { BrainStatus } from "@/components/brain-status";
import { createClient } from "@/utils/supabase/client";

interface Repository {
  id: string;
  name: string;
  repo_url: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch repos on mount
  useEffect(() => {
    fetchRepositories();
  }, []);

  // Update selected repo from URL params if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repoIdParam = params.get("repoId");
    if (repoIdParam) {
      setSelectedRepoId(repoIdParam);
    } else if (repos.length > 0) {
      // Default to first repo if none selected
      setSelectedRepoId(repos[0].id);
    }
  }, [repos]);

  const fetchRepositories = async () => {
    try {
      setIsLoadingRepos(true);
      const response = await fetch("/api/repos");
      if (!response.ok) throw new Error("Failed to fetch repos");
      
      const data = await response.json();
      setRepos(data.repositories || []);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
      setRepos([]);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRepoSelect = (repoId: string) => {
    setSelectedRepoId(repoId);
    // Update URL params
    const params = new URLSearchParams(window.location.search);
    params.set("repoId", repoId);
    window.history.replaceState({}, "", `?${params.toString()}`);
  };

  const handleRepoAdded = () => {
    fetchRepositories();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Use a more generic type to bypass the version-mismatch error
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  } = useChat({
    api: "/api/chat",
    body: {
      repoId: selectedRepoId,
    },
  } as any) as any;

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 overflow-hidden"
          } flex flex-col`}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-lg tracking-tight">GitWit</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Your Repositories
          </div>

          {isLoadingRepos ? (
            <div className="text-sm text-zinc-400 text-center p-4">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              <p>Loading...</p>
            </div>
          ) : repos.length === 0 ? (
            <div className="text-sm text-zinc-400 text-center p-4 border border-dashed border-zinc-800 rounded-lg">
              <p className="mb-2">No repos here yet.</p>
              <p className="text-xs">It's lonely. Go break some code.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {repos.map((repo) => (
                <li
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo.id)}
                  className={`text-sm p-2 rounded-md cursor-pointer transition-colors ${
                    selectedRepoId === repo.id
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/50"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  {repo.name}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Github className="w-4 h-4" />
            Connect Repo
          </button>
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-3">
          {selectedRepo && (
            <div className="flex items-center justify-center">
              <BrainStatus repoUrl={selectedRepo.repo_url} />
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full p-2 disabled:opacity-50"
          >
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        <header className="absolute top-0 left-0 right-0 h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800 transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="ml-4 font-medium text-zinc-200">
            {selectedRepo ? `Chatting with ${selectedRepo.name}` : "Waiting for code..."}
          </div>
        </header>

        <div className="flex-1 overflow-hidden pt-16">
          <div className="h-full flex flex-col items-center justify-center p-4">
            {selectedRepo ? (
              <div className="w-full max-w-3xl h-full border border-zinc-800 rounded-xl bg-zinc-900/50 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                      <div className="text-sm">Chat started. Ask me about your codebase!</div>
                    </div>
                  ) : (
                    messages.map((m: any) => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user'
                          ? 'bg-teal-600 text-zinc-50'
                          : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          }`}>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Decoding your variable names (this might take a second)...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                  <form onSubmit={handleSubmit} className="relative">
                    <input
                      value={input}
                      onChange={handleInputChange}
                      disabled={isLoading || !selectedRepoId}
                      type="text"
                      placeholder="Ask about your repo..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm text-zinc-200 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input || !selectedRepoId}
                      className="absolute right-2 top-2 p-1.5 bg-teal-500 hover:bg-teal-400 disabled:bg-zinc-700 text-zinc-950 disabled:text-zinc-500 rounded-full transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <Terminal className="w-12 h-12 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold mb-2 text-zinc-400">Ready to Explain</h2>
                <p className="max-w-sm text-center text-sm">
                  Connect a repository in the sidebar to start chatting. I promise I'll be nice about your `console.log` debugging.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Repo Modal */}
        <AddRepoModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRepoAdded={handleRepoAdded}
        />
      </main>
    </div>
  );
}
