import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export {
  LoadingBlock,
  AppShellSkeleton,
  AuthSessionSkeleton,
  LoginFormSkeleton,
  WorkspacePageSkeleton,
} from "@/components/shared/loading-skeletons";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted-bg/50 px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-muted" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40">
      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden />
      <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
