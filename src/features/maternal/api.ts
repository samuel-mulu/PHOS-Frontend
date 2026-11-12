import { api } from "@/lib/api/client";
import type {
  AncVisitFormValues,
  DeliveryFormValues,
  LaborAdmissionFormValues,
  LaborMonitoringFormValues,
  ObstetricHistoryFormValues,
} from "./schemas";
import type {
  AncVisit,
  DeliverySummary,
  LaborAdmission,
  LaborMonitoringEntry,
  ObstetricHistory,
  PatientMaternal,
} from "./types";

function num(value?: string) {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function int(value?: string) {
  const n = num(value);
  return n === undefined ? undefined : Math.trunc(n);
}

function dateOnly(value?: string) {
  if (!value?.trim()) return undefined;
  return value.trim().slice(0, 10);
}

function dateTime(value?: string) {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.trim() : d.toISOString();
}

function putBool(out: Record<string, unknown>, key: string, value?: boolean | null) {
  if (value === true || value === false) out[key] = value;
}

export function obstetricHistoryToPayload(values: ObstetricHistoryFormValues) {
  const out: Record<string, unknown> = {};
  const gravidity = int(values.gravidity);
  const term = int(values.term);
  const preterm = int(values.preterm);
  const abortion = int(values.abortion);
  const living = int(values.living);
  if (gravidity !== undefined) out.gravidity = gravidity;
  if (term !== undefined) out.term = term;
  if (preterm !== undefined) out.preterm = preterm;
  if (abortion !== undefined) out.abortion = abortion;
  if (living !== undefined) out.living = living;
  const lmp = dateOnly(values.lmp);
  const edd = dateOnly(values.edd);
  if (values.lmpStatus === "KNOWN") {
    out.lmpStatus = "KNOWN";
    out.datingSource = "LMP";
    out.lmp = lmp ?? null;
    out.datingEstablished = Boolean(lmp);
  } else if (values.lmpStatus === "UNKNOWN") {
    out.lmpStatus = "UNKNOWN";
    out.lmp = null;
    if (values.datingSource === "ULTRASOUND") {
      out.datingSource = "ULTRASOUND";
      out.edd = edd ?? null;
      out.datingEstablished = Boolean(edd);
    } else if (values.datingSource === "CLINICAL") {
      out.datingSource = "CLINICAL";
      out.edd = edd ?? null;
      out.datingEstablished = values.datingEstablished === true && Boolean(edd);
    } else {
      out.datingSource = "NONE";
      out.edd = null;
      out.datingEstablished = false;
    }
  } else {
    if (lmp) out.lmp = lmp;
    if (edd) out.edd = edd;
  }
  if (values.previousDelivery)
    out.previousDelivery = values.previousDelivery;
  putBool(out, "previousCs", values.previousCs);
  putBool(out, "previousPph", values.previousPph);
  putBool(out, "previousPetEclampsia", values.previousPetEclampsia);
  putBool(out, "stillbirth", values.stillbirth);
  if (values.otherComplications?.trim())
    out.otherComplications = values.otherComplications.trim();
  if (values.bloodGroupRh?.trim()) out.bloodGroupRh = values.bloodGroupRh.trim();
  if (values.hivStatus?.trim()) out.hivStatus = values.hivStatus.trim();
  if (values.syphilisStatus?.trim())
    out.syphilisStatus = values.syphilisStatus.trim();
  if (values.hepatitisBStatus?.trim())
    out.hepatitisBStatus = values.hepatitisBStatus.trim();
  if (values.tetanusStatus?.trim())
    out.tetanusStatus = values.tetanusStatus.trim();
  return out;
}

export function ancVisitToPayload(values: AncVisitFormValues) {
  const out: Record<string, unknown> = {
    visitDate: dateOnly(values.visitDate),
  };
  const visitNumber = int(values.visitNumber);
  if (visitNumber !== undefined) out.visitNumber = visitNumber;
  const gaWeeks = int(values.gaWeeks);
  const gaDays = int(values.gaDays);
  if (gaWeeks !== undefined) out.gaWeeks = gaWeeks;
  if (gaDays !== undefined) out.gaDays = gaDays;
  const weightKg = num(values.weightKg);
  if (weightKg !== undefined) out.weightKg = weightKg;
  const systolic = int(values.systolic);
  const diastolic = int(values.diastolic);
  const pulseRate = int(values.pulseRate);
  if (systolic !== undefined) out.systolic = systolic;
  if (diastolic !== undefined) out.diastolic = diastolic;
  if (pulseRate !== undefined) out.pulseRate = pulseRate;
  const fundalHeightCm = num(values.fundalHeightCm);
  if (fundalHeightCm !== undefined) out.fundalHeightCm = fundalHeightCm;
  const fetalHeartRate = int(values.fetalHeartRate);
  if (fetalHeartRate !== undefined) out.fetalHeartRate = fetalHeartRate;
  if (values.fetalPresentation)
    out.fetalPresentation = values.fetalPresentation;
  if (values.fetalMovement) out.fetalMovement = values.fetalMovement;
  putBool(out, "urineProtein", values.urineProtein);
  putBool(out, "urineGlucose", values.urineGlucose);
  const hemoglobinGdl = num(values.hemoglobinGdl);
  if (hemoglobinGdl !== undefined) out.hemoglobinGdl = hemoglobinGdl;
  const bloodGlucose = num(values.bloodGlucose);
  if (bloodGlucose !== undefined) out.bloodGlucose = bloodGlucose;
  if (values.riskAssessment) out.riskAssessment = values.riskAssessment;
  if (values.treatment?.trim()) out.treatment = values.treatment.trim();
  if (values.ultrasoundFindings?.trim())
    out.ultrasoundFindings = values.ultrasoundFindings.trim();
  const nextAppointment = dateOnly(values.nextAppointment);
  if (nextAppointment) out.nextAppointment = nextAppointment;
  if (values.encounterId?.trim()) out.encounterId = values.encounterId.trim();
  return out;
}

export function laborAdmissionToPayload(values: LaborAdmissionFormValues) {
  const out: Record<string, unknown> = {
    admittedAt: dateTime(values.admittedAt),
  };
  const gaWeeks = int(values.gaWeeks);
  if (gaWeeks !== undefined) out.gaWeeks = gaWeeks;
  if (values.onsetOfLabor) out.onsetOfLabor = values.onsetOfLabor;
  const cervicalDilatationCm = num(values.cervicalDilatationCm);
  if (cervicalDilatationCm !== undefined)
    out.cervicalDilatationCm = cervicalDilatationCm;
  const cervicalEffacementPct = int(values.cervicalEffacementPct);
  if (cervicalEffacementPct !== undefined)
    out.cervicalEffacementPct = cervicalEffacementPct;
  if (values.membraneStatus) out.membraneStatus = values.membraneStatus;
  if (values.liquor) out.liquor = values.liquor;
  if (values.fetalPresentation) out.fetalPresentation = values.fetalPresentation;
  const fetalHeartRate = int(values.fetalHeartRate);
  if (fetalHeartRate !== undefined) out.fetalHeartRate = fetalHeartRate;
  if (values.contractionsNote?.trim())
    out.contractionsNote = values.contractionsNote.trim();
  const systolic = int(values.systolic);
  const diastolic = int(values.diastolic);
  const pulseRate = int(values.pulseRate);
  if (systolic !== undefined) out.systolic = systolic;
  if (diastolic !== undefined) out.diastolic = diastolic;
  if (pulseRate !== undefined) out.pulseRate = pulseRate;
  const temperatureC = num(values.temperatureC);
  if (temperatureC !== undefined) out.temperatureC = temperatureC;
  return out;
}

export function laborMonitoringToPayload(values: LaborMonitoringFormValues) {
  const out: Record<string, unknown> = {
    recordedAt: dateTime(values.recordedAt),
  };
  const cervicalDilatationCm = num(values.cervicalDilatationCm);
  if (cervicalDilatationCm !== undefined)
    out.cervicalDilatationCm = cervicalDilatationCm;
  const fetalHeartRate = int(values.fetalHeartRate);
  if (fetalHeartRate !== undefined) out.fetalHeartRate = fetalHeartRate;
  const contractionsPer10Min = int(values.contractionsPer10Min);
  if (contractionsPer10Min !== undefined)
    out.contractionsPer10Min = contractionsPer10Min;
  const contractionDurationSec = int(values.contractionDurationSec);
  if (contractionDurationSec !== undefined)
    out.contractionDurationSec = contractionDurationSec;
  if (values.membraneLiquorNote?.trim())
    out.membraneLiquorNote = values.membraneLiquorNote.trim();
  const descentFifths = int(values.descentFifths);
  if (descentFifths !== undefined) out.descentFifths = descentFifths;
  const systolic = int(values.systolic);
  const diastolic = int(values.diastolic);
  const pulseRate = int(values.pulseRate);
  if (systolic !== undefined) out.systolic = systolic;
  if (diastolic !== undefined) out.diastolic = diastolic;
  if (pulseRate !== undefined) out.pulseRate = pulseRate;
  const urineOutputMl = int(values.urineOutputMl);
  if (urineOutputMl !== undefined) out.urineOutputMl = urineOutputMl;
  if (values.medicationNote?.trim())
    out.medicationNote = values.medicationNote.trim();
  return out;
}

export function deliveryToPayload(values: DeliveryFormValues) {
  const out: Record<string, unknown> = {};
  const deliveredAt = dateTime(values.deliveredAt);
  if (deliveredAt) out.deliveredAt = deliveredAt;
  if (values.modeOfDelivery) out.modeOfDelivery = values.modeOfDelivery;
  if (values.csIndication?.trim()) out.csIndication = values.csIndication.trim();
  if (values.placeOfDelivery) out.placeOfDelivery = values.placeOfDelivery;
  if (values.presentation) out.presentation = values.presentation;
  putBool(out, "episiotomy", values.episiotomy);
  if (values.perinealTearDegree?.trim())
    out.perinealTearDegree = values.perinealTearDegree.trim();
  if (values.placenta) out.placenta = values.placenta;
  if (values.thirdStageManagement)
    out.thirdStageManagement = values.thirdStageManagement;
  const estimatedBloodLossMl = int(values.estimatedBloodLossMl);
  if (estimatedBloodLossMl !== undefined)
    out.estimatedBloodLossMl = estimatedBloodLossMl;
  if (values.complications?.trim())
    out.complications = values.complications.trim();
  if (values.maternalCondition) out.maternalCondition = values.maternalCondition;
  putBool(out, "pph", values.pph);
  putBool(out, "bloodTransfusion", values.bloodTransfusion);
  if (values.additionalIntervention?.trim())
    out.additionalIntervention = values.additionalIntervention.trim();
  const postDeliverySystolic = int(values.postDeliverySystolic);
  const postDeliveryDiastolic = int(values.postDeliveryDiastolic);
  if (postDeliverySystolic !== undefined)
    out.postDeliverySystolic = postDeliverySystolic;
  if (postDeliveryDiastolic !== undefined)
    out.postDeliveryDiastolic = postDeliveryDiastolic;
  if (values.disposition) out.disposition = values.disposition;
  out.newborns = values.newborns.map((n, index) => {
    const baby: Record<string, unknown> = {
      birthOrder: int(n.birthOrder) ?? index + 1,
    };
    if (n.sex) baby.sex = n.sex;
    const birthWeightGrams = int(n.birthWeightGrams);
    if (birthWeightGrams !== undefined) baby.birthWeightGrams = birthWeightGrams;
    const apgar1 = int(n.apgar1);
    const apgar5 = int(n.apgar5);
    if (apgar1 !== undefined) baby.apgar1 = apgar1;
    if (apgar5 !== undefined) baby.apgar5 = apgar5;
    const gaWeeks = int(n.gaWeeks);
    if (gaWeeks !== undefined) baby.gaWeeks = gaWeeks;
    if (n.status) baby.status = n.status;
    putBool(baby, "resuscitation", n.resuscitation);
    putBool(baby, "nicuAdmission", n.nicuAdmission);
    return baby;
  });
  return out;
}

export async function fetchPatientMaternal(patientId: string) {
  const { data } = await api.get<PatientMaternal>(
    `/patients/${patientId}/maternal`,
  );
  return data;
}

export async function upsertObstetricHistory(
  patientId: string,
  values: ObstetricHistoryFormValues,
) {
  const { data } = await api.put<ObstetricHistory>(
    `/patients/${patientId}/obstetric-history`,
    obstetricHistoryToPayload(values),
  );
  return data;
}

export async function fetchAncVisits(patientId: string) {
  const { data } = await api.get<AncVisit[]>(
    `/patients/${patientId}/anc-visits`,
  );
  return data;
}

export async function createAncVisit(
  patientId: string,
  values: AncVisitFormValues,
) {
  const { data } = await api.post<AncVisit>(
    `/patients/${patientId}/anc-visits`,
    ancVisitToPayload(values),
  );
  return data;
}

export async function updateAncVisit(id: string, values: AncVisitFormValues) {
  const { data } = await api.put<AncVisit>(
    `/anc-visits/${id}`,
    ancVisitToPayload(values),
  );
  return data;
}

export async function fetchLabor(encounterId: string) {
  const { data } = await api.get<LaborAdmission | null>(
    `/encounters/${encounterId}/labor`,
  );
  return data;
}

export async function upsertLabor(
  encounterId: string,
  values: LaborAdmissionFormValues,
) {
  const { data } = await api.put<LaborAdmission>(
    `/encounters/${encounterId}/labor`,
    laborAdmissionToPayload(values),
  );
  return data;
}

export async function addLaborMonitoring(
  encounterId: string,
  values: LaborMonitoringFormValues,
) {
  const { data } = await api.post<LaborMonitoringEntry>(
    `/encounters/${encounterId}/labor/monitoring`,
    laborMonitoringToPayload(values),
  );
  return data;
}

export async function fetchDelivery(encounterId: string) {
  const { data } = await api.get<DeliverySummary | null>(
    `/encounters/${encounterId}/delivery`,
  );
  return data;
}

export async function upsertDelivery(
  encounterId: string,
  values: DeliveryFormValues,
) {
  const { data } = await api.put<DeliverySummary>(
    `/encounters/${encounterId}/delivery`,
    deliveryToPayload(values),
  );
  return data;
}
