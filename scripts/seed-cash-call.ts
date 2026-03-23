import mongoose from "mongoose";
import XLSX from "xlsx";
import path from "path";

// Connect to MongoDB
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/cashcall";

// Helper to convert Excel serial date to JS Date
function excelDateToJSDate(serial: number): Date | undefined {
  if (!serial || typeof serial !== "number" || serial < 40000) return undefined;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function parseAmount(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function cleanString(val: any): string {
  if (!val) return "";
  return String(val).trim();
}

// ----- Shipment Schema (inline for script) -----
const ShipmentSchema = new mongoose.Schema({
  shipmentNumber: { type: String, required: true, unique: true },
  revenue: { type: Number, default: 0 },
  expectedRevenue: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  excessOrDeficit: { type: Number, default: 0 },
}, { timestamps: true, collection: "shipments" });

const CashCallItemSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", required: true },
  vendor: { type: String, required: true },
  description: { type: String, default: "" },
  amountUSD: { type: Number, default: 0 },
  approvalStatus: { type: String, default: "Pending Final Approval" },
  financeUpdate1: { type: String, default: "Instruction Not Sent" },
  dateSent: { type: Date },
  hqUpdate: { type: String, default: "Not Processed" },
  financeUpdate2: { type: String, default: "Not Paid" },
  paymentDate: { type: Date },
  instructionAmount: { type: Number },
  supplyChainUpdate: { type: String, default: "" },
}, { timestamps: true, collection: "cash_call_items" });

const CriticalSpareSchema = new mongoose.Schema({
  section: { type: String, required: true },
  equipment: { type: String, default: "" },
  purchaseOrder: { type: String, default: "" },
  vendor: { type: String, required: true },
  description: { type: String, default: "" },
  currency: { type: String, default: "USD" },
  amount: { type: Number, default: 0 },
  usdEquivalent: { type: Number, default: 0 },
  eta: { type: String, default: "" },
  paymentStatus: { type: String, default: "NO" },
  partPayment: { type: Number, default: 0 },
  financeUpdate1: { type: String, default: "" },
  instructionSentDate: { type: Date },
  hqUpdate: { type: String, default: "" },
  financeUpdate2: { type: String, default: "" },
  paymentDate: { type: Date },
  instructionAmount: { type: Number },
  supplyChainUpdate: { type: String, default: "" },
}, { timestamps: true, collection: "critical_spares" });

const Shipment = mongoose.model("Shipment", ShipmentSchema);
const CashCallItem = mongoose.model("CashCallItem", CashCallItemSchema);
const CriticalSpare = mongoose.model("CriticalSpare", CriticalSpareSchema);

// ----- Shipment parsers -----
interface ShipmentConfig {
  sheetName: string;
  shipmentNumber: string;
  headerRow: number;
  revenueRow: number;
  expectedRevenueRow: number;
  vendorCol: number;
  descriptionCol: number | null;
  amountCol: number;
  approvalCol: number;
  financeUpdate1Col: number;
  dateSentCol: number | null;
  hqUpdateCol: number;
  financeUpdate2Col: number;
  paymentDateCol: number;
  instructionAmountCol: number;
  supplyChainCol: number;
  subtotalKeyword: string;
}

const shipment062Config: ShipmentConfig = {
  sheetName: "Shipment 062",
  shipmentNumber: "062",
  headerRow: 6,
  revenueRow: 2,
  expectedRevenueRow: 4,
  vendorCol: 0, // B col (offset from B)
  descriptionCol: null,
  amountCol: 1,
  approvalCol: 2,
  financeUpdate1Col: 3,
  dateSentCol: null,
  hqUpdateCol: 4,
  financeUpdate2Col: 5,
  paymentDateCol: 6,
  instructionAmountCol: 7,
  supplyChainCol: 8,
  subtotalKeyword: "Roll Over",
};

const shipment063Config: ShipmentConfig = {
  sheetName: "Shipment 063",
  shipmentNumber: "063",
  headerRow: 6,
  revenueRow: 4,
  expectedRevenueRow: 4,
  vendorCol: 0,
  descriptionCol: 1,
  amountCol: 2,
  approvalCol: 3,
  financeUpdate1Col: 4,
  dateSentCol: 5,
  hqUpdateCol: 6,
  financeUpdate2Col: 7,
  paymentDateCol: 8,
  instructionAmountCol: 9,
  supplyChainCol: 10,
  subtotalKeyword: "Sub-total",
};

