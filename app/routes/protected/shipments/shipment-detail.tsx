import {
  useLoaderData,
  useSearchParams,
  useNavigation,
  useActionData,
  Form,
  Link,
} from "react-router";
import {
  Button,
  Chip,
  SelectItem,
  addToast,
  TableRow,
  TableCell,
  Card,
  CardBody,
} from "@heroui/react";
import {
  Search,
  ArrowLeft,
  Ship,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import { DataTable } from "~/components/heroui/data-table";
import { TextInput } from "~/components/heroui/inputs";
import { SelectInput } from "~/components/heroui/select-inputs";
import { SideDrawer } from "~/components/heroui/side-drawer";
import { useDebounce } from "~/hooks/useDebounce";
import SectionCard from "~/components/fragments/section-card";
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
  const limit = parseInt(url.searchParams.get("limit") || "20");
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
  if (status && status !== "all") {
    filter.approvalStatus = status;
  }
  if (paymentStatus && paymentStatus !== "all") {
    filter.financeUpdate2 = paymentStatus;
  }

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

      if (!itemId || !field || !value) {
        return { success: false, message: "Missing required fields" };
      }

      const allowedFields = [
        "approvalStatus",
        "financeUpdate1",
        "hqUpdate",
        "financeUpdate2",
        "supplyChainUpdate",
      ];
      if (!allowedFields.includes(field)) {
        return { success: false, message: "Invalid field" };
      }

      await CashCallItem.findByIdAndUpdate(itemId, { [field]: value });
      return { success: true, message: "Status updated successfully" };
    }

    return { success: false, message: "Invalid action" };
  } catch (error: any) {
    return { success: false, message: error?.message || "An error occurred" };
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getApprovalColor(status: string) {
  switch (status) {
    case "Final Release": return "success";
    case "Approved to Release": return "primary";
    case "Pending Final Approval": return "warning";
    case "Suspended": return "danger";
    case "On Hold": return "default";
    default: return "default";
  }
}

function getPaymentColor(status: string) {
  switch (status) {
    case "Paid": return "success";
    case "Not Paid": return "danger";
    case "Bank Feedback Pending": return "warning";
    default: return "default";
  }
}

function getHQColor(status: string) {
  switch (status) {
    case "Processed": return "success";
    case "Not Processed": return "danger";
    case "Processed To Bank": return "warning";
    default: return "default";
  }
}

export default function ShipmentDetailPage() {
  const { shipment, items, pagination } =
    useLoaderData<typeof loader>() as ShipmentDetailData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || ""
  );
  const debouncedSearch = useDebounce(searchValue, 500);
  const currentStatus = searchParams.get("status") || "all";
  const currentPaymentStatus = searchParams.get("paymentStatus") || "all";

  // Detail drawer
  const [selectedItem, setSelectedItem] = useState<CashCallItemData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  useEffect(() => {
    if (actionData && navigation.state === "idle") {
      if (actionData.success) {
        addToast({ title: actionData.message, color: "success" });
      } else {
        addToast({ title: actionData.message, color: "danger" });
      }
    }
  }, [actionData, navigation.state]);

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
    "Amount",
    "Approval",
    "Finance 1",
    "HQ",
    "Payment",
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
            {pagination.total} vendor items
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
          onSelectionChange={(keys) =>
            handleFilter("status", Array.from(keys)[0] as string)
          }
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
          onSelectionChange={(keys) =>
            handleFilter("paymentStatus", Array.from(keys)[0] as string)
          }
        >
          <SelectItem key="all">All Payments</SelectItem>
          <SelectItem key="Paid">Paid</SelectItem>
          <SelectItem key="Not Paid">Not Paid</SelectItem>
          <SelectItem key="Bank Feedback Pending">Bank Pending</SelectItem>
        </SelectInput>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <SectionCard>
          <DataTable
            columns={columns}
            totalPages={pagination.totalPages}
            removeWrapper
            emptyContent={{
              title: "No items found",
              subtext: "Adjust your filters",
            }}
          >
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedItem(item);
                  setDrawerOpen(true);
                }}
              >
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
                  <span className="font-semibold">
                    {formatCurrency(item.amountUSD)}
                  </span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getApprovalColor(item.approvalStatus)}
                    classNames={{ content: "text-xs font-medium" }}
                  >
                    {item.approvalStatus}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-xs">{item.financeUpdate1}</span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getHQColor(item.hqUpdate)}
                    classNames={{ content: "text-xs" }}
                  >
                    {item.hqUpdate}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getPaymentColor(item.financeUpdate2)}
                    classNames={{ content: "text-xs font-medium" }}
                  >
                    {item.financeUpdate2}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-500 max-w-[150px] truncate block">
                    {item.supplyChainUpdate || "-"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </SectionCard>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Ship size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500">No items found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              onClick={() => {
                setSelectedItem(item);
                setDrawerOpen(true);
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {item.vendor}
                  </p>
                  {item.description && (
                    <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                  )}
                </div>
                <span className="font-bold text-sm ml-2">
                  {formatCurrency(item.amountUSD)}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Chip size="sm" variant="flat" color={getApprovalColor(item.approvalStatus)} classNames={{ content: "text-xs" }}>
                  {item.approvalStatus}
                </Chip>
                <Chip size="sm" variant="flat" color={getPaymentColor(item.financeUpdate2)} classNames={{ content: "text-xs" }}>
                  {item.financeUpdate2}
                </Chip>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail / Update Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedItem(null);
        }}
        title="Cash Call Item"
      >
        {selectedItem && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Vendor</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedItem.vendor}
              </p>
            </div>

            {selectedItem.description && (
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Description</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedItem.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Amount (USD)</p>
                <p className="font-bold text-lg">{formatCurrency(selectedItem.amountUSD)}</p>
              </div>
              {selectedItem.instructionAmount && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Instruction Amt</p>
                  <p className="font-semibold">{formatCurrency(selectedItem.instructionAmount)}</p>
                </div>
              )}
            </div>

            {selectedItem.paymentDate && (
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Payment Date</p>
                <p className="text-sm">{selectedItem.paymentDate}</p>
              </div>
            )}

            {selectedItem.supplyChainUpdate && (
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Supply Chain Update</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedItem.supplyChainUpdate}
                </p>
              </div>
            )}

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <p className="text-xs text-zinc-500 uppercase mb-3 font-semibold">
                Update Status
              </p>

              <Form method="post" className="flex flex-col gap-3">
                <input type="hidden" name="intent" value="updateStatus" />
                <input type="hidden" name="itemId" value={selectedItem.id} />
                <input type="hidden" name="field" value="approvalStatus" />
                <SelectInput
                  name="value"
                  label="Approval Status"
                  defaultSelectedKeys={[selectedItem.approvalStatus]}
                >
                  <SelectItem key="Final Release">Final Release</SelectItem>
                  <SelectItem key="Approved to Release">Approved to Release</SelectItem>
                  <SelectItem key="Pending Final Approval">Pending Final Approval</SelectItem>
                  <SelectItem key="Suspended">Suspended</SelectItem>
                  <SelectItem key="On Hold">On Hold</SelectItem>
                  <SelectItem key="Provide Feedback">Provide Feedback</SelectItem>
                </SelectInput>
                <Button type="submit" size="sm" color="warning" variant="flat">
                  Update Approval
                </Button>
              </Form>

              <Form method="post" className="flex flex-col gap-3 mt-4">
                <input type="hidden" name="intent" value="updateStatus" />
                <input type="hidden" name="itemId" value={selectedItem.id} />
                <input type="hidden" name="field" value="financeUpdate2" />
                <SelectInput
                  name="value"
                  label="Payment Status"
                  defaultSelectedKeys={[selectedItem.financeUpdate2]}
                >
                  <SelectItem key="Paid">Paid</SelectItem>
                  <SelectItem key="Not Paid">Not Paid</SelectItem>
                  <SelectItem key="Bank Feedback Pending">Bank Feedback Pending</SelectItem>
                </SelectInput>
                <Button type="submit" size="sm" color="warning" variant="flat">
                  Update Payment
                </Button>
              </Form>

              <Form method="post" className="flex flex-col gap-3 mt-4">
                <input type="hidden" name="intent" value="updateStatus" />
                <input type="hidden" name="itemId" value={selectedItem.id} />
                <input type="hidden" name="field" value="hqUpdate" />
                <SelectInput
                  name="value"
                  label="HQ Update"
                  defaultSelectedKeys={[selectedItem.hqUpdate]}
                >
                  <SelectItem key="Processed">Processed</SelectItem>
                  <SelectItem key="Not Processed">Not Processed</SelectItem>
                  <SelectItem key="Processed To Bank">Processed To Bank</SelectItem>
                </SelectInput>
                <Button type="submit" size="sm" color="warning" variant="flat">
                  Update HQ
                </Button>
              </Form>
            </div>
          </div>
        )}
      </SideDrawer>
    </FadeUpPageEntry>
  );
}
