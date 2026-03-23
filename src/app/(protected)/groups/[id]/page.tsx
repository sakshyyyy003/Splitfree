import { Suspense } from "react";

import { requireAuthenticatedUser } from "@/lib/auth/user";

import { GroupDetailContent } from "./group-detail-content";
import GroupDetailLoading from "./loading";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const [{ id }, user] = await Promise.all([
    params,
    requireAuthenticatedUser(),
  ]);

  return (
    <div className="mx-auto max-w-[800px]">
      <Suspense fallback={<GroupDetailLoading />}>
        <GroupDetailContent groupId={id} userId={user.id} />
      </Suspense>
    </div>
  );
}
