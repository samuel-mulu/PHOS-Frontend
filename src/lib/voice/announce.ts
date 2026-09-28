/** Browser speech for queue / registration (optional; fails silently if unsupported). */
export function announceClinic(message: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(message);
  utter.rate = 0.95;
  utter.lang = "en-US";
  synth.speak(utter);
}

export function stationCallLabel(station: string): string {
  switch (station) {
    case "TRIAGE":
      return "triage";
    case "DOCTOR":
      return "the doctor";
    case "LAB":
      return "the laboratory";
    case "PHARMACY":
      return "the pharmacy";
    case "CASHIER":
      return "cashier";
    default:
      return "the clinic";
  }
}
