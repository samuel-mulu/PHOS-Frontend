import { Suspense } from "react";
import { FrontDeskWorkspace } from "@/components/front-desk/front-desk-workspace";
import { LoadingBlock } from "@/components/shared/state-blocks";

export default function FrontDeskPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading front desk" />}>
      <FrontDeskWorkspace />
    </Suspense>
  );
}
