import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";

export function AdminGroupCard() {
  return (
    <Card className="bg-black/60 border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <Badge className="mb-2 bg-indigo-500/10 text-indigo-400 font-semibold border-indigo-500/20">CS101 Study Group</Badge>
          <CardTitle className="text-2xl text-white font-bold tracking-tight">Backend Engineering Bootcampt</CardTitle>
        </div>
        <Button variant="outline" size="icon" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-white">
          <Settings className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Members</span>
            <div className="flex items-center gap-2 mt-auto">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-white">12</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Deposit</span>
            <div className="flex items-center gap-2 mt-auto">
              <span className="text-2xl font-bold text-emerald-400">$50</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Pool</span>
            <div className="flex items-center gap-2 mt-auto">
              <Wallet className="w-4 h-4 text-emerald-500/70" />
              <span className="text-2xl font-bold text-emerald-400">$600</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-center">
            <Link href="/group/1/feed" className="w-full h-full flex items-center justify-center">
              <Button variant="ghost" className="w-full h-full rounded-lg text-primary hover:text-primary hover:bg-primary/10">
                View Feed <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
