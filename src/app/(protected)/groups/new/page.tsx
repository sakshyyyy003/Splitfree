import { NewGroupForm } from "@/components/groups/new-group-form";

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Groups
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Create a new group
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Set up a shared space for tracking expenses with your friends, family,
          or roommates.
        </p>
      </section>

      <NewGroupForm />
    </div>
  );
}
