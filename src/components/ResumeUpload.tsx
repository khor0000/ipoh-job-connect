import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadResume, uploadResume, validateResume } from "@/lib/resume";

export function ResumeUpload({
  userId,
  currentPath,
  currentName,
  onUploaded,
}: {
  userId: string;
  currentPath: string | null;
  currentName: string | null;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateResume(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      await uploadResume(userId, file);
      toast.success("Resume uploaded");
      onUploaded();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0">
          {currentPath ? (
            <button
              type="button"
              className="block max-w-full truncate text-left text-sm font-semibold hover:text-primary hover:underline"
              onClick={() => downloadResume(currentPath, currentName).catch((e) => toast.error(e.message))}
            >
              {currentName || "resume.pdf"}
            </button>
          ) : (
            <p className="text-sm font-semibold">No resume yet</p>
          )}
          <p className="text-xs text-muted-foreground">PDF only, up to 5 MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
        aria-label="Choose resume PDF"
      />
      <Button type="button" variant={currentPath ? "outline" : "default"} disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload /> {busy ? "Uploading…" : currentPath ? "Replace PDF" : "Upload PDF"}
      </Button>
    </div>
  );
}
