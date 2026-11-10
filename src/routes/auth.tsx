import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, MailCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { safeRedirect } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type AccountType = "seeker" | "employer";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode; type?: AccountType; redirect?: string } => ({
    mode: s.mode === "signup" ? "signup" : s.mode === "signin" ? "signin" : undefined,
    type: s.type === "employer" ? "employer" : s.type === "seeker" ? "seeker" : undefined,
    redirect: safeRedirect(s.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — KerjaIpoh" },
      { name: "description", content: "Sign in to KerjaIpoh to apply for jobs in Ipoh or post jobs for your business." },
      { property: "og:title", content: "Sign in — KerjaIpoh" },
      { property: "og:description", content: "Apply for jobs or hire staff around Ipoh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z.string().trim().min(7, "Please enter a phone number").max(30).regex(/^[0-9+\-\s()]+$/, "Phone can only have numbers, spaces, + or -"),
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(8, "Password needs at least 8 characters").max(72),
  companyName: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [type, setType] = useState<AccountType>(search.type ?? "seeker");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", companyName: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Already signed in (or just came back from Google): continue.
  useEffect(() => {
    if (!ready || !session) return;
    const stored = safeRedirect(sessionStorage.getItem("post_auth_redirect"));
    sessionStorage.removeItem("post_auth_redirect");
    const to = search.redirect ?? stored;
    if (to) navigate({ href: to, replace: true });
    else navigate({ to: "/dashboard", replace: true });
  }, [ready, session, search.redirect, navigate]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (error) toast.error(error.message.includes("confirm") ? "Please confirm your email first." : "Wrong email or password.");
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);
    if (type === "employer" && !parsed.data.companyName) return toast.error("Please enter your shop or company name");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          account_type: type,
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          ...(type === "employer" ? { company_name: parsed.data.companyName } : {}),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          We sent a link to <strong className="text-foreground">{sentTo}</strong>. Tap it to confirm your account, then sign in.
        </p>
        {type === "employer" && (
          <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground">
            We check every business before it can post jobs. You'll be able to post once approved.
          </p>
        )}
        <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <div className="card-surface p-5 sm:p-7">
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("rounded-lg py-2 transition-colors", mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {([
              { v: "seeker", label: "I'm looking for work", Icon: Briefcase },
              { v: "employer", label: "I'm hiring", Icon: Store },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-colors",
                  type === v ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={mode === "signin" ? onSignIn : onSignUp} className="mt-5 space-y-4">
          {mode === "signup" && (
            <>
              {type === "employer" && (
                <Field label="Shop or company name" id="companyName">
                  <Input id="companyName" value={form.companyName} onChange={set("companyName")} maxLength={120} placeholder="e.g. Kedai Kopi Sin Yoon Loong" />
                </Field>
              )}
              <Field label={type === "employer" ? "Your name (contact person)" : "Full name"} id="fullName">
                <Input id="fullName" value={form.fullName} onChange={set("fullName")} maxLength={120} autoComplete="name" />
              </Field>
              <Field label="Phone number" id="phone">
                <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} maxLength={30} placeholder="012-345 6789" autoComplete="tel" />
              </Field>
            </>
          )}
          <Field label="Email" id="email">
            <Input id="email" type="email" value={form.email} onChange={set("email")} required maxLength={255} autoComplete="email" />
          </Field>
          <Field label="Password" id="password">
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : type === "employer" ? "Register my business" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton redirect={search.redirect} />

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Just looking? <Link to="/" className="font-semibold text-primary hover:underline">Browse jobs</Link> without an account.
        </p>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
