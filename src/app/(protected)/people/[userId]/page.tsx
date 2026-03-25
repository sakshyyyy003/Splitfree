import { notFound } from "next/navigation";

import { getCounterpartyBalance } from "@/lib/queries/balances";
import { PersonDetailView } from "@/components/people/person-detail-view";

type PersonDetailPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { userId } = await params;
  const person = await getCounterpartyBalance(userId);

  if (!person) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <PersonDetailView person={person} currency="INR" />
    </div>
  );
}