const shipment064Config: ShipmentConfig = {
  sheetName: "Shipment 064",
  shipmentNumber: "064",
  headerRow: 8,
  revenueRow: 7,
  expectedRevenueRow: 7,
  vendorCol: 1,
  descriptionCol: 2,
  amountCol: 3,
  approvalCol: 4,
  financeUpdate1Col: 5,
  dateSentCol: 6,
  hqUpdateCol: 7,
  financeUpdate2Col: 8,
  paymentDateCol: 9,
  instructionAmountCol: 10,
  supplyChainCol: 11,
  subtotalKeyword: "Sub-total",
};

const shipment065Config: ShipmentConfig = {
  sheetName: "Shipment 065",
  shipmentNumber: "065",
  headerRow: 3,
  revenueRow: 2,
  expectedRevenueRow: 2,
  vendorCol: 0,
  descriptionCol: 1,
  amountCol: 2,
  approvalCol: 3,
  financeUpdate1Col: 4,
  dateSentCol: 5,
  hqUpdateCol: 6,
  financeUpdate2Col: 7,
  paymentDateCol: 8,
  instructionAmountCol: 9,
  supplyChainCol: 10,
  subtotalKeyword: "Sub-total",
};

function normalizeApproval(val: string): string {
  const v = val.trim();
  if (/final\s*(release|approval)/i.test(v)) return "Final Release";
  if (/pending/i.test(v)) return "Pending Final Approval";
  if (/approved/i.test(v)) return "Approved to Release";
  if (/suspend/i.test(v)) return "Suspended";
  if (/on\s*hold/i.test(v)) return "On Hold";
  if (/provide/i.test(v)) return "Provide Feedback";
  if (/backup|renegotiat|release after/i.test(v)) return "Provide Feedback";
  return v || "Pending Final Approval";
}

function normalizeFinance1(val: string): string {
  const v = val.trim();
  if (/instruction\s*sent/i.test(v)) return "Instruction Sent";
  if (/on\s*hold/i.test(v)) return "Instruction On Hold";
  if (/not\s*sent/i.test(v)) return "Instruction Not Sent";
  if (/payment\s*init/i.test(v)) return "Payment Initiated";
  return v || "Instruction Not Sent";
}

function normalizeHQ(val: string): string {
  const v = val.trim();
  if (/processed\s*to\s*bank/i.test(v)) return "Processed To Bank";
  if (/not\s*processed/i.test(v)) return "Not Processed";
  if (/processed/i.test(v)) return "Processed";
  return v || "Not Processed";
}

function normalizeFinance2(val: string): string {
  const v = val.trim();
  if (/^paid$/i.test(v)) return "Paid";
  if (/not\s*paid/i.test(v)) return "Not Paid";
  if (/bank\s*feedback/i.test(v) || /bank\s*clearance/i.test(v)) return "Bank Feedback Pending";
  return v || "Not Paid";
}

