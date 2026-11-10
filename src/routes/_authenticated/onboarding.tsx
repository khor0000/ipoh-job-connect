import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery, homeFor } from "@/lib/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your account — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.fetchQuery(accountQuery());
    if (account && account.roles.length > 0) throw redirect({ to: homeFor(account), replace: true });
    return { name: account?.profile?.full_name ?? "" };
  },
  component: Onboarding,
});

function Onboarding() {
  const { name } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<"seeker" | "employer">("seeker");
  const [fullName, setFullName] = useState(name);
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error("Please enter your name");
    if (!/^[0-9+\-\s()]{7,30}$/.test(phone.trim())) return toast.error("Please enter a valid phone number");
    if (type === "employer" && company.trim().length < 1) return toast.error("Please enter your shop or company name");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() }).eq("id", u.user!.id);
    const { error } = await supabase.rpc("choose_account_type", {
      _type: type,
      _company_name: type === "employer" ? company.trim() : undefined,
      _phone: phone.trim(),
    });
    setBusy(false);
    if (error) return toast.error("Could not save. Please try again.");
    await queryClient.invalidateQueries({ queryKey: ["account"] });
    navigate({ to: type === "employer" ? "/employer" : "/seeker", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card-surface p-5 sm:p-7">
        <h1 className="text-2xl font-bold">Welcome to KerjaIpoh</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell us how you'll use the site. You can only choose once.</p>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: "seeker", label: "I'm looking for work", Icon: Briefcase },
              { v: "employer", label: "I'm hiring", Icon: Store },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold",
                  type === v ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground",
                )}
              >
                <Icon className="size-5" /> {label}
              </button>
            ))}
          </div>
          {type === "employer" && (
            <div className="space-y-1.5">
              <Label htmlFor="company">Shop or company name</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">{type === "employer" ? "Your name (contact person)" : "Full name"}</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
