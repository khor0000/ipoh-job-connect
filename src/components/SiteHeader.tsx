import { Link } from "@tanstack/react-router";
import { Briefcase, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { homeFor, useAccount } from "@/lib/account";

export function SiteHeader() {
  const { session, ready, signOut } = useSession();
  const { data: account } = useAccount(!!session);
  const home = homeFor(account ?? null);
  const homeLabel =
    home === "/admin" ? "Admin" : home === "/employer" ? "My company" : home === "/seeker" ? "My applications" : "Set up account";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="size-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Kerja<span className="text-accent">Ipoh</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Jobs
          </Link>
          {!ready ? (
            <div className="h-10 w-24" aria-hidden />
          ) : session ? (
            <>
              <Button asChild variant="soft" size="sm">
                <Link to={home}>
                  <UserRound /> <span className="max-w-[9rem] truncate">{homeLabel}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="accent" size="sm">
                <Link to="/auth" search={{ mode: "signup", type: "employer" }}>
                  Post a job
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
