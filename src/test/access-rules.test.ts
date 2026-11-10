// Checks the live access rules with the seeded test accounts (password Test1234!).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const J1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const J2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const PENDING = "55555555-5555-4555-8555-555555555555";

function makeClient(): SupabaseClient<Database> {
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (KEY.startsWith("sb_") && h.get("Authorization") === `Bearer ${KEY}`) h.delete("Authorization");
        h.set("apikey", KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function signIn(name: string) {
  const c = makeClient();
  const { error } = await c.auth.signInWithPassword({ email: `${name}@test.local`, password: "Test1234!" });
  if (error) throw error;
  return c;
}

describe("Access rules", { timeout: 30_000 }, () => {
  it("anyone can browse open jobs without signing in", async () => {
    const { data, error } = await makeClient().rpc("list_open_jobs");
    expect(error).toBeNull();
    const ids = (data ?? []).map((j) => j.id);
    expect(ids).toContain(J1);
    expect(ids).toContain(J2);
  });

  it("an employer sees only applicants to their own jobs", async () => {
    const c = await signIn("employer_1");
    const { data } = await c.from("applications").select("job_id, seeker_id");
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((a) => a.job_id === J1)).toBe(true);
    expect(data?.some((a) => a.seeker_id === USER_B)).toBe(false);
  });

  it("an employer can download their applicant's resume but not others'", async () => {
    const c = await signIn("employer_1");
    const own = await c.storage.from("resumes").createSignedUrl(`${USER_A}/resume.pdf`, 60);
    expect(own.error).toBeNull();
    const other = await c.storage.from("resumes").createSignedUrl(`${USER_B}/resume.pdf`, 60);
    expect(other.data?.signedUrl).toBeFalsy();
  });

  it("an employer that is not approved cannot post a job", async () => {
    const c = await signIn("employer_pending");
    const { error } = await c.from("jobs").insert({
      employer_id: PENDING,
      title: "Should not work",
      description: "This post must be blocked until approval.",
    });
    expect(error).not.toBeNull();
  });

  it("a job seeker sees only their own applications", async () => {
    const c = await signIn("user_a");
    const { data } = await c.rpc("my_applications");
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((a) => a.job_id === J1)).toBe(true);
    const direct = await c.from("applications").select("seeker_id");
    expect(direct.data?.every((a) => a.seeker_id === USER_A)).toBe(true);
  });

  it("a job seeker cannot mark their own application as hired", async () => {
    const c = await signIn("user_a");
    const { data: apps } = await c.from("applications").select("id").limit(1);
    const { error } = await c.rpc("set_application_status", { _application_id: apps![0]!.id, _status: "hired" });
    expect(error).not.toBeNull();
  });

  it("only the admin can approve employers", async () => {
    const c = await signIn("employer_1");
    const { error } = await c.rpc("set_employer_status", { _employer_id: PENDING, _status: "approved" });
    expect(error).not.toBeNull();
    const admin = await signIn("admin");
    const { data } = await admin.from("employers").select("user_id, status");
    expect(data?.find((e) => e.user_id === PENDING)?.status).toBe("pending");
  });
});
