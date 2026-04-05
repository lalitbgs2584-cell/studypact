import { Button } from "@/components/ui/button";
import { LinkIcon } from "lucide-react";

export default function JoinGroupPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10"></div>
      
      <div className="max-w-md w-full bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-10 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
          <LinkIcon className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">You've been invited!</h1>
        <p className="text-zinc-400 mb-8">
          You are about to join a StudyPact group using invite token <span className="font-mono text-zinc-200">"{params.token}"</span>. Ready to commit?
        </p>

        <Button className="w-full font-medium h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
          Accept Invitation
        </Button>
      </div>
    </div>
  );
}
