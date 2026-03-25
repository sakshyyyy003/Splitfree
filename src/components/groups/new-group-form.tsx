"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createGroupSchema,
  GROUP_CATEGORIES,
  type CreateGroupInput,
  type GroupCategory,
} from "@/lib/validators/group";
import { createGroup } from "@/actions/group";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const categoryConfig: Record<
  GroupCategory,
  { label: string; emoji: string }
> = {
  trip: { label: "TRIP", emoji: "✈️" },
  home: { label: "HOME", emoji: "🏠" },
  couple: { label: "COUPLE", emoji: "❤️" },
  work: { label: "WORK", emoji: "💼" },
  friends: { label: "FRIENDS", emoji: "🎉" },
  other: { label: "OTHER", emoji: "🌀" },
};

export function NewGroupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      category: "other",
    },
  });

  const selectedCategory = watch("category");
  const watchedName = watch("name");
  const hasName = watchedName.trim().length > 0;

  function onSubmit(data: CreateGroupInput) {
    startTransition(async () => {
      const result = await createGroup(data);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Group created successfully!");
      router.push(`/groups/${result.data.groupId}`);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        {/* Group Name */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra">
            Group Name
          </label>
          <input
            type="text"
            placeholder="e.g. Goa Trip 2026"
            autoComplete="off"
            aria-invalid={!!errors.name}
            className={cn(
              "w-full border-2 border-gray-300 bg-transparent px-4 py-4 text-lg font-bold rounded-lg transition-colors focus:border-hotgreen focus:outline-none",
              errors.name && "border-destructive",
            )}
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        {/* Category Grid */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-bold uppercase tracking-ultra">
            Category
          </label>
          <div className="grid grid-cols-3 gap-3">
            {GROUP_CATEGORIES.map((cat) => {
              const config = categoryConfig[cat];
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setValue("category", cat, { shouldValidate: true })
                  }
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg p-4 text-center text-sm font-bold transition-colors",
                    isSelected
                      ? "border-2 border-hotgreen bg-hotgreen/10"
                      : "border-2 border-gray-200 hover:border-hotgreen",
                  )}
                >
                  <div className="mb-1 text-2xl">{config.emoji}</div>
                  {config.label}
                </button>
              );
            })}
          </div>
          <FieldError>{errors.category?.message}</FieldError>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className={cn(
            "w-full border-0 py-5 text-lg transition-opacity",
            hasName
              ? "bg-hotgreen text-black hover:bg-lime"
              : "cursor-not-allowed bg-hotgreen/30 text-black/40 hover:bg-hotgreen/30",
          )}
        >
          {isPending && <Loader2 className="animate-spin" />}
          CREATE GROUP
        </Button>
      </form>
    </div>
  );
}
