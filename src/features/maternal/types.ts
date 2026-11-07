export type PreviousDeliveryMode = "SVD" | "CS" | "INSTRUMENTAL";
export type FetalPresentation = "CEPHALIC" | "BREECH" | "TRANSVERSE";
export type FetalMovement = "PRESENT" | "ABSENT";
export type AncRiskLevel = "LOW" | "HIGH";
export type LaborOnset = "SPONTANEOUS" | "INDUCED";
export type MembraneStatus = "INTACT" | "RUPTURED";
export type LiquorStatus = "CLEAR" | "MECONIUM" | "BLOOD_STAINED";
export type DeliveryMode = "SVD" | "CS" | "ASSISTED_VAGINAL";
export type DeliveryPlace = "CLINIC" | "REFERRAL";
export type PlacentaStatus = "COMPLETE" | "INCOMPLETE";
export type ThirdStageManagement = "ACTIVE" | "PHYSIOLOGICAL";
export type BabySex = "MALE" | "FEMALE";
export type BabyStatus = "ALIVE" | "STILLBIRTH";
export type MaternalCondition = "STABLE" | "UNSTABLE";
export type PostDeliveryDisposition =
  | "POSTNATAL_WARD"
  | "REFERRAL"
  | "OTHER";

export type ObstetricHistory = {
  id: string;
  patientId: string;
  gravidity?: number | null;
  term?: number | null;
  preterm?: number | null;
  abortion?: number | null;
  living?: number | null;
  lmp?: string | null;
  edd?: string | null;
  previousDelivery?: PreviousDeliveryMode | null;
  previousCs?: boolean | null;
  previousPph?: boolean | null;
  previousPetEclampsia?: boolean | null;
  stillbirth?: boolean | null;
  otherComplications?: string | null;
  bloodGroupRh?: string | null;
  hivStatus?: string | null;
  syphilisStatus?: string | null;
  hepatitisBStatus?: string | null;
  tetanusStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AncVisit = {
  id: string;
  patientId: string;
  encounterId?: string | null;
  visitNumber: number;
  visitDate: string;
  gaWeeks?: number | null;
  gaDays?: number | null;
  weightKg?: number | string | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulseRate?: number | null;
  fundalHeightCm?: number | string | null;
  fetalHeartRate?: number | null;
  fetalPresentation?: FetalPresentation | null;
  fetalMovement?: FetalMovement | null;
  urineProtein?: boolean | null;
  urineGlucose?: boolean | null;
  hemoglobinGdl?: number | string | null;
  bloodGlucose?: number | string | null;
  riskAssessment?: AncRiskLevel | null;
  treatment?: string | null;
  ultrasoundFindings?: string | null;
  nextAppointment?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LaborMonitoringEntry = {
  id: string;
  laborAdmissionId: string;
  recordedAt: string;
  cervicalDilatationCm?: number | string | null;
  fetalHeartRate?: number | null;
  contractionsPer10Min?: number | null;
  contractionDurationSec?: number | null;
  membraneLiquorNote?: string | null;
  descentFifths?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulseRate?: number | null;
  urineOutputMl?: number | null;
  medicationNote?: string | null;
  createdAt?: string;
};

export type LaborAdmission = {
  id: string;
  encounterId: string;
  admittedAt: string;
  gaWeeks?: number | null;
  onsetOfLabor?: LaborOnset | null;
  cervicalDilatationCm?: number | string | null;
  cervicalEffacementPct?: number | null;
  membraneStatus?: MembraneStatus | null;
  liquor?: LiquorStatus | null;
  fetalPresentation?: FetalPresentation | null;
  fetalHeartRate?: number | null;
  contractionsNote?: string | null;
  systolic?: number | null;
  diastolic?: number | null;
  pulseRate?: number | null;
  temperatureC?: number | string | null;
  monitoringEntries?: LaborMonitoringEntry[];
  createdAt?: string;
  updatedAt?: string;
};

export type NewbornRecord = {
  id?: string;
  birthOrder: number;
  sex?: BabySex | null;
  birthWeightGrams?: number | null;
  apgar1?: number | null;
  apgar5?: number | null;
  gaWeeks?: number | null;
  status?: BabyStatus | null;
  resuscitation?: boolean | null;
  nicuAdmission?: boolean | null;
};

export type DeliverySummary = {
  id: string;
  encounterId: string;
  deliveredAt?: string | null;
  modeOfDelivery?: DeliveryMode | null;
  csIndication?: string | null;
  placeOfDelivery?: DeliveryPlace | null;
  presentation?: FetalPresentation | null;
  episiotomy?: boolean | null;
  perinealTearDegree?: string | null;
  placenta?: PlacentaStatus | null;
  thirdStageManagement?: ThirdStageManagement | null;
  estimatedBloodLossMl?: number | null;
  complications?: string | null;
  maternalCondition?: MaternalCondition | null;
  pph?: boolean | null;
  bloodTransfusion?: boolean | null;
  additionalIntervention?: string | null;
  postDeliverySystolic?: number | null;
  postDeliveryDiastolic?: number | null;
  disposition?: PostDeliveryDisposition | null;
  newborns?: NewbornRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type PatientMaternal = {
  obstetricHistory?: ObstetricHistory | null;
  ancVisits?: AncVisit[];
  laborAdmission?: LaborAdmission | null;
  deliverySummary?: DeliverySummary | null;
};
