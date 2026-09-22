export const LabOrderStatus = {
  ORDERED: "ORDERED",
  PROCESSING: "PROCESSING",
  RESULT_ENTERED: "RESULT_ENTERED",
  VERIFIED: "VERIFIED",
  CANCELLED: "CANCELLED",
} as const;

export type LabOrderStatus =
  (typeof LabOrderStatus)[keyof typeof LabOrderStatus];

export const LabResultFlag = {
  NORMAL: "NORMAL",
  LOW: "LOW",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
  ABNORMAL: "ABNORMAL",
} as const;

export type LabResultFlag = (typeof LabResultFlag)[keyof typeof LabResultFlag];
