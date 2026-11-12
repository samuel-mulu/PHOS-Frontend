import { QueueBoard } from "@/components/queues/queue-board";
import { QueueStation } from "@/types/encounter";

export default function NursePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Triage</h1>
        <p className="text-sm text-muted">
          Intake triage and doctor referrals (teal “From doctor”). Open a
          patient for vitals, Maternal, or FP.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.TRIAGE}
          hrefPrefix="/nurse"
          title="Triage queue"
        />
      </div>
    </div>
  );
}
