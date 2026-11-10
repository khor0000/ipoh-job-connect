import type { Database } from "@/integrations/supabase/types";

export type JobType = Database["public"]["Enums"]["job_type"];
export type SalaryPeriod = Database["public"]["Enums"]["salary_period"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type EmployerStatus = Database["public"]["Enums"]["employer_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const PERIOD_LABEL: Record<SalaryPeriod, string> = {
  month: "month",
  day: "day",
  hour: "hour",
};

export function formatSalary(min: number | null, max: number | null, period: SalaryPeriod) {
  const p = `/ ${PERIOD_LABEL[period]}`;
  const fmt = (n: number) => `RM ${n.toLocaleString("en-MY")}`;
  if (min != null && max != null) return min === max ? `${fmt(min)} ${p}` : `${fmt(min)} – ${max.toLocaleString("en-MY")} ${p}`;
  if (min != null) return `From ${fmt(min)} ${p}`;
  if (max != null) return `Up to ${fmt(max)} ${p}`;
  return "Salary not stated";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

type BadgeVariant = "muted" | "info" | "success" | "warning" | "danger" | "accent";

export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
  submitted: { label: "Applied", variant: "info" },
  shortlisted: { label: "Shortlisted", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
  hired: { label: "Hired", variant: "success" },
  withdrawn: { label: "Withdrawn", variant: "muted" },
};

export const EMPLOYER_STATUS: Record<EmployerStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Waiting for approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Not approved", variant: "danger" },
};

export const JOB_STATUS: Record<JobStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: "Open", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
  removed: { label: "Removed by admin", variant: "danger" },
};

/** Only allow same-origin relative paths as post-login redirects. */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
