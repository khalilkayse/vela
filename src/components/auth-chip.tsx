import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AuthChip({ className }: { className?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className={cn("h-10 w-24 animate-pulse rounded-md bg-border/70", className)} />;
  }
  if (!user) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Link
          to="/login"
          className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-fg hover:bg-bg"
        >
          Sign in
        </Link>
        <Link
          to="/login"
          search={{ next: "/onboarding" }}
          className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-primary-hover"
        >
          Start selling
        </Link>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        to="/dashboard"
        className="hidden h-11 items-center rounded-md px-3 text-sm font-medium text-fg hover:bg-bg sm:inline-flex"
      >
        Dashboard
      </Link>
      <div className="[&_span.text-sm]:hidden sm:[&_span.text-sm]:inline">
        <UserButton />
      </div>
    </div>
  );
}
