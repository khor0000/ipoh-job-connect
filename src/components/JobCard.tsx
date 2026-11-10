import { Link } from "@tanstack/react-router";
import { MapPin, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JOB_TYPE_LABEL, formatSalary, timeAgo, type JobType, type SalaryPeriod } from "@/lib/format";

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  job_type: JobType;
  area: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod;
  created_at: string;
  company_name: string;
}

export function JobCard({ job }: { job: PublicJob }) {
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="card-surface group block p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{job.company_name}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug group-hover:text-primary">{job.title}</h3>
        </div>
        <Badge variant={job.job_type === "part_time" ? "accent" : "info"} className="shrink-0">
          {JOB_TYPE_LABEL[job.job_type]}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 text-accent" /> {job.area}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="size-4 text-primary" /> {formatSalary(job.salary_min, job.salary_max, job.salary_period)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
      </div>
    </Link>
  );
}
