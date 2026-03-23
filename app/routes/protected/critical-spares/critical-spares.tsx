import {
  useLoaderData,
  useSearchParams,
  useNavigation,
  useActionData,
  Form,
} from "react-router";
import {
  Button,
  Chip,
  SelectItem,
  addToast,
  TableRow,
  TableCell,
  Tab,
  Tabs,
  Card,
  CardBody,
} from "@heroui/react";
import { Search, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import { DataTable } from "~/components/heroui/data-table";
import { TextInput } from "~/components/heroui/inputs";
import { SelectInput } from "~/components/heroui/select-inputs";
import { SideDrawer } from "~/components/heroui/side-drawer";
import { useDebounce } from "~/hooks/useDebounce";
import SectionCard from "~/components/fragments/section-card";
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sectionCounts: { section: string; count: number; totalUSD: number }[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { CriticalSpare } = await import("~/server/db/models/CriticalSpare");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) {
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, sectionCounts: [] };
  }

  await connectDB();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
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
  if (section && section !== "all") {
    filter.section = section;
  }
  if (finance2 && finance2 !== "all") {
    filter.financeUpdate2 = finance2;
  }

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

      if (!itemId || !field || !value) {
        return { success: false, message: "Missing required fields" };
      }

      const allowedFields = [
        "financeUpdate1",
        "hqUpdate",
        "financeUpdate2",
        "supplyChainUpdate",
      ];
      if (!allowedFields.includes(field)) {
        return { success: false, message: "Invalid field" };
      }

      await CriticalSpare.findByIdAndUpdate(itemId, { [field]: value });
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

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

function getFinance2Color(status: string) {
  if (/paid/i.test(status)) return "success";
  if (/bank/i.test(status) || /pending/i.test(status)) return "warning";
  return "default";
}

function getHQColor(status: string) {
  if (/processed to bank/i.test(status)) return "warning";
  if (/processed/i.test(status)) return "success";
  if (/not/i.test(status)) return "danger";
  return "default";
}

export default function CriticalSparesPage() {
  const { items, pagination, sectionCounts } =
    useLoaderData<typeof loader>() as LoaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchValue, 500);
  const currentSection = searchParams.get("section") || "all";
  const currentFinance2 = searchParams.get("finance2") || "all";

  const [selectedItem, setSelectedItem] = useState<CriticalSpareData | null>(null);
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

  const handleTabChange = (key: React.Key) => {
    handleFilter("section", key as string);
  };

  const columns = [
    "Equipment",
    "Vendor",
    "PO",
    "Amount",
    "USD Equiv.",
    "ETA",
    "HQ",
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
          Engineering critical order list
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
          onSelectionChange={(keys) =>
            handleFilter("section", Array.from(keys)[0] as string)
          }
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
          onSelectionChange={(keys) =>
            handleFilter("finance2", Array.from(keys)[0] as string)
          }
        >
          <SelectItem key="all">All Payments</SelectItem>
          <SelectItem key="Paid">Paid</SelectItem>
          <SelectItem key="Bank Clearance Pending">Bank Pending</SelectItem>
          <SelectItem key="N/A">N/A</SelectItem>
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
              title: "No critical spares found",
              subtext: "Adjust your filters or run the seed script",
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
                  <div className="max-w-[180px]">
                    <p className="font-medium truncate">{item.vendor}</p>
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
                  <span className="font-semibold text-xs">
                    {formatCurrency(item.usdEquivalent)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-500 max-w-[100px] truncate block">
                    {item.eta || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getHQColor(item.hqUpdate)}
                    classNames={{ content: "text-xs" }}
                  >
                    {item.hqUpdate || "-"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={getFinance2Color(item.financeUpdate2)}
                    classNames={{ content: "text-xs" }}
                  >
                    {item.financeUpdate2 || "-"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-500 max-w-[120px] truncate block">
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
            <Wrench size={48} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500">No critical spares found</p>
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
                  <p className="font-medium text-sm truncate">{item.vendor}</p>
                  <p className="text-xs text-zinc-500 truncate">{item.equipment || item.description}</p>
                </div>
                <span className="font-bold text-sm ml-2">
                  {formatCurrency(item.usdEquivalent)}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Chip size="sm" variant="flat" color="default" classNames={{ content: "text-xs" }}>
                  {item.section}
                </Chip>
                <Chip size="sm" variant="flat" color={getFinance2Color(item.financeUpdate2)} classNames={{ content: "text-xs" }}>
                  {item.financeUpdate2 || "Pending"}
                </Chip>
                {item.eta && (
                  <Chip size="sm" variant="flat" color="warning" classNames={{ content: "text-xs" }}>
                    {item.eta.substring(0, 20)}
                  </Chip>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedItem(null);
        }}
        title="Critical Spare Details"
      >
        {selectedItem && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Vendor</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedItem.vendor}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Section</p>
                <Chip size="sm" variant="flat" color="default">
                  {selectedItem.section}
                </Chip>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Equipment</p>
                <p className="text-sm">{selectedItem.equipment || "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Description</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {selectedItem.description || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">Purchase Order</p>
              <p className="text-sm font-mono">{selectedItem.purchaseOrder || "-"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Amount</p>
                <p className="font-bold">{formatAmount(selectedItem.amount, selectedItem.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">USD Equivalent</p>
                <p className="font-bold text-lg">{formatCurrency(selectedItem.usdEquivalent)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 uppercase mb-1">ETA</p>
              <p className="text-sm">{selectedItem.eta || "-"}</p>
            </div>

            {selectedItem.supplyChainUpdate && (
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Supply Chain</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedItem.supplyChainUpdate}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Finance Update 1</p>
                <p className="text-sm">{selectedItem.financeUpdate1 || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">HQ Update</p>
                <Chip size="sm" variant="flat" color={getHQColor(selectedItem.hqUpdate)}>
                  {selectedItem.hqUpdate || "-"}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-1">Finance Update 2</p>
                <Chip size="sm" variant="flat" color={getFinance2Color(selectedItem.financeUpdate2)}>
                  {selectedItem.financeUpdate2 || "-"}
                </Chip>
              </div>
              {selectedItem.paymentDate && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Payment Date</p>
                  <p className="text-sm">{selectedItem.paymentDate}</p>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <p className="text-xs text-zinc-500 uppercase mb-3 font-semibold">
                Update Status
              </p>

              <Form method="post" className="flex flex-col gap-3">
                <input type="hidden" name="intent" value="updateStatus" />
                <input type="hidden" name="itemId" value={selectedItem.id} />
                <input type="hidden" name="field" value="financeUpdate2" />
                <SelectInput
                  name="value"
                  label="Payment Status"
                  defaultSelectedKeys={selectedItem.financeUpdate2 ? [selectedItem.financeUpdate2] : []}
                >
                  <SelectItem key="Paid">Paid</SelectItem>
                  <SelectItem key="Not Paid">Not Paid</SelectItem>
                  <SelectItem key="Bank Clearance Pending">Bank Clearance Pending</SelectItem>
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
                  defaultSelectedKeys={selectedItem.hqUpdate ? [selectedItem.hqUpdate] : []}
                >
                  <SelectItem key="Processed">Processed</SelectItem>
                  <SelectItem key="Not Processed">Not Processed</SelectItem>
                  <SelectItem key="Processed To Bank">Processed To Bank</SelectItem>
                  <SelectItem key="Processed to Bank">Processed to Bank</SelectItem>
                  <SelectItem key="Bank Clearance Pending">Bank Clearance Pending</SelectItem>
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
