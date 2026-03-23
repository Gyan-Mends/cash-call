import { useLoaderData, Link } from "react-router";
import { Card, CardBody, Chip, Progress } from "@heroui/react";
import {
  Ship,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import FadeUpPageEntry from "~/components/ui/animated-entry";
import type { Route } from "./+types/shipment-list";

interface ShipmentListItem {
  id: string;
  shipmentNumber: string;
  revenue: number;
  expectedRevenue: number;
  totalExpenses: number;
  excessOrDeficit: number;
  itemCount: number;
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getAuthSession } = await import("~/config/auth-session");
  const { connectDB } = await import("~/server/db/connection");
  const { Shipment, CashCallItem } = await import("~/server/db/models/Shipment");

  const authSession = await getAuthSession(request.headers.get("Cookie"));
  const auth = authSession.get("auth");
  if (!auth?.access_token) return { shipments: [] };

  await connectDB();

  const shipments = await Shipment.find().sort({ shipmentNumber: 1 });

  const shipmentData = await Promise.all(
    shipments.map(async (s) => {
      const items = await CashCallItem.find({ shipment: s._id });
      const paidItems = items.filter((i) => i.financeUpdate2 === "Paid");
      const paidCount = paidItems.length;
      const totalPaid = paidItems.reduce((sum, i) => sum + i.amountUSD, 0);
      return {
        id: s._id.toString(),
        shipmentNumber: s.shipmentNumber,
        revenue: s.revenue,
        expectedRevenue: s.expectedRevenue,
        totalExpenses: s.totalExpenses,
        excessOrDeficit: s.excessOrDeficit,
        itemCount: items.length,
        paidCount,
        pendingCount: items.length - paidCount,
        totalPaid,
      };
    })
  );

  return { shipments: shipmentData };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ShipmentListPage() {
  const { shipments } = useLoaderData<typeof loader>() as {
    shipments: ShipmentListItem[];
  };

  return (
    <FadeUpPageEntry>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Shipments
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cash call tracking by shipment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shipments.map((s) => {
          const paymentProgress =
            s.itemCount > 0 ? (s.paidCount / s.itemCount) * 100 : 0;

          return (
            <Link key={s.id} to={`/shipments/${s.id}`}>
              <Card
                shadow="none"
                isPressable
                className="border-1.5 border-zinc-300 dark:border-zinc-700 bg-transparent hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <CardBody className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/30">
                        <Ship size={20} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                          Shipment {s.shipmentNumber}
                        </h3>
                        <p className="text-xs text-zinc-500">{s.itemCount} vendor items</p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        s.excessOrDeficit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {s.excessOrDeficit >= 0 ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}
                      {formatCurrency(Math.abs(s.excessOrDeficit))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Revenue</p>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(s.expectedRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Expenses</p>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(s.totalExpenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Paid</p>
                      <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.totalPaid)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Payment Progress</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {s.paidCount}/{s.itemCount}
                      </span>
                    </div>
                    <Progress
                      value={paymentProgress}
                      size="sm"
                      color="warning"
                      classNames={{
                        track: "dark:bg-zinc-800",
                      }}
                    />
                    <div className="flex gap-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color="success"
                        classNames={{ content: "text-xs" }}
                      >
                        {s.paidCount} paid
                      </Chip>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="warning"
                        classNames={{ content: "text-xs" }}
                      >
                        {s.pendingCount} pending
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {shipments.length === 0 && (
        <div className="text-center py-20">
          <DollarSign
            size={48}
            className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4"
          />
          <p className="text-zinc-500 dark:text-zinc-400">No shipments found</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            Run the seed script to import data from the Excel file
          </p>
        </div>
      )}
    </FadeUpPageEntry>
  );
}
