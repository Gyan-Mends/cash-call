import { useLoaderData, Link } from "react-router";
import { Card, CardBody, Chip } from "@heroui/react";
import {
  DollarSign,
  Ship,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Wrench,
  ArrowRight,
} from "lucide-react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import type { Route } from "./+types/dashboard";

interface DashboardData {
  shipments: {
    id: string;
    shipmentNumber: string;
    revenue: number;
    expectedRevenue: number;
    totalExpenses: number;
    excessOrDeficit: number;
    itemCount: number;
    paidCount: number;
    pendingCount: number;
  }[];
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    totalPaid: number;
    totalPending: number;
    totalItems: number;
    paidItems: number;
    pendingItems: number;
  };
  criticalSpares: {
    total: number;
    bySection: { section: string; count: number; totalUSD: number }[];
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { Shipment, CashCallItem } = await import("~/server/db/models/Shipment");
  const { CriticalSpare } = await import("~/server/db/models/CriticalSpare");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) {
    return { shipments: [], totals: { totalRevenue: 0, totalExpenses: 0, totalPaid: 0, totalPending: 0, totalItems: 0, paidItems: 0, pendingItems: 0 }, criticalSpares: { total: 0, bySection: [] } };
  }

  await connectDB();

  const shipments = await Shipment.find().sort({ shipmentNumber: 1 });

  const shipmentData = await Promise.all(
    shipments.map(async (s) => {
      const items = await CashCallItem.find({ shipment: s._id });
      const paidCount = items.filter((i) => i.financeUpdate2 === "Paid").length;
      const pendingCount = items.length - paidCount;
      return {
        id: s._id.toString(),
        shipmentNumber: s.shipmentNumber,
        revenue: s.revenue,
        expectedRevenue: s.expectedRevenue,
        totalExpenses: s.totalExpenses,
        excessOrDeficit: s.excessOrDeficit,
        itemCount: items.length,
        paidCount,
        pendingCount,
      };
    })
  );

  const allItems = await CashCallItem.find();
  const paidItems = allItems.filter((i) => i.financeUpdate2 === "Paid");
  const totalPaid = paidItems.reduce((s, i) => s + i.amountUSD, 0);
  const totalPending = allItems.filter((i) => i.financeUpdate2 !== "Paid").reduce((s, i) => s + i.amountUSD, 0);

  const criticalSparesAgg = await CriticalSpare.aggregate([
    { $group: { _id: "$section", count: { $sum: 1 }, totalUSD: { $sum: "$usdEquivalent" } } },
    { $sort: { _id: 1 } },
  ]);

  const criticalSparesTotal = await CriticalSpare.countDocuments();

  return {
    shipments: shipmentData,
    totals: {
      totalRevenue: shipmentData.reduce((s, d) => s + d.expectedRevenue, 0),
      totalExpenses: shipmentData.reduce((s, d) => s + d.totalExpenses, 0),
      totalPaid,
      totalPending,
      totalItems: allItems.length,
      paidItems: paidItems.length,
      pendingItems: allItems.length - paidItems.length,
    },
    criticalSpares: {
      total: criticalSparesTotal,
      bySection: criticalSparesAgg.map((a) => ({
        section: a._id,
        count: a.count,
        totalUSD: a.totalUSD,
      })),
    },
  } satisfies DashboardData;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  label,
  value,
  icon,
  color = "default",
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: "success" | "warning" | "danger" | "default" | "primary";
  subtext?: string;
}) {
  const colorClasses = {
    success: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    danger: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
    primary: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  };

  return (
    <Card shadow="none" className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtext}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { shipments, totals, criticalSpares } = useLoaderData<typeof loader>() as DashboardData;

  return (
    <FadeUpPageEntry>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Finance Cash Call Overview
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totals.totalRevenue)}
          icon={<DollarSign size={20} />}
          color="success"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totals.totalExpenses)}
          icon={<TrendingDown size={20} />}
          color="danger"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(totals.totalPaid)}
          icon={<CheckCircle size={20} />}
          color="primary"
          subtext={`${totals.paidItems} of ${totals.totalItems} items`}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(totals.totalPending)}
          icon={<Clock size={20} />}
          color="warning"
          subtext={`${totals.pendingItems} items pending`}
        />
      </div>

      {/* Shipments Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Shipments
          </h2>
          <Link
            to="/shipments"
            className="text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shipments.map((s) => (
            <Link key={s.id} to={`/shipments/${s.id}`}>
              <Card
                shadow="none"
                isPressable
                className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Ship size={16} className="text-amber-600" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Shipment {s.shipmentNumber}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Revenue</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(s.expectedRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Expenses</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(s.totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2">
                      <span className="text-zinc-500">Balance</span>
                      <span
                        className={`font-semibold ${
                          s.excessOrDeficit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {s.excessOrDeficit >= 0 ? (
                          <TrendingUp size={12} className="inline mr-1" />
                        ) : (
                          <TrendingDown size={12} className="inline mr-1" />
                        )}
                        {formatCurrency(Math.abs(s.excessOrDeficit))}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Chip size="sm" variant="flat" color="success" classNames={{ content: "text-xs" }}>
                        {s.paidCount} paid
                      </Chip>
                      <Chip size="sm" variant="flat" color="warning" classNames={{ content: "text-xs" }}>
                        {s.pendingCount} pending
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Critical Spares Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Critical Spares
          </h2>
          <Link
            to="/critical-spares"
            className="text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {criticalSpares.bySection.map((section) => (
            <Card
              key={section.section}
              shadow="none"
              className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent"
            >
              <CardBody className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={16} className="text-amber-600" />
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {section.section}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Items</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {section.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total (USD)</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(section.totalUSD)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </FadeUpPageEntry>
  );
}
