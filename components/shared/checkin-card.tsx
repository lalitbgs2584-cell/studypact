import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert, Sparkles, Check } from "lucide-react";
import Image from "next/image";

interface CheckinCardProps {
  user: string;
  reflection: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  time: string;
}

export function CheckinCard({ user, reflection, status, time }: CheckinCardProps) {
  return (
    <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-xl hover:border-zinc-700 transition-all group overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border border-zinc-800/50">
              <span className="text-sm font-bold text-zinc-300">{user.charAt(0)}</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-base text-zinc-100">{user}</CardTitle>
            <CardDescription className="text-xs text-zinc-500">{time}</CardDescription>
          </div>
        </div>
        {status === "APPROVED" && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
        {status === "PENDING" && <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">Pending Review</Badge>}
        {status === "REJECTED" && <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20"><ShieldAlert className="w-3 h-3 mr-1"/> Rejected</Badge>}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="rounded-xl overflow-hidden relative aspect-video bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-zinc-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <p className="absolute bottom-3 left-3 text-sm font-medium text-white/50">Proof Uploaded (Demo)</p>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-primary/50 pl-3 italic">
          "{reflection}"
        </p>
      </CardContent>
      {status === "PENDING" && (
        <CardFooter className="flex justify-end gap-2 border-t border-zinc-800/20 pt-4 bg-zinc-900/20">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">Reject</Button>
          <Button size="sm" className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            <Check className="w-4 h-4 mr-1"/> Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
