import { Suspense } from "react";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { LoadingBlock } from "@/components/shared/state-blocks";

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading reports" />}>
      <ReportsWorkspace />
    </Suspense>
  );
}
