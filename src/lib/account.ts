import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Employer = Database["public"]["Tables"]["employers"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface Account {
  userId: string;
  email: string;
  roles: AppRole[];
  profile: Profile | null;
  employer: Employer | null;
}

/** The signed-in user's roles, profile and employer record. Browser-only (reads the local session). */
export const accountQuery = () =>
  queryOptions({
    queryKey: ["account"],
    queryFn: async (): Promise<Account | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      const [roles, profile, employer] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("employers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      return {
        userId: user.id,
        email: user.email ?? "",
        roles: (roles.data ?? []).map((r) => r.role),
        profile: profile.data ?? null,
        employer: employer.data ?? null,
      };
    },
  });

export function useAccount(enabled = true) {
  return useQuery({ ...accountQuery(), enabled });
}

export function homeFor(account: Account | null): "/admin" | "/employer" | "/seeker" | "/onboarding" {
  if (!account) return "/onboarding";
  if (account.roles.includes("admin")) return "/admin";
  if (account.roles.includes("employer")) return "/employer";
  if (account.roles.includes("seeker")) return "/seeker";
  return "/onboarding";
}
