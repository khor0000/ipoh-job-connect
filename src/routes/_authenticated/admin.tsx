import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotAllowed, PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery } from "@/lib/account";
import { EMPLOYER_STATUS, JOB_STATUS, formatDate, type EmployerStatus } from "@/lib/format";

const adminQuery = () =>
  queryOptions({
    queryKey: ["admin"],
    queryFn: async () => {
      const [employers, jobs] = await Promise.all([
        supabase.from("employers").select("*, profiles(full_name, phone)").order("created_at", { ascending: false }),
        supabase.from("jobs").select("id, title, area, status, removed_reason, created_at, employers(company_name)").order("created_at", { ascending: false }),
      ]);
      return { employers: employers.data ?? [], jobs: jobs.data ?? [] };
    },
  });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery());
    if (account?.roles.includes("admin")) await context.queryClient.ensureQueryData(adminQuery());
  },
  component: AdminPage,
});

function AdminPage() {
  const { data: account } = useSuspenseQuery(accountQuery());
  if (!account?.roles.includes("admin")) return <NotAllowed message="Only the site admin can open this page." />;
  return <AdminContent />;
}

function AdminContent() {
  const { data } = useSuspenseQuery(adminQuery());
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["open-jobs"] });
  };
  const pending = data.employers.filter((e) => e.status === "pending");
  const others = data.employers.filter((e) => e.status !== "pending");

  async function setEmployer(id: string, status: EmployerStatus) {
    const { error } = await supabase.rpc("set_employer_status", { _employer_id: id, _status: status });
    if (error) return toast.error("Could not update employer");
    toast.success(status === "approved" ? "Employer approved — they can post jobs now" : status === "rejected" ? "Employer rejected" : "Updated");
    refresh();
  }

  async function restore(id: string) {
    const { error } = await supabase.rpc("admin_restore_job", { _job_id: id });
    if (error) return toast.error("Could not restore job");
    toast.success("Job restored");
    refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <PageHeader eyebrow="Admin" title="Site admin" />

      <Tabs defaultValue="employers">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="employers">
            Employers {pending.length > 0 && <Badge variant="accent" className="ml-1.5">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="jobs">Job posts</TabsTrigger>
        </TabsList>

        <TabsContent value="employers" className="space-y-6">
          <section className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold">Waiting for approval</h2>
            {pending.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">All caught up. No new employers to check.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {pending.map((e) => (
                  <EmployerRow key={e.user_id} e={e}>
                    <Button variant="success" size="sm" onClick={() => setEmployer(e.user_id, "approved")}>Approve</Button>
                    <Button variant="outline" size="sm" onClick={() => setEmployer(e.user_id, "rejected")}>Reject</Button>
                  </EmployerRow>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold">All employers</h2>
            <ul className="mt-4 space-y-3">
              {others.map((e) => (
                <EmployerRow key={e.user_id} e={e}>
                  {e.status === "approved" ? (
                    <Button variant="ghost" size="sm" onClick={() => setEmployer(e.user_id, "rejected")}>Revoke approval</Button>
                  ) : (
                    <Button variant="soft" size="sm" onClick={() => setEmployer(e.user_id, "approved")}>Approve</Button>
                  )}
                </EmployerRow>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="jobs">
          <section className="card-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold">All job posts</h2>
            <p className="text-sm text-muted-foreground">Remove fake or rude posts. Removed posts disappear from the site straight away.</p>
            <ul className="mt-4 divide-y divide-border">
              {data.jobs.map((j) => {
                const s = JOB_STATUS[j.status];
                const company = (j.employers as { company_name: string } | null)?.company_name;
                return (
                  <li key={j.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {j.status === "open" ? (
                        <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="font-semibold hover:text-primary hover:underline">
                          {j.title}
                        </Link>
                      ) : (
                        <p className="font-semibold">{j.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{company} · {j.area} · {formatDate(j.created_at)}</p>
                      {j.removed_reason && <p className="text-xs text-destructive">Reason: {j.removed_reason}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {j.status === "removed" ? (
                        <Button variant="ghost" size="sm" onClick={() => restore(j.id)}>Restore</Button>
                      ) : (
                        <RemoveJobDialog jobId={j.id} title={j.title} onDone={refresh} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployerRow({
  e,
  children,
}: {
  e: { company_name: string; status: EmployerStatus; phone: string | null; address: string | null; about: string | null; created_at: string; profiles: unknown };
  children: React.ReactNode;
}) {
  const p = e.profiles as { full_name: string; phone: string | null } | null;
  const s = EMPLOYER_STATUS[e.status];
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{e.company_name}</p>
          <p className="text-sm text-muted-foreground">
            {p?.full_name || "—"} · {e.phone || p?.phone || "no phone"}
          </p>
          {e.address && <p className="text-sm text-muted-foreground">{e.address}</p>}
          {e.about && <p className="mt-1 text-sm">{e.about}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Signed up {formatDate(e.created_at)}</p>
        </div>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

function RemoveJobDialog({ jobId, title, onDone }: { jobId: string; title: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_job", { _job_id: jobId, _reason: reason.trim().slice(0, 300) });
    setBusy(false);
    if (error) return toast.error("Could not remove job");
    toast.success("Job removed");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Remove</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove “{title}”?</DialogTitle>
          <DialogDescription>The post will be hidden from everyone. The employer will see your reason.</DialogDescription>
        </DialogHeader>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (e.g. fake job, rude language)" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={remove} disabled={busy}>{busy ? "Removing…" : "Remove post"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
