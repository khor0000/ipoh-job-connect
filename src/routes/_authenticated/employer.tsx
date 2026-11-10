import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Plus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NotAllowed, PageHeader } from "@/components/PageHeader";
import { JobFormDialog } from "@/components/JobFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery, type Employer } from "@/lib/account";
import { EMPLOYER_STATUS, JOB_STATUS, JOB_TYPE_LABEL, formatDate, formatSalary } from "@/lib/format";

const myJobsQuery = () =>
  queryOptions({
    queryKey: ["employer-jobs"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("jobs")
        .select("*, applications(count)")
        .eq("employer_id", u.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const Route = createFileRoute("/_authenticated/employer")({
  head: () => ({ meta: [{ title: "My company — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery()),
      context.queryClient.ensureQueryData(myJobsQuery()),
    ]),
  component: EmployerPage,
});

function EmployerPage() {
  const { data: account, refetch } = useSuspenseQuery(accountQuery());
  const { data: jobs } = useSuspenseQuery(myJobsQuery());
  const queryClient = useQueryClient();
  const employer = account?.employer;

  if (!account || !employer) return <NotAllowed message="This page is for employer accounts." />;
  const approved = employer.status === "approved";
  const status = EMPLOYER_STATUS[employer.status];
  const refreshJobs = () => {
    queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["open-jobs"] });
  };

  async function toggle(id: string, next: "open" | "closed") {
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", id);
    if (error) return toast.error("Could not update the job");
    toast.success(next === "closed" ? "Job closed — it's hidden from the job list" : "Job reopened");
    refreshJobs();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Employer" title={employer.company_name}>
        {approved && (
          <JobFormDialog
            employerId={account.userId}
            onSaved={refreshJobs}
            trigger={
              <Button variant="accent" size="lg">
                <Plus /> Post a job
              </Button>
            }
          />
        )}
      </PageHeader>

      {employer.status === "pending" && (
        <div className="flex gap-3 rounded-xl border border-warning/50 bg-warning-soft p-4 text-warning-foreground">
          <Clock className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">We're checking your business</p>
            <p className="text-sm">You can post jobs as soon as we approve your account. This usually takes 1–2 working days.</p>
          </div>
        </div>
      )}
      {employer.status === "rejected" && (
        <div className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive-soft p-4 text-destructive">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Your business was not approved</p>
            <p className="text-sm">Please check your company details below and contact us if you think this is a mistake.</p>
          </div>
        </div>
      )}

      <section className="card-surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">My job posts</h2>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {approved ? "No jobs yet. Tap “Post a job” to add your first one." : "Your job posts will appear here."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {jobs.map((j) => {
              const count = (j.applications as unknown as { count: number }[])[0]?.count ?? 0;
              const s = JOB_STATUS[j.status];
              return (
                <li key={j.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {JOB_TYPE_LABEL[j.job_type]} · {j.area} · {formatSalary(j.salary_min, j.salary_max, j.salary_period)}
                      </p>
                      <p className="text-xs text-muted-foreground">Posted {formatDate(j.created_at)}</p>
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  {j.status === "removed" && j.removed_reason && (
                    <p className="mt-2 text-sm text-destructive">Reason: {j.removed_reason}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="soft" size="sm">
                      <Link to="/employer/jobs/$jobId" params={{ jobId: j.id }}>
                        <Users /> {count} {count === 1 ? "applicant" : "applicants"}
                      </Link>
                    </Button>
                    {approved && j.status !== "removed" && (
                      <>
                        <JobFormDialog
                          employerId={account.userId}
                          initial={j}
                          onSaved={refreshJobs}
                          trigger={<Button variant="outline" size="sm">Edit</Button>}
                        />
                        <Button variant="ghost" size="sm" onClick={() => toggle(j.id, j.status === "open" ? "closed" : "open")}>
                          {j.status === "open" ? "Close job" : "Reopen"}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CompanyForm employer={employer} onSaved={() => refetch()} />
    </div>
  );
}

function CompanyForm({ employer, onSaved }: { employer: Employer; onSaved: () => void }) {
  const [f, setF] = useState({
    company_name: employer.company_name,
    phone: employer.phone ?? "",
    address: employer.address ?? "",
    about: employer.about ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.company_name.trim()) return toast.error("Company name is required");
    setBusy(true);
    const { error } = await supabase
      .from("employers")
      .update({
        company_name: f.company_name.trim().slice(0, 120),
        phone: f.phone.trim().slice(0, 30) || null,
        address: f.address.trim().slice(0, 300) || null,
        about: f.about.trim().slice(0, 1000) || null,
      })
      .eq("user_id", employer.user_id);
    setBusy(false);
    if (error) return toast.error("Could not save");
    toast.success("Company details saved");
    onSaved();
  }

  return (
    <form onSubmit={save} className="card-surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Company details</h2>
        <p className="text-sm text-muted-foreground">Your name, about and address show on your job posts.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cn">Company name</Label>
          <Input id="cn" value={f.company_name} onChange={set("company_name")} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp">Phone (only visible to us)</Label>
          <Input id="cp" type="tel" value={f.phone} onChange={set("phone")} maxLength={30} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ca">Address</Label>
        <Input id="ca" value={f.address} onChange={set("address")} maxLength={300} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cb">About the business</Label>
        <Textarea id="cb" rows={3} value={f.about} onChange={set("about")} maxLength={1000} />
      </div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save details"}</Button>
    </form>
  );
}
