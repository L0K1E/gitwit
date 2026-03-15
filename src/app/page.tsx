import Link from "next/link";
import { Github, Code } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-6">
      <div className="absolute top-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-3xl w-full text-center space-y-8 flex flex-col items-center">
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 shadow-2xl mb-4 inline-flex items-center justify-center">
          <Code className="w-12 h-12 text-teal-400" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
          GitWit
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto">
          The AI Codebase Explainer. Because reading your own spaghetti code from six months ago is hard enough.
        </p>
        
        <div className="pt-8">
          {/* Note: In a real app, this should hit an auth endpoint, e.g. /auth/callback or a server action */}
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-zinc-100 px-8 py-4 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Github className="w-5 h-5" />
            <span>Sign in with GitHub</span>
            <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-zinc-400/50 transition-all duration-200"></div>
          </Link>
        </div>
        
        <div className="mt-16 text-zinc-500 text-sm">
          Warning: May judge your variable naming conventions.
        </div>
      </div>
    </main>
  );
}
