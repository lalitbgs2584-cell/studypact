import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkIcon, Lock, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinGroupAction } from "@/lib/actions/studypact";
import { buildLoginRedirect, getCurrentSessionUser, getInviteLinkState } from "@/lib/server/studypact";

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentSessionUser();
  const inviteState = await getInviteLinkState(token, user?.id);

  async function acceptInvite() {
    "use server";

    const result = await joinGroupAction(token);
    if (result.success && result.groupId) {
      redirect(`/group/${result.groupId}/feed`);
    }
  }

  const loginHref = buildLoginRedirect(`/join/${token}`);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10"></div>

      <div className="max-w-lg w-full bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-10 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
          {inviteState.status === "joinable" || inviteState.status === "already-member" ? (
            <LinkIcon className="w-8 h-8 text-primary" />
          ) : inviteState.status === "full" ? (
            <Users className="w-8 h-8 text-amber-400" />
          ) : (
            <TriangleAlert className="w-8 h-8 text-amber-400" />
          )}
        </div>

        {inviteState.group ? (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">{inviteState.group.name}</h1>
            <p className="text-zinc-400 mb-2">
              {inviteState.group.description || "A focused accountability circle waiting for your next study sprint."}
            </p>
            <p className="text-sm text-zinc-500 mb-8">
              {inviteState.group.memberCount}/{inviteState.group.maxMembers} members • invite expires{" "}
              {new Date(inviteState.group.inviteExpiresAt).toLocaleString("en-IN")}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Invite not found</h1>
            <p className="text-zinc-400 mb-8">
              This StudyPact invite link is missing or no longer valid.
            </p>
          </>
        )}

        {!user ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-4 text-left">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">Sign in to accept this invite</p>
                  <p className="text-xs text-zinc-500">We&apos;ll bring you back here right after login.</p>
                </div>
              </div>
            </div>
            <Link href={loginHref} className="block">
              <Button className="w-full">Log In to Join</Button>
            </Link>
            <Link href={`/signup?redirectTo=${encodeURIComponent(`/join/${token}`)}`} className="block">
              <Button variant="outline" className="w-full">Create Account First</Button>
            </Link>
          </div>
        ) : inviteState.status === "missing" ? (
          <Link href="/dashboard">
            <Button className="w-full">Back to Dashboard</Button>
          </Link>
        ) : inviteState.status === "expired" ? (
          <Button disabled className="w-full">Invite Expired</Button>
        ) : inviteState.status === "full" ? (
          <Button disabled className="w-full">Group Is Full</Button>
        ) : inviteState.status === "already-member" && inviteState.group ? (
          <Link href={`/group/${inviteState.group.id}/feed`}>
            <Button className="w-full">Open Group</Button>
          </Link>
        ) : (
          <form action={acceptInvite}>
            <Button type="submit" className="w-full font-medium h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              Accept Invitation
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
