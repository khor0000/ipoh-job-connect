import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NotAllowed, PageHeader } from "@/components/PageHeader";
import { ResumeUpload } from "@/components/ResumeUpload";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery } from "@/lib/account";
import { APPLICATION_STATUS, formatDate } from "@/lib/format";

const myApplicationsQuery = () =>
  queryOptions({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_applications");
      if (error) throw error;
      return data ?? [];
    },
  });

export const Route = createFileRoute("/_authenticated/seeker")({
  head: () => ({ meta: [{ title: "My applications — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery()),
      context.queryClient.ensureQueryData(myApplicationsQuery()),
    ]),
  component: SeekerPage,
});

function SeekerPage() {
  const { data: account, refetch } = useSuspenseQuery(accountQuery());
  const { data: apps } = useSuspenseQuery(myApplicationsQuery());
  const queryClient = useQueryClient();

  if (!account?.roles.includes("seeker")) return <NotAllowed message="This page is for job seeker accounts." />;

  async function withdraw(id: string) {
    const { error } = await supabase.rpc("withdraw_application", { _application_id: id });
    if (error) return toast.error("Could not withdraw this application.");
    toast.success("Application withdrawn");
    queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    queryClient.invalidateQueries({ queryKey: ["my-application"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Job seeker" title={`Hi, ${account.profile?.full_name?.split(" ")[0] || "there"}`}>
        <Button asChild variant="accent">
          <Link to="/">Find more jobs</Link>
        </Button>
      </PageHeader>

      <section className="card-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold">My applications</h2>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't applied for any jobs yet. <Link to="/" className="font-semibold text-primary hover:underline">Browse open jobs</Link>.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {apps.map((a) => {
              const s = APPLICATION_STATUS[a.status];
              const canWithdraw = a.status === "submitted" || a.status === "shortlisted";
              return (
                <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {a.job_status === "open" ? (
                      <Link to="/jobs/$jobId" params={{ jobId: a.job_id }} className="font-semibold hover:text-primary hover:underline">
                        {a.job_title}
                      </Link>
                    ) : (
                      <p className="font-semibold">{a.job_title}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {a.company_name} · Applied {formatDate(a.created_at)}
                      {a.job_status !== "open" && " · Job no longer open"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {canWithdraw && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">Withdraw</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {a.company_name} will no longer see your application for "{a.job_title}". You can apply again later if the job is still open.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={() => withdraw(a.id)}>Withdraw</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-surface space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold">My resume</h2>
        <ResumeUpload
          userId={account.userId}
          currentPath={account.profile?.resume_path ?? null}
          currentName={account.profile?.resume_name ?? null}
          onUploaded={() => refetch()}
        />
        <p className="text-xs text-muted-foreground">
          A new resume is used for your next applications. Employers keep the one you sent with earlier applications.
        </p>
      </section>

      <ProfileForm
        userId={account.userId}
        email={account.email}
        initialName={account.profile?.full_name ?? ""}
        initialPhone={account.profile?.phone ?? ""}
        onSaved={() => refetch()}
      />
    </div>
  );
}

function ProfileForm({
  userId,
  email,
  initialName,
  initialPhone,
  onSaved,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialPhone: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Please enter your name");
    if (phone.trim() && !/^[0-9+\-\s()]{7,30}$/.test(phone.trim())) return toast.error("Please enter a valid phone number");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim() || null }).eq("id", userId);
    setBusy(false);
    if (error) return toast.error("Could not save");
    toast.success("Details saved");
    onSaved();
  }

  return (
    <form onSubmit={save} className="card-surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">My details</h2>
        <p className="text-sm text-muted-foreground">Employers you apply to can see your name and phone number.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pname">Full name</Label>
          <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pphone">Phone</Label>
          <Input id="pphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Signed in as {email}</p>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</Button>
    </form>
  );
}
