import { Suspense } from "react";
import { CashierWorkspace } from "@/components/cashier/cashier-workspace";
import { LoadingBlock } from "@/components/shared/state-blocks";

export default function CashierPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading cashier" />}>
      <CashierWorkspace />
    </Suspense>
  );
}
