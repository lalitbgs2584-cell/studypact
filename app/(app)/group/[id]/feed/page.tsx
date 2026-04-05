import { CheckinCard } from "@/components/shared/checkin-card";
import { CheckinForm } from "@/components/shared/checkin-form";
import { Users } from "lucide-react";

export default function GroupFeedPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <Users className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Group Feed</h1>
          <p className="text-zinc-400">See what your peers are working on today.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CheckinCard 
            user="Alice Johnson" 
            time="2 hours ago" 
            status="APPROVED" 
            reflection="Read chapter 4 of mastering algorithms. It was tough but I finally understand Dynamic Programming."
          />
          <CheckinCard 
            user="Bob Smith" 
            time="Just now" 
            status="PENDING" 
            reflection="Completed 5 leetcode problems focusing on trees."
          />
        </div>
        
        <div className="lg:col-span-1 sticky top-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Today's Check-in</h3>
            <p className="text-sm text-zinc-500 mb-4">Don't forget to submit your proof before midnight!</p>
            <CheckinForm />
          </div>
        </div>
      </div>
    </div>
  );
}
