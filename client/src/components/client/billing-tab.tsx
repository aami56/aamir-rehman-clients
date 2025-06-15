import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Check, X, Plus } from "lucide-react";
import { formatCurrency, getMonthName, getCurrentMonthYear, getPaymentStatusBadgeClass } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Billing } from "@shared/schema";

interface BillingTabProps {
  clientId: number;
}

export function BillingTab({ clientId }: BillingTabProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: billingData = [], isLoading } = useQuery<Billing[]>({
    queryKey: [`/api/clients/${clientId}/billing`],
  });

  const togglePaymentMutation = useMutation({
    mutationFn: async ({ billingId, isPaid }: { billingId: number; isPaid: boolean }) => {
      const response = await apiRequest("PUT", `/api/billing/${billingId}`, {
        isPaid,
        paidDate: isPaid ? new Date().toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/billing`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: async ({ month, year, amount }: { month: number; year: number; amount: string }) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/billing`, {
        month,
        year,
        amount,
        isPaid: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/billing`] });
      toast({
        title: "Success",
        description: "Billing record created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create billing record",
        variant: "destructive",
      });
    },
  });

  // Generate billing data for the selected year
  const yearlyBilling = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const existing = billingData.find(b => b.month === month && b.year === selectedYear);
    return {
      month,
      year: selectedYear,
      monthName: getMonthName(month),
      billing: existing || null,
    };
  });

  const totalPaid = billingData
    .filter(b => b.year === selectedYear && b.isPaid)
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalUnpaid = billingData
    .filter(b => b.year === selectedYear && !b.isPaid)
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const paidMonths = billingData.filter(b => b.year === selectedYear && b.isPaid).length;
  const unpaidMonths = billingData.filter(b => b.year === selectedYear && !b.isPaid).length;

  const handleTogglePayment = (billing: Billing) => {
    togglePaymentMutation.mutate({
      billingId: billing.id,
      isPaid: !billing.isPaid,
    });
  };

  const handleCreateBilling = (month: number) => {
    // For demo purposes, using a default amount - in real app, this would come from client's monthly charge
    createBillingMutation.mutate({
      month,
      year: selectedYear,
      amount: "1500.00", // This should come from client data
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-4"></div>
                <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-12 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <X className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Unpaid</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Paid Months</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{paidMonths}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Unpaid Months</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{unpaidMonths}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Monthly Billing - {selectedYear}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(selectedYear - 1)}
          >
            {selectedYear - 1}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(selectedYear + 1)}
          >
            {selectedYear + 1}
          </Button>
        </div>
      </div>

      {/* Monthly Billing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {yearlyBilling.map(({ month, monthName, billing }) => (
          <Card key={month} className="hover-lift transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {monthName}
                </CardTitle>
                {billing ? (
                  <Badge className={getPaymentStatusBadgeClass(billing.isPaid)}>
                    {billing.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                ) : (
                  <Badge variant="outline">No Record</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {billing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(billing.amount)}
                    </p>
                    {billing.isPaid && billing.paidDate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Paid: {new Date(billing.paidDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={billing.isPaid ? "destructive" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleTogglePayment(billing)}
                    disabled={togglePaymentMutation.isPending}
                  >
                    {billing.isPaid ? "Mark Unpaid" : "Mark Paid"}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCreateBilling(month)}
                  disabled={createBillingMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Billing
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
