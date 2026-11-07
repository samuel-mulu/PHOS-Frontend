import { z } from "zod";

export const obstetricHistorySchema = z.object({
  gravidity: z.string().optional(),
  term: z.string().optional(),
  preterm: z.string().optional(),
  abortion: z.string().optional(),
  living: z.string().optional(),
  lmp: z.string().optional(),
  edd: z.string().optional(),
  previousDelivery: z.enum(["", "SVD", "CS", "INSTRUMENTAL"]).optional(),
  previousCs: z.boolean().nullable().optional(),
  previousPph: z.boolean().nullable().optional(),
  previousPetEclampsia: z.boolean().nullable().optional(),
  stillbirth: z.boolean().nullable().optional(),
  otherComplications: z.string().optional(),
  bloodGroupRh: z.string().optional(),
  hivStatus: z.string().optional(),
  syphilisStatus: z.string().optional(),
  hepatitisBStatus: z.string().optional(),
  tetanusStatus: z.string().optional(),
});

export type ObstetricHistoryFormValues = z.infer<typeof obstetricHistorySchema>;

export const ancVisitSchema = z.object({
  visitNumber: z.string().optional(),
  visitDate: z.string().min(1, "Visit date is required"),
  gaWeeks: z.string().optional(),
  gaDays: z.string().optional(),
  weightKg: z.string().optional(),
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  pulseRate: z.string().optional(),
  fundalHeightCm: z.string().optional(),
  fetalHeartRate: z.string().optional(),
  fetalPresentation: z
    .enum(["", "CEPHALIC", "BREECH", "TRANSVERSE"])
    .optional(),
  fetalMovement: z.enum(["", "PRESENT", "ABSENT"]).optional(),
  urineProtein: z.boolean().nullable().optional(),
  urineGlucose: z.boolean().nullable().optional(),
  hemoglobinGdl: z.string().optional(),
  bloodGlucose: z.string().optional(),
  riskAssessment: z.enum(["", "LOW", "HIGH"]).optional(),
  treatment: z.string().optional(),
  ultrasoundFindings: z.string().optional(),
  nextAppointment: z.string().optional(),
  encounterId: z.string().optional(),
});

export type AncVisitFormValues = z.infer<typeof ancVisitSchema>;

export const laborAdmissionSchema = z.object({
  admittedAt: z.string().min(1, "Admission time is required"),
  gaWeeks: z.string().optional(),
  onsetOfLabor: z.enum(["", "SPONTANEOUS", "INDUCED"]).optional(),
  cervicalDilatationCm: z.string().optional(),
  cervicalEffacementPct: z.string().optional(),
  membraneStatus: z.enum(["", "INTACT", "RUPTURED"]).optional(),
  liquor: z.enum(["", "CLEAR", "MECONIUM", "BLOOD_STAINED"]).optional(),
  fetalPresentation: z
    .enum(["", "CEPHALIC", "BREECH", "TRANSVERSE"])
    .optional(),
  fetalHeartRate: z.string().optional(),
  contractionsNote: z.string().optional(),
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  pulseRate: z.string().optional(),
  temperatureC: z.string().optional(),
});

export type LaborAdmissionFormValues = z.infer<typeof laborAdmissionSchema>;

export const laborMonitoringSchema = z.object({
  recordedAt: z.string().min(1, "Time is required"),
  cervicalDilatationCm: z.string().optional(),
  fetalHeartRate: z.string().optional(),
  contractionsPer10Min: z.string().optional(),
  contractionDurationSec: z.string().optional(),
  membraneLiquorNote: z.string().optional(),
  descentFifths: z.string().optional(),
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  pulseRate: z.string().optional(),
  urineOutputMl: z.string().optional(),
  medicationNote: z.string().optional(),
});

export type LaborMonitoringFormValues = z.infer<typeof laborMonitoringSchema>;

export const newbornSchema = z.object({
  birthOrder: z.string().optional(),
  sex: z.enum(["", "MALE", "FEMALE"]).optional(),
  birthWeightGrams: z.string().optional(),
  apgar1: z.string().optional(),
  apgar5: z.string().optional(),
  gaWeeks: z.string().optional(),
  status: z.enum(["", "ALIVE", "STILLBIRTH"]).optional(),
  resuscitation: z.boolean().nullable().optional(),
  nicuAdmission: z.boolean().nullable().optional(),
});

export const deliverySchema = z.object({
  deliveredAt: z.string().optional(),
  modeOfDelivery: z.enum(["", "SVD", "CS", "ASSISTED_VAGINAL"]).optional(),
  csIndication: z.string().optional(),
  placeOfDelivery: z.enum(["", "CLINIC", "REFERRAL"]).optional(),
  presentation: z.enum(["", "CEPHALIC", "BREECH", "TRANSVERSE"]).optional(),
  episiotomy: z.boolean().nullable().optional(),
  perinealTearDegree: z.string().optional(),
  placenta: z.enum(["", "COMPLETE", "INCOMPLETE"]).optional(),
  thirdStageManagement: z.enum(["", "ACTIVE", "PHYSIOLOGICAL"]).optional(),
  estimatedBloodLossMl: z.string().optional(),
  complications: z.string().optional(),
  maternalCondition: z.enum(["", "STABLE", "UNSTABLE"]).optional(),
  pph: z.boolean().nullable().optional(),
  bloodTransfusion: z.boolean().nullable().optional(),
  additionalIntervention: z.string().optional(),
  postDeliverySystolic: z.string().optional(),
  postDeliveryDiastolic: z.string().optional(),
  disposition: z
    .enum(["", "POSTNATAL_WARD", "REFERRAL", "OTHER"])
    .optional(),
  newborns: z.array(newbornSchema).min(1),
});

export type DeliveryFormValues = z.infer<typeof deliverySchema>;
export type NewbornFormValues = z.infer<typeof newbornSchema>;
