export const ClinicalMessageKind = {
  NOTE: "NOTE",
  LAB_ORDER: "LAB_ORDER",
  LAB_RESULT: "LAB_RESULT",
} as const;

export type ClinicalMessageKind =
  (typeof ClinicalMessageKind)[keyof typeof ClinicalMessageKind];

export const ClinicalMessageAuthorSide = {
  DOCTOR: "DOCTOR",
  LAB: "LAB",
} as const;

export type ClinicalMessageAuthorSide =
  (typeof ClinicalMessageAuthorSide)[keyof typeof ClinicalMessageAuthorSide];

export type ClinicalMessageAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type ClinicalMessage = {
  id: string;
  encounterId: string;
  patientId: string;
  authorId: string;
  authorSide: ClinicalMessageAuthorSide;
  kind: ClinicalMessageKind;
  body: string;
  labOrderId?: string | null;
  createdAt: string;
  author: ClinicalMessageAuthor;
  labOrder?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
  encounter?: {
    id: string;
    encounterNumber: string;
    visitNumber?: number | null;
    startedAt: string;
  };
};
