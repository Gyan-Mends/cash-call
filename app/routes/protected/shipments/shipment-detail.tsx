import {
  useLoaderData,
  useSearchParams,
  Link,
} from "react-router";
import {
  Chip,
  SelectItem,
  TableRow,
  TableCell,
  Card,
  CardBody,
  Button,
} from "@heroui/react";
import {
  Search,
  ArrowLeft,
  Ship,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from "lucide-react";
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
  InlineAmountCell,
} from "~/components/heroui/inline-edit-cell";
import type { Route } from "./+types/shipment-detail";

interface CashCallItemData {
  id: string;
  vendor: string;
  description: string;
  amountUSD: number;
  approvalStatus: string;
  financeUpdate1: string;
  hqUpdate: string;
  financeUpdate2: string;
  paymentDate: string | null;
  instructionAmount: number | null;
  supplyChainUpdate: string;
}

interface ShipmentDetailData {
  shipment: {
    id: string;
    shipmentNumber: string;
    revenue: number;
    expectedRevenue: number;
    totalExpenses: number;
    excessOrDeficit: number;
  };
  items: CashCallItemData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { Shipment, CashCallItem } = await import("~/server/db/models/Shipment");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) throw new Response("Unauthorized", { status: 401 });

  await connectDB();

  const shipment = await Shipment.findById(params.shipmentId);
  if (!shipment) throw new Response("Not Found", { status: 404 });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const paymentStatus = url.searchParams.get("paymentStatus") || "";

  const filter: Record<string, any> = { shipment: shipment._id };

  if (search) {
    const { escapeRegex } = await import("~/server/utils/regex-utils");
    filter.$or = [
      { vendor: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } },
      { supplyChainUpdate: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }
  if (status && status !== "all") filter.approvalStatus = status;
  if (paymentStatus && paymentStatus !== "all") filter.financeUpdate2 = paymentStatus;

  const total = await CashCallItem.countDocuments(filter);
  const items = await CashCallItem.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ amountUSD: -1 });

  return {
    shipment: {
      id: shipment._id.toString(),
      shipmentNumber: shipment.shipmentNumber,
      revenue: shipment.revenue,
      expectedRevenue: shipment.expectedRevenue,
      totalExpenses: shipment.totalExpenses,
      excessOrDeficit: shipment.excessOrDeficit,
    },
    items: items.map((item) => ({
      id: item._id.toString(),
      vendor: item.vendor,
      description: item.description,
      amountUSD: item.amountUSD,
      approvalStatus: item.approvalStatus,
      financeUpdate1: item.financeUpdate1,
      hqUpdate: item.hqUpdate,
      financeUpdate2: item.financeUpdate2,
      paymentDate: item.paymentDate ? item.paymentDate.toISOString().split("T")[0] : null,
      instructionAmount: item.instructionAmount || null,
      supplyChainUpdate: item.supplyChainUpdate,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  } satisfies ShipmentDetailData;
}

export async function action({ request }: Route.ActionArgs) {
  const { connectDB } = await import("~/server/db/connection");
  const { CashCallItem } = await import("~/server/db/models/Shipment");

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
        "approvalStatus", "financeUpdate1", "hqUpdate",
        "financeUpdate2", "supplyChainUpdate",
      ];
      if (!allowedFields.includes(field)) return { success: false, message: "Invalid field" };

      await CashCallItem.findByIdAndUpdate(itemId, { [field]: value });
      return { success: true, message: "Updated" };
    }

    if (intent === "updateField") {
      const itemId = formData.get("itemId") as string;
      const field = formData.get("field") as string;
      const value = formData.get("value") as string;

      if (!itemId || !field) return { success: false, message: "Missing fields" };

      const allowedFields = ["amountUSD", "instructionAmount"];
      if (!allowedFields.includes(field)) return { success: false, message: "Invalid field" };

      await CashCallItem.findByIdAndUpdate(itemId, { [field]: parseFloat(value) });
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

const approvalOptions = [
  { key: "Final Release", label: "Final Release" },
  { key: "Approved to Release", label: "Approved to Release" },
  { key: "Pending Final Approval", label: "Pending Final Approval" },
  { key: "Provide Feedback", label: "Provide Feedback" },
  { key: "Suspended", label: "Suspended" },
  { key: "On Hold", label: "On Hold" },
];

const finance1Options = [
  { key: "Instruction Sent", label: "Instruction Sent" },
  { key: "Instruction On Hold", label: "Instruction On Hold" },
  { key: "Instruction Not Sent", label: "Instruction Not Sent" },
  { key: "Payment Initiated", label: "Payment Initiated" },
];

const hqOptions = [
  { key: "Processed", label: "Processed" },
  { key: "Not Processed", label: "Not Processed" },
  { key: "Processed To Bank", label: "Processed To Bank" },
];

const finance2Options = [
  { key: "Paid", label: "Paid" },
  { key: "Not Paid", label: "Not Paid" },
  { key: "Bank Feedback Pending", label: "Bank Feedback Pending" },
];

const approvalColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Final Release": "success",
  "Approved to Release": "primary",
  "Pending Final Approval": "warning",
  "Provide Feedback": "warning",
  "Suspended": "danger",
  "On Hold": "default",
};

const finance1ColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Instruction Sent": "success",
  "Instruction On Hold": "warning",
  "Instruction Not Sent": "danger",
  "Payment Initiated": "primary",
};

const hqColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Processed": "success",
  "Not Processed": "danger",
  "Processed To Bank": "warning",
};

const finance2ColorMap: Record<string, "success" | "warning" | "danger" | "primary" | "default"> = {
  "Paid": "success",
  "Not Paid": "danger",
  "Bank Feedback Pending": "warning",
};

export default function ShipmentDetailPage() {
  const { shipment, items, pagination } =
    useLoaderData<typeof loader>() as ShipmentDetailData;
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchValue, 500);
  const currentStatus = searchParams.get("status") || "all";
  const currentPaymentStatus = searchParams.get("paymentStatus") || "all";

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
    "Vendor",
    "Amount ($)",
    "Approval",
    "Finance Update 1",
    "HQ Update",
    "Finance Update 2",
    "Supply Chain",
  ];

  return (
    <FadeUpPageEntry>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/shipments">
          <Button variant="flat" size="sm" startContent={<ArrowLeft size={16} />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Shipment {shipment.shipmentNumber}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {pagination.total} vendor items &middot; Click any cell to edit
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card shadow="none" className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent">
          <CardBody className="p-3 flex flex-row items-center gap-3">
            <DollarSign size={18} className="text-emerald-600" />
            <div>
              <p className="text-xs text-zinc-500">Revenue</p>
              <p className="font-bold text-sm">{formatCurrency(shipment.expectedRevenue)}</p>
            </div>
          </CardBody>
        </Card>
        <Card shadow="none" className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent">
          <CardBody className="p-3 flex flex-row items-center gap-3">
            <TrendingDown size={18} className="text-red-600" />
            <div>
              <p className="text-xs text-zinc-500">Expenses</p>
              <p className="font-bold text-sm">{formatCurrency(shipment.totalExpenses)}</p>
            </div>
          </CardBody>
        </Card>
        <Card shadow="none" className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent">
          <CardBody className="p-3 flex flex-row items-center gap-3">
            {shipment.excessOrDeficit >= 0 ? (
              <TrendingUp size={18} className="text-emerald-600" />
            ) : (
              <TrendingDown size={18} className="text-red-600" />
            )}
            <div>
              <p className="text-xs text-zinc-500">Balance</p>
              <p className={`font-bold text-sm ${shipment.excessOrDeficit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(shipment.excessOrDeficit)}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card shadow="none" className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent">
          <CardBody className="p-3 flex flex-row items-center gap-3">
            <CheckCircle size={18} className="text-blue-600" />
            <div>
              <p className="text-xs text-zinc-500">Paid Items</p>
              <p className="font-bold text-sm">
                {items.filter((i) => i.financeUpdate2 === "Paid").length}/{pagination.total}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <TextInput
          placeholder="Search vendors..."
          startContent={<Search size={18} className="text-zinc-400" />}
          className="sm:max-w-xs"
          value={searchValue}
          onValueChange={setSearchValue}
          isClearable
        />
        <SelectInput
          label=""
          placeholder="Approval"
          className="sm:max-w-[180px]"
          selectedKeys={[currentStatus]}
          onSelectionChange={(keys) => handleFilter("status", Array.from(keys)[0] as string)}
        >
          <SelectItem key="all">All Approvals</SelectItem>
          <SelectItem key="Final Release">Final Release</SelectItem>
          <SelectItem key="Approved to Release">Approved to Release</SelectItem>
          <SelectItem key="Pending Final Approval">Pending</SelectItem>
          <SelectItem key="Suspended">Suspended</SelectItem>
          <SelectItem key="On Hold">On Hold</SelectItem>
        </SelectInput>
        <SelectInput
          label=""
          placeholder="Payment"
          className="sm:max-w-[180px]"
          selectedKeys={[currentPaymentStatus]}
          onSelectionChange={(keys) => handleFilter("paymentStatus", Array.from(keys)[0] as string)}
        >
          <SelectItem key="all">All Payments</SelectItem>
          <SelectItem key="Paid">Paid</SelectItem>
          <SelectItem key="Not Paid">Not Paid</SelectItem>
          <SelectItem key="Bank Feedback Pending">Bank Pending</SelectItem>
        </SelectInput>
      </div>

      {/* Inline-editable Table */}
      <SectionCard>
        <DataTable
          columns={columns}
          totalPages={pagination.totalPages}
          removeWrapper
          emptyContent={{ title: "No items found", subtext: "Adjust your filters" }}
        >
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.vendor}
                  </p>
                  {item.description && (
                    <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <InlineAmountCell
                  itemId={item.id}
                  field="amountUSD"
                  value={item.amountUSD}
                />
              </TableCell>
              <TableCell>
                <InlineSelectCell
                  itemId={item.id}
                  field="approvalStatus"
                  value={item.approvalStatus}
                  options={approvalOptions}
                  colorMap={approvalColorMap}
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
