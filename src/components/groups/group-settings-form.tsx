"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  updateGroupSchema,
  GROUP_CATEGORIES,
  type UpdateGroupInput,
  type GroupCategory,
} from "@/lib/validators/group";
import { updateGroup } from "@/actions/group";
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

type GroupSettingsFormProps = {
  id: string;
  name: string;
  category: GroupCategory;
  coverImageUrl: string | null;
};

export function GroupSettingsForm({
  id,
  name,
  category,
  coverImageUrl,
}: GroupSettingsFormProps) {
  const router = useRouter();
  const [coverPreview, setCoverPreview] = useState<string | null>(coverImageUrl);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [actionState, dispatchAction] = useActionState(updateGroup, null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateGroupInput>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      groupId: id,
      name,
      category,
    },
  });

  const selectedCategory = watch("category");
  const watchedName = watch("name");
  const hasName = watchedName.trim().length > 0;

  // Handle server action result
  useEffect(() => {
    if (!actionState) return;

    if (actionState.error) {
      toast.error(actionState.error.message);
      return;
    }

    if (actionState.data) {
      toast.success("Group updated successfully!");
      router.push(`/groups/${actionState.data.groupId}`);
    }
  }, [actionState, router]);

  function handleCoverClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    setRemoveCover(false);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);

    event.target.value = "";
  }

  function handleRemoveCover() {
    setCoverFile(null);
    setRemoveCover(true);
    if (coverPreview) {
      // Only revoke blob URLs, not remote URLs
      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
      setCoverPreview(null);
    }
  }

  function onSubmit(data: UpdateGroupInput) {
    startTransition(() => {
      const formData = new FormData();
      formData.append("groupId", data.groupId);
      formData.append("name", data.name);
      formData.append("category", data.category);

      if (removeCover) {
        formData.append("removeCover", "true");
      } else if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      dispatchAction(formData);
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

        {/* Cover Photo */}
        <div className="mb-8">
          <label className="mb-2 block text-xs font-bold uppercase tracking-ultra">
            Cover Photo
          </label>
          {coverPreview ? (
            <div className="relative overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={coverPreview}
                alt="Cover preview"
                width={600}
                height={200}
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                aria-label="Remove cover image"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCoverClick}
              className="flex items-center gap-2 rounded-sm border border-gray-200 bg-transparent px-3 py-2 text-xs text-textsec transition-colors hover:border-gray-400"
            >
              <Camera className="size-4" />
              <span className="font-medium">Add cover photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload cover image"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. JPEG, PNG or WebP (max 5 MB).
          </p>
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
          SAVE CHANGES
        </Button>
      </form>
    </div>
  );
}