async function parseShipment(wb: XLSX.WorkBook, config: ShipmentConfig) {
  const ws = wb.Sheets[config.sheetName];
  if (!ws) {
    console.log(`Sheet "${config.sheetName}" not found, skipping.`);
    return;
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Get revenue - column positions differ per sheet
  let revenue = 0;
  let expectedRevenue = 0;

  if (config.shipmentNumber === "062") {
    // Range B1:M - col 0=B. Row 2 has remittance in col 1 (C)
    revenue = parseAmount(rows[2]?.[1]);
    expectedRevenue = parseAmount(rows[4]?.[1]);
  } else if (config.shipmentNumber === "063") {
    // Range B1:N - col 0=B. Row 4 has revenue in col 2 (D)
    revenue = parseAmount(rows[4]?.[2]);
    expectedRevenue = parseAmount(rows[4]?.[2]);
  } else if (config.shipmentNumber === "064") {
    // Range A1:L - col 0=A. Inflows in col 3 (D), rows 2-5
    revenue = parseAmount(rows[2]?.[3]) + parseAmount(rows[3]?.[3]) + parseAmount(rows[4]?.[3]) + parseAmount(rows[5]?.[3]);
    expectedRevenue = parseAmount(rows[7]?.[3]);
  } else if (config.shipmentNumber === "065") {
    // Range B1:M - col 0=B. Row 2 has revenue in col 2 (D)
    expectedRevenue = parseAmount(rows[2]?.[2]);
    revenue = expectedRevenue;
  }

  // Create shipment
  const shipment = await Shipment.create({
    shipmentNumber: config.shipmentNumber,
    revenue,
    expectedRevenue,
  });

  console.log(`Created Shipment ${config.shipmentNumber}: revenue=$${revenue.toFixed(2)}, expected=$${expectedRevenue.toFixed(2)}`);

  // Parse cash call items
  const items: any[] = [];
  const startRow = config.headerRow + 1; // data starts after header row

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const vendor = cleanString(row[config.vendorCol]);
    if (!vendor) continue;

    // Stop at subtotal
    if (vendor.toLowerCase().includes("sub-total") || vendor.toLowerCase().includes("roll over")) break;
    // Skip if looks like a summary/empty row
    if (vendor.toLowerCase().includes("excess of income")) break;

    const amount = parseAmount(row[config.amountCol]);
    if (amount === 0 && !vendor) continue;

    const description = config.descriptionCol !== null ? cleanString(row[config.descriptionCol]) : "";
    const approval = cleanString(row[config.approvalCol]);
    const finance1 = cleanString(row[config.financeUpdate1Col]);
    const dateSent = config.dateSentCol !== null ? excelDateToJSDate(row[config.dateSentCol]) : undefined;
    const hqUpdate = cleanString(row[config.hqUpdateCol]);
    const finance2 = cleanString(row[config.financeUpdate2Col]);
    const paymentDate = excelDateToJSDate(row[config.paymentDateCol]);
    const instructionAmount = parseAmount(row[config.instructionAmountCol]);
    const supplyChain = cleanString(row[config.supplyChainCol]);

    items.push({
      shipment: shipment._id,
      vendor,
      description,
      amountUSD: amount,
      approvalStatus: normalizeApproval(approval),
      financeUpdate1: normalizeFinance1(finance1),
      dateSent,
      hqUpdate: normalizeHQ(hqUpdate),
      financeUpdate2: normalizeFinance2(finance2),
      paymentDate,
      instructionAmount: instructionAmount || undefined,
      supplyChainUpdate: supplyChain,
    });
  }

  if (items.length > 0) {
    await CashCallItem.insertMany(items);
    const totalExpenses = items.reduce((sum, item) => sum + item.amountUSD, 0);
    await Shipment.findByIdAndUpdate(shipment._id, {
      totalExpenses,
      excessOrDeficit: expectedRevenue - totalExpenses,
    });
    console.log(`  Inserted ${items.length} cash call items, total expenses: $${totalExpenses.toFixed(2)}`);
  }
}

// ----- Critical Spares parsers -----
interface SpareConfig {
  sheetName: string;
  section: string;
  headerRow: number;
  equipmentCol: number;
  poCol: number;
  vendorCol: number;
  descriptionCol: number;
  currencyCol: number;
  amountCol: number;
  usdCol: number;
  etaCol: number;
  financeUpdate1Col: number;
  instructionSentDateCol: number;
  hqUpdateCol: number;
  financeUpdate2Col: number;
  paymentDateCol: number;
  instructionAmountCol: number | null;
  supplyChainCol: number;
  paymentStatusCol: number;
}

const processingConfig: SpareConfig = {
  sheetName: "Processing Spares",
  section: "Processing",
  headerRow: 4,
  equipmentCol: 1,
  poCol: 2,
  vendorCol: 3,
  descriptionCol: 4,
  currencyCol: 5,
  amountCol: 6,
  usdCol: 9,
  etaCol: 10,
  paymentStatusCol: 7,
  financeUpdate1Col: 12,
  instructionSentDateCol: 13,
  hqUpdateCol: 14,
  financeUpdate2Col: 15,
  paymentDateCol: 16,
  instructionAmountCol: 17,
  supplyChainCol: 18,
};

const hmeConfig: SpareConfig = {
  sheetName: "HME",
  section: "HME",
  headerRow: 4,
  equipmentCol: 1,
  poCol: 2,
  vendorCol: 3,
  descriptionCol: 4,
  currencyCol: 5,
  amountCol: 6,
  usdCol: 7,
  etaCol: 8,
  paymentStatusCol: -1,
  financeUpdate1Col: 10,
  instructionSentDateCol: 11,
  hqUpdateCol: 12,
  financeUpdate2Col: 13,
  paymentDateCol: 14,
  instructionAmountCol: 15,
  supplyChainCol: 16,
};

