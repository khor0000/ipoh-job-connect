import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { JOB_TYPE_LABEL, PERIOD_LABEL, type JobType, type SalaryPeriod } from "@/lib/format";

export interface JobDraft {
  id?: string;
  title: string;
  description: string;
  job_type: JobType;
  area: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod;
}

const optionalAmount = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1_000_000), "Salary must be a whole number");

const schema = z
  .object({
    title: z.string().trim().min(3, "Job title is too short").max(120),
    description: z.string().trim().min(10, "Please describe the job (10+ characters)").max(5000),
    job_type: z.enum(["full_time", "part_time", "contract", "internship"]),
    area: z.string().trim().min(1, "Please enter the area").max(80),
    salary_min: optionalAmount,
    salary_max: optionalAmount,
    salary_period: z.enum(["month", "day", "hour"]),
  })
  .refine((d) => d.salary_min === null || d.salary_max === null || d.salary_max >= d.salary_min, {
    message: "Max salary must be higher than min salary",
  });

export function JobFormDialog({
  employerId,
  initial,
  trigger,
  onSaved,
}: {
  employerId: string;
  initial?: JobDraft;
  trigger: ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    job_type: (initial?.job_type ?? "full_time") as JobType,
    area: initial?.area ?? "Ipoh",
    salary_min: initial?.salary_min?.toString() ?? "",
    salary_max: initial?.salary_max?.toString() ?? "",
    salary_period: (initial?.salary_period ?? "month") as SalaryPeriod,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);
    setBusy(true);
    const { error } = initial?.id
      ? await supabase.from("jobs").update(parsed.data).eq("id", initial.id)
      : await supabase.from("jobs").insert({ ...parsed.data, employer_id: employerId });
    setBusy(false);
    if (error) return toast.error("Could not save the job. Please try again.");
    toast.success(initial?.id ? "Job updated" : "Job posted — it's now live");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit job" : "Post a new job"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jt">Job title</Label>
            <Input id="jt" value={f.title} onChange={set("title")} maxLength={120} placeholder="e.g. Cashier, Kitchen helper" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={f.job_type} onValueChange={(v) => setF((p) => ({ ...p, job_type: v as JobType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ja">Area</Label>
              <Input id="ja" value={f.area} onChange={set("area")} maxLength={80} placeholder="e.g. Ipoh Garden" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Salary (RM, optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input inputMode="numeric" value={f.salary_min} onChange={set("salary_min")} placeholder="Min" aria-label="Minimum salary" />
              <Input inputMode="numeric" value={f.salary_max} onChange={set("salary_max")} placeholder="Max" aria-label="Maximum salary" />
              <Select value={f.salary_period} onValueChange={(v) => setF((p) => ({ ...p, salary_period: v as SalaryPeriod }))}>
                <SelectTrigger aria-label="Salary period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>per {l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jd">Job description</Label>
            <Textarea id="jd" rows={6} value={f.description} onChange={set("description")} maxLength={5000} placeholder="What will they do? Working hours? Any requirements?" />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Saving…" : initial?.id ? "Save changes" : "Post job"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
