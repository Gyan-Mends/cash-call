import mongoose, { Schema, Document } from "mongoose";

export const SpareSection = {
  PROCESSING: "Processing",
  HME: "HME",
  LV: "LV",
  INFRASTRUCTURE: "Infrastructure",
} as const;
export type SpareSectionValue = (typeof SpareSection)[keyof typeof SpareSection];

export const PaymentStatus = {
  YES: "YES",
  NO: "NO",
  PARTIAL: "PARTIAL",
} as const;
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface ICriticalSpare extends Document {
  section: SpareSectionValue;
  equipment: string;
  purchaseOrder: string;
  vendor: string;
  description: string;
  currency: string;
  amount: number;
  usdEquivalent: number;
  eta: string;
  paymentStatus: string;
  partPayment: number;
  financeUpdate1: string;
  instructionSentDate?: Date;
  hqUpdate: string;
  financeUpdate2: string;
  paymentDate?: Date;
  instructionAmount?: number;
  supplyChainUpdate: string;
  createdAt: Date;
  updatedAt: Date;
}

const CriticalSpareSchema = new Schema<ICriticalSpare>(
  {
    section: {
      type: String,
      enum: Object.values(SpareSection),
      required: true,
    },
    equipment: { type: String, default: "", trim: true },
    purchaseOrder: { type: String, default: "", trim: true },
    vendor: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    currency: { type: String, default: "USD", trim: true },
    amount: { type: Number, default: 0 },
    usdEquivalent: { type: Number, default: 0 },
    eta: { type: String, default: "", trim: true },
    paymentStatus: { type: String, default: "NO" },
    partPayment: { type: Number, default: 0 },
    financeUpdate1: { type: String, default: "" },
    instructionSentDate: { type: Date },
    hqUpdate: { type: String, default: "" },
    financeUpdate2: { type: String, default: "" },
    paymentDate: { type: Date },
    instructionAmount: { type: Number },
    supplyChainUpdate: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "critical_spares",
  }
);

CriticalSpareSchema.index({ section: 1 });
CriticalSpareSchema.index({ vendor: "text", description: "text", equipment: "text" });
CriticalSpareSchema.index({ paymentStatus: 1 });

CriticalSpareSchema.set("toJSON", { virtuals: true });
CriticalSpareSchema.set("toObject", { virtuals: true });

export const CriticalSpare =
  mongoose.models.CriticalSpare ||
  mongoose.model<ICriticalSpare>("CriticalSpare", CriticalSpareSchema);
