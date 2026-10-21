/**
 * Offline clinic PA via browser SpeechSynthesis (am-ET).
 * No network - uses OS-installed voices. Install an Amharic voice pack on the
 * workstation for best accent (Windows Language settings / Android TTS).
 */

import { usePreferencesStore } from "@/stores/preferences-store";

export type CallStation =
  | "TRIAGE"
  | "DOCTOR"
  | "LAB"
  | "PHARMACY"
  | "CASHIER"
  | string;

const AM_LANG = "am-ET";

let voicesLoaded = false;

/** Warm the voice list early (still works fully offline). */
export function primeSpeechSynthesis() {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const mark = () => {
    voicesLoaded = synth.getVoices().length > 0;
  };
  mark();
  if (!voicesLoaded) {
    synth.addEventListener("voiceschanged", mark, { once: true });
    // Some browsers only populate voices after a no-op speak/cancel.
    try {
      synth.getVoices();
    } catch {
      /* ignore */
    }
  }
}

function pickAmharicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;

  const byLang = (prefix: string) =>
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

  return (
    byLang("am-et") ??
    byLang("am") ??
    voices.find((v) => /amharic|አማርኛ/i.test(v.name)) ??
    null
  );
}

function patientName(firstName: string, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

/** Amharic destination for queue Call. */
export function stationCallLabelAm(station: CallStation): string {
  switch (station) {
    case "TRIAGE":
      return "ትራያጅ";
    case "DOCTOR":
      return "ሐኪሙ";
    case "LAB":
      return "ላቦራቶሪ";
    case "PHARMACY":
      return "ፋርማሲ";
    case "CASHIER":
      return "ካሽየር";
    default:
      return "ክሊኒኩ";
  }
}

/** @deprecated Prefer stationCallLabelAm - kept for any external imports. */
export function stationCallLabel(station: string): string {
  return stationCallLabelAm(station);
}

export function buildCallMessage(
  firstName: string,
  lastName: string | null | undefined,
  station: CallStation,
): string {
  const name = patientName(firstName, lastName);
  const dest = stationCallLabelAm(station);
  return `${name} እባክዎ ወደ ${dest} ይምጡ።`;
}

export function buildRegisteredMessage(
  firstName: string,
  lastName: string | null | undefined,
  patientNumber: string,
): string {
  const name = patientName(firstName, lastName);
  return `${name} ተመዝግበዋል። ቁጥር ${patientNumber}።`;
}

export function buildProceedMessage(
  firstName: string,
  lastName: string | null | undefined,
  paid: boolean,
): string {
  const name = patientName(firstName, lastName);
  return paid
    ? `${name} ክፍያ ተቀብለናል። እባክዎ ይቀጥሉ።`
    : `${name} እባክዎ ይቀጥሉ።`;
}

export function buildPaymentCompleteMessage(
  patientNameText: string,
  returnStation: CallStation | null | undefined,
): string {
  const name = patientNameText.trim() || "ታካሚ";
  if (!returnStation) {
    return `${name} ክፍያ ተጠናቋል።`;
  }
  const dest = stationCallLabelAm(returnStation);
  return `${name} ክፍያ ተጠናቋል። እባክዎ ወደ ${dest} ይመለሱ።`;
}

/**
 * Speak Amharic (am-ET) using the local speech engine - works offline when
 * an Amharic voice is installed on the device.
 * Honors Settings → Patient Call voice (default off).
 */
export function announceClinic(message: string) {
  if (typeof window === "undefined") return;
  if (!usePreferencesStore.getState().voiceCallEnabled) return;

  const synth = window.speechSynthesis;
  if (!synth) return;

  primeSpeechSynthesis();
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(message);
  utter.lang = AM_LANG;
  utter.rate = 0.9;
  utter.pitch = 1;
  utter.volume = 1;

  const voice = pickAmharicVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang || AM_LANG;
  }

  // Defer slightly so cancel() settles (Chrome quirk) - still offline.
  window.setTimeout(() => {
    try {
      synth.speak(utter);
    } catch {
      /* unsupported */
    }
  }, 40);
}

/** Call patient to a station (Amharic, offline). */
export function announcePatientCall(
  firstName: string,
  lastName: string | null | undefined,
  station: CallStation,
) {
  announceClinic(buildCallMessage(firstName, lastName, station));
}
