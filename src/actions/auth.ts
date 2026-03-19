"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validators/auth";
import {
  AUTHENTICATED_REDIRECT,
  UNAUTHENTICATED_REDIRECT,
} from "@/constants/routes";

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

export async function signIn(
  formData: LoginInput,
): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      data: null,
      error: { code: "validation_error", message: "Invalid email or password" },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      data: null,
      error: {
        code: error.code ?? "unknown_error",
        message: error.message,
      },
    };
  }

  revalidatePath("/", "layout");
  redirect(AUTHENTICATED_REDIRECT);
}

export async function signUp(
  formData: SignupInput,
): Promise<ActionResult<null>> {
  const parsed = signupSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      data: null,
      error: {
        code: "validation_error",
        message: "Please check your input and try again",
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      data: null,
      error: {
        code: error.code ?? "unknown_error",
        message: error.message,
      },
    };
  }

  revalidatePath("/", "layout");
  redirect(AUTHENTICATED_REDIRECT);
}

export async function signInWithGoogle(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      data: null,
      error: {
        code: error.code ?? "unknown_error",
        message: error.message,
      },
    };
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect(UNAUTHENTICATED_REDIRECT);
}