const lvConfig: SpareConfig = {
  sheetName: "LV",
  section: "LV",
  headerRow: 4,
  equipmentCol: 1,
  poCol: 2,
  vendorCol: 3,
  descriptionCol: 4,
  currencyCol: 5,
  amountCol: 6,
  usdCol: 7,
  etaCol: 8,
  paymentStatusCol: -1,
  financeUpdate1Col: 10,
  instructionSentDateCol: 11,
  hqUpdateCol: 12,
  financeUpdate2Col: 13,
  paymentDateCol: 14,
  instructionAmountCol: 15,
  supplyChainCol: 16,
};

const infraConfig: SpareConfig = {
  sheetName: " Infrastructure",
  section: "Infrastructure",
  headerRow: 4,
  equipmentCol: -1,
  poCol: -1,
  vendorCol: 1,
  descriptionCol: 2,
  currencyCol: 3,
  amountCol: 4,
  usdCol: 5,
  etaCol: 6,
  paymentStatusCol: -1,
  financeUpdate1Col: 8,
  instructionSentDateCol: 9,
  hqUpdateCol: 10,
  financeUpdate2Col: 11,
  paymentDateCol: 12,
  instructionAmountCol: null,
  supplyChainCol: 13,
};

async function parseCriticalSpares(wb: XLSX.WorkBook, config: SpareConfig) {
  const ws = wb.Sheets[config.sheetName];
  if (!ws) {
    console.log(`Sheet "${config.sheetName}" not found, skipping.`);
    return;
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const items: any[] = [];

  for (let i = config.headerRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const vendor = cleanString(row[config.vendorCol]);
    if (!vendor) continue;
    if (/total\s*estimated/i.test(vendor) || vendor === "`") break;

    const amount = parseAmount(row[config.amountCol]);
    const usdEquivalent = parseAmount(row[config.usdCol]);
    if (amount === 0 && usdEquivalent === 0) continue;

    items.push({
      section: config.section,
      equipment: config.equipmentCol >= 0 ? cleanString(row[config.equipmentCol]) : "",
      purchaseOrder: config.poCol >= 0 ? cleanString(row[config.poCol]) : "",
      vendor,
      description: cleanString(row[config.descriptionCol]),
      currency: cleanString(row[config.currencyCol]) || "USD",
      amount,
      usdEquivalent,
      eta: cleanString(row[config.etaCol]),
      paymentStatus: config.paymentStatusCol >= 0 ? cleanString(row[config.paymentStatusCol]) || "NO" : "NO",
      financeUpdate1: cleanString(row[config.financeUpdate1Col]),
      instructionSentDate: excelDateToJSDate(row[config.instructionSentDateCol]),
      hqUpdate: cleanString(row[config.hqUpdateCol]),
      financeUpdate2: cleanString(row[config.financeUpdate2Col]),
      paymentDate: excelDateToJSDate(row[config.paymentDateCol]),
      instructionAmount: config.instructionAmountCol !== null ? parseAmount(row[config.instructionAmountCol]) || undefined : undefined,
      supplyChainUpdate: cleanString(row[config.supplyChainCol]),
    });
  }

  if (items.length > 0) {
    await CriticalSpare.insertMany(items);
    console.log(`Inserted ${items.length} critical spares for ${config.section}`);
  }
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected.");

  // Clear existing data
  await Shipment.deleteMany({});
  await CashCallItem.deleteMany({});
  await CriticalSpare.deleteMany({});
  console.log("Cleared existing data.");

  // Read Excel file
  const filePath = path.resolve("public/Finance Cash Call Update.xlsx");
  const wb = XLSX.readFile(filePath);
  console.log(`Loaded Excel file with sheets: ${wb.SheetNames.join(", ")}\n`);

  // Parse shipments
  await parseShipment(wb, shipment062Config);
  await parseShipment(wb, shipment063Config);
  await parseShipment(wb, shipment064Config);
  await parseShipment(wb, shipment065Config);

  console.log("");

  // Parse critical spares
  await parseCriticalSpares(wb, processingConfig);
  await parseCriticalSpares(wb, hmeConfig);
  await parseCriticalSpares(wb, lvConfig);
  await parseCriticalSpares(wb, infraConfig);

  console.log("\nSeed completed successfully!");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
