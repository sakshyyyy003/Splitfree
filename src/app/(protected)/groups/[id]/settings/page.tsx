import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getGroupDetail } from "@/lib/queries/group";
import { getGroupMembers } from "@/lib/queries/group-members";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { DeleteGroupDialog } from "@/components/groups/delete-group-dialog";
import type { GroupCategory } from "@/lib/validators/group";

type GroupSettingsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupSettingsPage({
  params,
}: GroupSettingsPageProps) {
  const [{ id }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  const [group, members] = await Promise.all([
    getGroupDetail(id),
    getGroupMembers(id),
  ]);

  if (!group) {
    notFound();
  }

  const currentMember = members.find((m) => m.userId === user.id);

  if (!currentMember || currentMember.role !== "admin") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <Link
          href={`/groups/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-textsec transition-colors hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Group Settings
        </h1>
      </section>

      <GroupSettingsForm
        id={group.id}
        name={group.name}
        category={group.category as GroupCategory}
        coverImageUrl={group.coverImageUrl}
      />

      <DeleteGroupDialog groupId={group.id} groupName={group.name} />
    </div>
  );
}
