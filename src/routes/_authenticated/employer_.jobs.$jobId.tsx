import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, Phone, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotAllowed } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { downloadResume } from "@/lib/resume";
import { APPLICATION_STATUS, JOB_STATUS, formatDate, type ApplicationStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

const jobApplicantsQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["job-applicants", jobId],
    queryFn: async () => {
      const [job, apps] = await Promise.all([
        supabase.from("jobs").select("id, title, status").eq("id", jobId).maybeSingle(),
        supabase
          .from("applications")
          .select("id, message, status, created_at, resume_path, resume_name, profiles(full_name, phone)")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false }),
      ]);
      return { job: job.data, applications: apps.data ?? [] };
    },
  });

export const Route = createFileRoute("/_authenticated/employer_/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Applicants — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(jobApplicantsQuery(params.jobId)),
  component: ApplicantsPage,
});

const ACTIONS: { status: Extract<ApplicationStatus, "shortlisted" | "rejected" | "hired">; label: string; Icon: typeof Star }[] = [
  { status: "shortlisted", label: "Shortlist", Icon: Star },
  { status: "rejected", label: "Reject", Icon: X },
  { status: "hired", label: "Hire", Icon: Check },
];

function ApplicantsPage() {
  const { jobId } = Route.useParams();
  const { data } = useSuspenseQuery(jobApplicantsQuery(jobId));
  const queryClient = useQueryClient();

  if (!data.job) return <NotAllowed message="This job doesn't exist or isn't yours." />;
  const jobStatus = JOB_STATUS[data.job.status];

  async function setStatus(id: string, status: ApplicationStatus) {
    const { error } = await supabase.rpc("set_application_status", { _application_id: id, _status: status });
    if (error) return toast.error("Could not update. Please try again.");
    toast.success(`Marked as ${APPLICATION_STATUS[status].label.toLowerCase()}`);
    queryClient.invalidateQueries({ queryKey: ["job-applicants", jobId] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link to="/employer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> My job posts
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{data.job.title}</h1>
        <Badge variant={jobStatus.variant}>{jobStatus.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.applications.length} {data.applications.length === 1 ? "applicant" : "applicants"}
      </p>

      {data.applications.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No one has applied yet. We'll show applicants here.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.applications.map((a) => {
            const s = APPLICATION_STATUS[a.status];
            const p = a.profiles as { full_name: string; phone: string | null } | null;
            return (
              <li key={a.id} className="card-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold">{p?.full_name || "Applicant"}</p>
                    <p className="text-xs text-muted-foreground">Applied {formatDate(a.created_at)}</p>
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                {p?.phone && (
                  <a href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <Phone className="size-4" /> {p.phone}
                  </a>
                )}
                <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm">{a.message}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => downloadResume(a.resume_path, a.resume_name).catch((e) => toast.error(e.message))}
                  >
                    <Download /> Download resume
                  </Button>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                    {ACTIONS.map(({ status, label, Icon }) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatus(a.id, status)}
                        aria-pressed={a.status === status}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                          a.status === status
                            ? status === "hired"
                              ? "bg-success text-success-foreground"
                              : status === "rejected"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-warning text-warning-foreground"
                            : "text-muted-foreground hover:bg-card hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
