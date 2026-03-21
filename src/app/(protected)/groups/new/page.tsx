import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewGroupForm } from "@/components/groups/new-group-form";

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-textsec transition-colors hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Create a new group
        </h1>
      </section>

      <NewGroupForm />
    </div>
  );
}
