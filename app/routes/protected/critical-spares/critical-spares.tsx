import {
  useLoaderData,
  useSearchParams,
} from "react-router";
import {
  Chip,
  SelectItem,
  TableRow,
  TableCell,
  Card,
  CardBody,
} from "@heroui/react";
import { Search, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import { DataTable } from "~/components/heroui/data-table";
import { TextInput } from "~/components/heroui/inputs";
import { SelectInput } from "~/components/heroui/select-inputs";
import { useDebounce } from "~/hooks/useDebounce";
import SectionCard from "~/components/fragments/section-card";
import {
  InlineSelectCell,
  InlineTextCell,
} from "~/components/heroui/inline-edit-cell";
import type { Route } from "./+types/critical-spares";

interface CriticalSpareData {
  id: string;
  section: string;
  equipment: string;
  purchaseOrder: string;
  vendor: string;
  description: string;
  currency: string;
  amount: number;
  usdEquivalent: number;
  eta: string;
  paymentStatus: string;
  financeUpdate1: string;
  hqUpdate: string;
  financeUpdate2: string;
  paymentDate: string | null;
  instructionAmount: number | null;
  supplyChainUpdate: string;
}

interface LoaderData {
  items: CriticalSpareData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  sectionCounts: { section: string; count: number; totalUSD: number }[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { CriticalSpare } = await import("~/server/db/models/CriticalSpare");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) {
    return { items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, sectionCounts: [] };
  }

  await connectDB();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const search = url.searchParams.get("search") || "";
  const section = url.searchParams.get("section") || "";
  const finance2 = url.searchParams.get("finance2") || "";

  const filter: Record<string, any> = {};

  if (search) {
    const { escapeRegex } = await import("~/server/utils/regex-utils");
    filter.$or = [
      { vendor: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } },
      { equipment: { $regex: escapeRegex(search), $options: "i" } },
      { purchaseOrder: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }
  if (section && section !== "all") filter.section = section;
  if (finance2 && finance2 !== "all") filter.financeUpdate2 = finance2;

  const total = await CriticalSpare.countDocuments(filter);
  const items = await CriticalSpare.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ usdEquivalent: -1 });

  const sectionCounts = await CriticalSpare.aggregate([
    { $group: { _id: "$section", count: { $sum: 1 }, totalUSD: { $sum: "$usdEquivalent" } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      section: item.section,
      equipment: item.equipment,
      purchaseOrder: item.purchaseOrder,
      vendor: item.vendor,
      description: item.description,
      currency: item.currency,
      amount: item.amount,
      usdEquivalent: item.usdEquivalent,
      eta: item.eta,
      paymentStatus: item.paymentStatus,
      financeUpdate1: item.financeUpdate1,
      hqUpdate: item.hqUpdate,
      financeUpdate2: item.financeUpdate2,
      paymentDate: item.paymentDate ? item.paymentDate.toISOString().split("T")[0] : null,
      instructionAmount: item.instructionAmount || null,
      supplyChainUpdate: item.supplyChainUpdate,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    sectionCounts: sectionCounts.map((a) => ({
      section: a._id,
      count: a.count,
      totalUSD: a.totalUSD,
    })),
  } satisfies LoaderData;
}

export async function action({ request }: Route.ActionArgs) {
  const { connectDB } = await import("~/server/db/connection");
  const { CriticalSpare } = await import("~/server/db/models/CriticalSpare");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    await connectDB();

    if (intent === "updateStatus") {
      const itemId = formData.get("itemId") as string;
      const field = formData.get("field") as string;
      const value = formData.get("value") as string;

      if (!itemId || !field) return { success: false, message: "Missing fields" };

      const allowedFields = [
        "financeUpdate1", "hqUpdate", "financeUpdate2",
        "supplyChainUpdate", "eta",
      ];
      if (!allowedFields.includes(field)) return { success: false, message: "Invalid field" };

      await CriticalSpare.findByIdAndUpdate(itemId, { [field]: value });
      return { success: true, message: "Updated" };
    }

    return { success: false, message: "Invalid action" };
  } catch (error: any) {
    return { success: false, message: error?.message || "An error occurred" };
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

const finance1Options = [
  { key: "Instruction Sent", label: "Instruction Sent" },
  { key: "Instruction On Hold", label: "Instruction On Hold" },
  { key: "Instruction Not Sent", label: "Instruction Not Sent" },
  { key: "Payment Initiated", label: "Payment Initiated" },
  { key: "To Be Loaded @ Fidelity", label: "To Be Loaded @ Fidelity" },
  { key: "Duplicate", label: "Duplicate" },
];

const hqOptions = [
  { key: "Processed", label: "Processed" },
  { key: "Not Processed", label: "Not Processed" },
  { key: "Processed To Bank", label: "Processed To Bank" },
  { key: "Processed to Bank", label: "Processed to Bank" },
  { key: "Bank Clearance Pending", label: "Bank Clearance Pending" },
  { key: "N/A", label: "N/A" },
];

const finance2Options = [
  { key: "Paid", label: "Paid" },
  { key: "Not Paid", label: "Not Paid" },
  { key: "Bank Clearance Pending", label: "Bank Clearance Pending" },
  { key: "Bank Feedback Pending", label: "Bank Feedback Pending" },
  { key: "N/A", label: "N/A" },
];

const finance1ColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Instruction Sent": "success",
  "Instruction On Hold": "warning",
  "Instruction Not Sent": "danger",
  "Payment Initiated": "primary",
  "To Be Loaded @ Fidelity": "warning",
  "Duplicate": "default",
};

const hqColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Processed": "success",
  "Not Processed": "danger",
  "Processed To Bank": "warning",
  "Processed to Bank": "warning",
  "Bank Clearance Pending": "warning",
  "N/A": "default",
};

const finance2ColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Paid": "success",
  "Not Paid": "danger",
  "Bank Clearance Pending": "warning",
  "Bank Feedback Pending": "warning",
  "N/A": "default",
};

export default function CriticalSparesPage() {
  const { items, pagination, sectionCounts } =
    useLoaderData<typeof loader>() as LoaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchValue, 500);
  const currentSection = searchParams.get("section") || "all";
  const currentFinance2 = searchParams.get("finance2") || "all";

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const columns = [
    "Equipment",
    "Vendor",
    "PO",
    "Amount",
    "USD Equiv.",
    "ETA",
    "Finance 1",
    "HQ Update",
    "Payment",
    "Supply Chain",
  ];

  return (
    <FadeUpPageEntry>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Critical Spares
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Engineering critical order list &middot; Click any status cell to edit inline
        </p>
      </div>

      {/* Section Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sectionCounts.map((s) => (
          <Card
            key={s.section}
            shadow="none"
            isPressable
            className={`border-1.5 bg-transparent transition-colors ${
              currentSection === s.section
                ? "border-amber-400 dark:border-amber-500"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
            onPress={() => handleFilter("section", currentSection === s.section ? "all" : s.section)}
          >
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wrench size={14} className="text-amber-600" />
                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  {s.section}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">{s.count} items</span>
                <span className="font-medium">{formatCurrency(s.totalUSD)}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <TextInput
          placeholder="Search spares..."
          startContent={<Search size={18} className="text-zinc-400" />}
          className="sm:max-w-xs"
          value={searchValue}
          onValueChange={setSearchValue}
          isClearable
        />
        <SelectInput
          label=""
          placeholder="Section"
          className="sm:max-w-[160px]"
          selectedKeys={[currentSection]}
          onSelectionChange={(keys) => handleFilter("section", Array.from(keys)[0] as string)}
        >
          <SelectItem key="all">All Sections</SelectItem>
          <SelectItem key="Processing">Processing</SelectItem>
          <SelectItem key="HME">HME</SelectItem>
          <SelectItem key="LV">LV</SelectItem>
          <SelectItem key="Infrastructure">Infrastructure</SelectItem>
        </SelectInput>
        <SelectInput
          label=""
          placeholder="Payment"
          className="sm:max-w-[180px]"
          selectedKeys={[currentFinance2]}
          onSelectionChange={(keys) => handleFilter("finance2", Array.from(keys)[0] as string)}
        >
          <SelectItem key="all">All Payments</SelectItem>
          <SelectItem key="Paid">Paid</SelectItem>
          <SelectItem key="Bank Clearance Pending">Bank Pending</SelectItem>
          <SelectItem key="N/A">N/A</SelectItem>
        </SelectInput>
      </div>

      {/* Inline-editable Table */}
      <SectionCard>
        <DataTable
          columns={columns}
          totalPages={pagination.totalPages}
          removeWrapper
          emptyContent={{ title: "No critical spares found", subtext: "Adjust your filters" }}
        >
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="max-w-[120px]">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-xs">
                    {item.equipment || "-"}
                  </p>
                  <Chip size="sm" variant="flat" color="default" classNames={{ content: "text-xs" }}>
                    {item.section}
                  </Chip>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[160px]">
                  <p className="font-medium truncate text-xs">{item.vendor}</p>
                  <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono">{item.purchaseOrder || "-"}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs">{formatAmount(item.amount, item.currency)}</span>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-xs">{formatCurrency(item.usdEquivalent)}</span>
              </TableCell>
              <TableCell>
                <InlineTextCell
                  itemId={item.id}
                  field="eta"
                  value={item.eta}
                  placeholder="Set ETA..."
                />
              </TableCell>
              <TableCell>
                <InlineSelectCell
                  itemId={item.id}
                  field="financeUpdate1"
                  value={item.financeUpdate1}
                  options={finance1Options}
                  colorMap={finance1ColorMap}
                />
              </TableCell>
              <TableCell>
                <InlineSelectCell
                  itemId={item.id}
                  field="hqUpdate"
                  value={item.hqUpdate}
                  options={hqOptions}
                  colorMap={hqColorMap}
                />
              </TableCell>
              <TableCell>
                <InlineSelectCell
                  itemId={item.id}
                  field="financeUpdate2"
                  value={item.financeUpdate2}
                  options={finance2Options}
                  colorMap={finance2ColorMap}
                />
              </TableCell>
              <TableCell>
                <InlineTextCell
                  itemId={item.id}
                  field="supplyChainUpdate"
                  value={item.supplyChainUpdate}
                  placeholder="Add update..."
                />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </SectionCard>
    </FadeUpPageEntry>
  );
}
