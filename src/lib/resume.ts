import { supabase } from "@/integrations/supabase/client";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function validateResume(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Please choose a PDF file.";
  if (file.size > MAX_RESUME_BYTES) return "The PDF must be 5 MB or smaller.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

/** Uploads a new resume PDF and makes it the seeker's current resume. */
export async function uploadResume(userId: string, file: File) {
  const problem = validateResume(file);
  if (problem) throw new Error(problem);
  const path = `${userId}/${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) throw new Error("Upload failed. Please try again.");
  const name = file.name.slice(0, 120);
  const { error } = await supabase.from("profiles").update({ resume_path: path, resume_name: name }).eq("id", userId);
  if (error) throw new Error("Could not save your resume.");
  return { path, name };
}

/** Opens a short-lived download link for a resume the user is allowed to read. */
export async function downloadResume(path: string, filename?: string | null) {
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(path, 60, { download: filename || "resume.pdf" });
  if (error || !data?.signedUrl) throw new Error("Could not open this resume.");
  window.location.href = data.signedUrl;
}
