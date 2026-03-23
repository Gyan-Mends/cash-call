import mongoose, { Schema, Document } from "mongoose";

export const ApprovalStatus = {
  FINAL_RELEASE: "Final Release",
  PENDING_FINAL_APPROVAL: "Pending Final Approval",
  APPROVED_TO_RELEASE: "Approved to Release",
  SUSPENDED: "Suspended",
  ON_HOLD: "On Hold",
  PROVIDE_FEEDBACK: "Provide Feedback",
} as const;
export type ApprovalStatusValue = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const FinanceUpdate1 = {
  INSTRUCTION_SENT: "Instruction Sent",
  INSTRUCTION_ON_HOLD: "Instruction On Hold",
  INSTRUCTION_NOT_SENT: "Instruction Not Sent",
  PAYMENT_INITIATED: "Payment Initiated",
} as const;
export type FinanceUpdate1Value = (typeof FinanceUpdate1)[keyof typeof FinanceUpdate1];

export const HQUpdate = {
  PROCESSED: "Processed",
  NOT_PROCESSED: "Not Processed",
  PROCESSED_TO_BANK: "Processed To Bank",
} as const;
export type HQUpdateValue = (typeof HQUpdate)[keyof typeof HQUpdate];

export const FinanceUpdate2 = {
  PAID: "Paid",
  NOT_PAID: "Not Paid",
  BANK_FEEDBACK_PENDING: "Bank Feedback Pending",
} as const;
export type FinanceUpdate2Value = (typeof FinanceUpdate2)[keyof typeof FinanceUpdate2];

export interface ICashCallItem extends Document {
  shipment: mongoose.Types.ObjectId;
  vendor: string;
  description: string;
  amountUSD: number;
  approvalStatus: ApprovalStatusValue;
  financeUpdate1: FinanceUpdate1Value;
  dateSent?: Date;
  hqUpdate: HQUpdateValue;
  financeUpdate2: FinanceUpdate2Value;
  paymentDate?: Date;
  instructionAmount?: number;
  supplyChainUpdate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShipment extends Document {
  shipmentNumber: string;
  revenue: number;
  expectedRevenue: number;
  totalExpenses: number;
  excessOrDeficit: number;
  createdAt: Date;
  updatedAt: Date;
}

const CashCallItemSchema = new Schema<ICashCallItem>(
  {
    shipment: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
    vendor: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    amountUSD: { type: Number, required: true, default: 0 },
    approvalStatus: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.PENDING_FINAL_APPROVAL,
    },
    financeUpdate1: {
      type: String,
      enum: Object.values(FinanceUpdate1),
      default: FinanceUpdate1.INSTRUCTION_NOT_SENT,
    },
    dateSent: { type: Date },
    hqUpdate: {
      type: String,
      enum: Object.values(HQUpdate),
      default: HQUpdate.NOT_PROCESSED,
    },
    financeUpdate2: {
      type: String,
      enum: Object.values(FinanceUpdate2),
      default: FinanceUpdate2.NOT_PAID,
    },
    paymentDate: { type: Date },
    instructionAmount: { type: Number },
    supplyChainUpdate: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "cash_call_items",
  }
);

CashCallItemSchema.index({ shipment: 1 });
CashCallItemSchema.index({ vendor: "text", description: "text" });
CashCallItemSchema.index({ approvalStatus: 1 });
CashCallItemSchema.index({ financeUpdate2: 1 });

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentNumber: { type: String, required: true, unique: true, trim: true },
    revenue: { type: Number, default: 0 },
    expectedRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    excessOrDeficit: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "shipments",
  }
);

ShipmentSchema.set("toJSON", { virtuals: true });
ShipmentSchema.set("toObject", { virtuals: true });
CashCallItemSchema.set("toJSON", { virtuals: true });
CashCallItemSchema.set("toObject", { virtuals: true });

export const Shipment =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export const CashCallItem =
  mongoose.models.CashCallItem || mongoose.model<ICashCallItem>("CashCallItem", CashCallItemSchema);
