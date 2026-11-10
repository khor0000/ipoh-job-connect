import { createFileRoute, redirect } from "@tanstack/react-router";
import { accountQuery, homeFor } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KerjaIpoh" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ context }) => {
    const account = await context.queryClient.fetchQuery(accountQuery());
    throw redirect({ to: homeFor(account), replace: true });
  },
  component: () => null,
});
