import { QueueBoard } from "@/components/queues/queue-board";
import { QueueStation } from "@/types/encounter";

export default function DoctorPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Doctor</h1>
        <p className="text-sm text-slate-600">Consultation queue.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.DOCTOR}
          hrefPrefix="/doctor"
          title="Doctor queue"
        />
      </div>
    </div>
  );
}
