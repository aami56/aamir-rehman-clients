import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { DollarSign, CreditCard, TrendingDown, AlertCircle, PieChart } from "lucide-react";

export default function Reconciliation() {
  useCurrency();

  const { data: agingData = [], isLoading: agingLoading } = useQuery<any[]>({
    queryKey: ["/api/billing/aging"],
  });

  const { data: reconData = [], isLoading: reconLoading } = useQuery<any[]>({
    queryKey: ["/api/billing/reconciliation"],
  });

  const totalOutstanding = agingData.reduce((sum: number, b: any) => sum + b.total, 0);
  const totalPaid = reconData.reduce((sum: number, r: any) => sum + r.total, 0);

  const getAgingColor = (bucket: string) => {
    if (bucket.includes("0-15")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (bucket.includes("16-30")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (bucket.includes("31-60")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header title="Payment Reconciliation" subtitle="Track payments by method and aging buckets" />
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Total Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reconData.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Aging Buckets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agingLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : agingData.length > 0 ? (
                  <div className="space-y-3">
                    {agingData.map((bucket: any) => (
                      <div key={bucket.bucket} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                          <Badge className={getAgingColor(bucket.bucket)}>
                            {bucket.bucket}
                          </Badge>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="font-semibold">{formatCurrency(bucket.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No outstanding invoices</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reconLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : reconData.length > 0 ? (
                  <div className="space-y-3">
                    {reconData.map((method: any) => {
                      const percentage = totalPaid > 0 ? ((method.total / totalPaid) * 100).toFixed(1) : "0";
                      return (
                        <div key={method.method} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{method.method}</span>
                            <span className="font-semibold">{formatCurrency(method.total)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>{method.count} payment{method.count !== 1 ? 's' : ''}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8">No payment data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
