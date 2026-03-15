"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Github, Terminal, Loader2 } from "lucide-react";

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "auth_required") {
      setMessage("Whoa there! You need to sign in first. Don't worry, we only judge your code, not you.");
    }
  }, [searchParams]);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "repo",
      },
    });

    if (error) {
      console.error("OAuth error:", error);
      setMessage("Something went wrong. Even bugs have bugs sometimes.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-6">
      <div className="absolute top-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full text-center space-y-8 flex flex-col items-center">
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 shadow-2xl mb-4 inline-flex items-center justify-center">
          <Terminal className="w-10 h-10 text-teal-400" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
          Welcome Back
        </h1>

        <p className="text-lg text-zinc-400 max-w-sm">
          Sign in to continue explaining your codebase to yourself.
        </p>

        {message && (
          <div className="w-full p-4 bg-zinc-900/80 border border-zinc-700 rounded-xl text-sm text-zinc-300">
            {message}
          </div>
        )}

        <button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-zinc-100 px-8 py-4 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Github className="w-5 h-5" />
          )}
          <span>{isLoading ? "Redirecting..." : "Sign in with GitHub"}</span>
        </button>

        <p className="text-xs text-zinc-500 max-w-xs">
          By signing in, you agree to let us read your code. We promise not to laugh. Much.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
