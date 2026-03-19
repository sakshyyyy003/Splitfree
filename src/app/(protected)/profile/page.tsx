import { getProfile } from "@/lib/queries/profile";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser();

  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your personal information.
      </p>
      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
