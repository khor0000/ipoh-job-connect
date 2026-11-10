import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Building2, CalendarDays, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResumeUpload } from "@/components/ResumeUpload";
import { getOpenJob } from "@/lib/jobs.functions";
import { useSession } from "@/lib/session";
import { useAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { APPLICATION_STATUS, JOB_TYPE_LABEL, formatDate, formatSalary } from "@/lib/format";

const jobQuery = (id: string) =>
  queryOptions({ queryKey: ["open-job", id], queryFn: () => getOpenJob({ data: { id } }) });

export const Route = createFileRoute("/jobs/$jobId")({
  loader: async ({ context, params }) => {
    if (!z.string().uuid().safeParse(params.jobId).success) throw notFound();
    const job = await context.queryClient.ensureQueryData(jobQuery(params.jobId));
    if (!job) throw notFound();
    return { title: job.title, company: job.company_name, area: job.area };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} at ${loaderData.company} — KerjaIpoh` : "Job not available — KerjaIpoh";
    const desc = loaderData
      ? `${loaderData.title} job at ${loaderData.company}, ${loaderData.area}. Apply on KerjaIpoh.`
      : "This job is no longer open.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">This job is no longer open</h1>
      <p className="mt-2 text-muted-foreground">It may have been filled or closed by the employer.</p>
      <Button asChild className="mt-6">
        <Link to="/">See other jobs</Link>
      </Button>
    </div>
  ),
  component: JobPage,
});

function JobPage() {
  const { jobId } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQuery(jobId));
  if (!job) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>

      <article className="card-surface mt-4 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={job.job_type === "part_time" ? "accent" : "info"}>{JOB_TYPE_LABEL[job.job_type]}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{job.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 font-medium text-muted-foreground">
          <Building2 className="size-4" /> {job.company_name}
        </p>

        <dl className="mt-5 grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <dd>{job.area}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            <dd>{formatSalary(job.salary_min, job.salary_max, job.salary_period)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <dd>Posted {formatDate(job.created_at)}</dd>
          </div>
        </dl>

        <h2 className="mt-6 text-lg font-bold">About the job</h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{job.description}</p>

        {(job.company_about || job.company_address) && (
          <>
            <h2 className="mt-6 text-lg font-bold">About {job.company_name}</h2>
            {job.company_about && <p className="mt-2 leading-relaxed text-muted-foreground">{job.company_about}</p>}
            {job.company_address && <p className="mt-1 text-sm text-muted-foreground">{job.company_address}</p>}
          </>
        )}
      </article>

      <ApplyPanel jobId={job.id} />
    </div>
  );
}

const messageSchema = z.string().trim().min(10, "Please write at least a short sentence (10+ characters).").max(1000, "Keep it under 1000 characters.");

function ApplyPanel({ jobId }: { jobId: string }) {
  const { session, ready } = useSession();
  const { data: account, refetch: refetchAccount } = useAccount(!!session);
  const queryClient = useQueryClient();
  const isSeeker = !!account?.roles.includes("seeker");

  const existing = useQuery({
    queryKey: ["my-application", jobId],
    enabled: isSeeker,
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, created_at")
        .eq("job_id", jobId)
        .neq("status", "withdrawn")
        .maybeSingle();
      return data;
    },
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!ready) return <div className="mt-6 h-32" />;

  if (!session) {
    return (
      <section className="card-surface mt-6 p-5 text-center sm:p-8">
        <h2 className="text-lg font-bold">Interested in this job?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a free account, upload your resume and apply in minutes.</p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup", type: "seeker", redirect: `/jobs/${jobId}` }}>
              Sign up to apply
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signin", redirect: `/jobs/${jobId}` }}>
              I have an account
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!account) return <div className="mt-6 h-32" />;

  if (!isSeeker && account.roles.length === 0) {
    return (
      <section className="card-surface mt-6 p-5 text-center">
        <p className="text-sm text-muted-foreground">Finish setting up your account to apply.</p>
        <Button asChild className="mt-3">
          <Link to="/onboarding">Set up my account</Link>
        </Button>
      </section>
    );
  }

  if (!isSeeker) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        Only job seeker accounts can apply for jobs.
      </section>
    );
  }

  if (existing.data) {
    const s = APPLICATION_STATUS[existing.data.status];
    return (
      <section className="card-surface mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">You applied on {formatDate(existing.data.created_at)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Status: <Badge variant={s.variant}>{s.label}</Badge>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/seeker">View my applications</Link>
        </Button>
      </section>
    );
  }

  const profile = account.profile;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    if (!profile?.resume_path) return setError("Please upload your resume first.");
    setError(null);
    setSending(true);
    const { error: err } = await supabase.from("applications").insert({
      job_id: jobId,
      seeker_id: account!.userId,
      message: parsed.data,
      resume_path: profile.resume_path,
      resume_name: profile.resume_name,
    });
    setSending(false);
    if (err) {
      toast.error(err.code === "23505" ? "You already applied for this job." : "Could not send your application. Please try again.");
      return;
    }
    toast.success("Application sent! Good luck.");
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["my-application", jobId] });
    queryClient.invalidateQueries({ queryKey: ["my-applications"] });
  }

  return (
    <section className="card-surface mt-6 p-5 sm:p-8">
      <h2 className="text-lg font-bold">Apply for this job</h2>
      <form onSubmit={apply} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label>Your resume</Label>
          <ResumeUpload
            userId={account.userId}
            currentPath={profile?.resume_path ?? null}
            currentName={profile?.resume_name ?? null}
            onUploaded={() => refetchAccount()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Short message to the employer</Label>
          <Textarea
            id="message"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'm interested because… I can start on…"
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/1000</p>
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={sending}>
          {sending ? "Sending…" : "Send application"}
        </Button>
      </form>
    </section>
  );
}
