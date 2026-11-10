import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/JobCard";
import { listOpenJobs } from "@/lib/jobs.functions";
import { JOB_TYPE_LABEL, type JobType } from "@/lib/format";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/ipoh-hero.jpg";

const openJobsQuery = () => queryOptions({ queryKey: ["open-jobs"], queryFn: () => listOpenJobs() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KerjaIpoh — Jobs at shops and companies around Ipoh" },
      { name: "description", content: "Browse open jobs from local shops and companies in Ipoh. Apply with your resume in minutes." },
      { property: "og:title", content: "KerjaIpoh — Jobs around Ipoh" },
      { property: "og:description", content: "Browse open jobs from local shops and companies in Ipoh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(openJobsQuery()),
  component: Index,
});

const FILTERS: (JobType | "all")[] = ["all", "full_time", "part_time", "contract", "internship"];

function Index() {
  const { data: jobs } = useSuspenseQuery(openJobsQuery());
  const [q, setQ] = useState("");
  const [type, setType] = useState<JobType | "all">("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (type === "all" || j.job_type === type) &&
        (!term || [j.title, j.company_name, j.area, j.description].some((s) => s.toLowerCase().includes(term))),
    );
  }, [jobs, q, type]);

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Shophouses in Ipoh old town with limestone hills behind"
          width={1600}
          height={800}
          className="h-56 w-full object-cover object-bottom sm:h-72"
        />
        <div className="hero-fade absolute inset-0" />
      </section>

      <section className="mx-auto -mt-16 max-w-5xl px-4 sm:-mt-20">
        <div className="card-surface relative p-5 sm:p-8">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Find work close to home in <span className="text-accent">Ipoh</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Jobs from local shops and companies. No account needed to look around.
          </p>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search job, company or area (e.g. barista, Ipoh Garden)"
              className="h-12 rounded-xl pl-10 text-base"
              aria-label="Search jobs"
            />
          </div>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setType(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  type === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All jobs" : JOB_TYPE_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Open jobs</h2>
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "job" : "jobs"}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No jobs match your search yet. Try another word.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
