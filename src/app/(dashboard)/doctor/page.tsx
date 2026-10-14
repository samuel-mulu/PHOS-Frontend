import { Suspense } from "react";
import { DoctorQueueWorkspace } from "@/components/doctor/doctor-queue-workspace";
import { LoadingBlock } from "@/components/shared/state-blocks";

export default function DoctorPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading doctor queue" />}>
      <DoctorQueueWorkspace />
    </Suspense>
  );
}
