import { CheckinForm } from "@/components/shared/checkin-form";

export default function GroupCheckinPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in zoom-in-95 duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Daily Verification</h1>
        <p className="text-zinc-400">Your peers will review your submission.</p>
      </div>
      <CheckinForm />
    </div>
  );
}
