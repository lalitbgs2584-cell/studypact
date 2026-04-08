import { notFound } from "next/navigation";
import { CheckinForm } from "@/components/shared/checkin-form";
import { GroupNav } from "@/components/shared/group-nav";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";

export default async function GroupCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/checkin`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in zoom-in-95 duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">{membership.group.name}</h1>
        <p className="text-zinc-400">Submit today&apos;s proof and let your peers review it.</p>
      </div>
      <GroupNav groupId={id} active="checkin" />
      <CheckinForm groupId={id} />
    </div>
  );
}
