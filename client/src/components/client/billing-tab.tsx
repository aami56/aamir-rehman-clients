import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, Check, X, Plus, CreditCard, TrendingUp, AlertCircle, Banknote } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Billing } from "@shared/schema";

interface BillingTabProps {
  clientId: number;
  defaultAmount?: string;
}

export function BillingTab({ clientId, defaultAmount = "1500" }: BillingTabProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const [bulkAmount, setBulkAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useCurrency();

  const monthlyCharge = parseFloat(defaultAmount) || 1500;

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
      toast({ title: "Success", description: "Payment status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: async ({ month, year, amount, isPaid, paidDate }: { month: number; year: number; amount: string; isPaid?: boolean; paidDate?: string }) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/billing`, {
        month,
        year,
        amount,
        isPaid: isPaid || false,
        paidDate: paidDate ? new Date(paidDate).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/billing`] });
      toast({ title: "Success", description: "Billing record created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create", variant: "destructive" });
    },
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const yearlyBilling = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const existing = billingData.find(b => b.month === month && b.year === selectedYear);
      const isCurrentOrPast = selectedYear < currentYear || (selectedYear === currentYear && month <= currentMonth);
      
      return {
        month,
        year: selectedYear,
        monthName: getMonthName(month),
        billing: existing || null,
        isCurrentOrPast,
      };
    });
  }, [billingData, selectedYear, currentMonth, currentYear]);

  const unpaidPastMonths = yearlyBilling.filter(m => m.isCurrentOrPast && (!m.billing || !m.billing.isPaid));
  const futureMonths = yearlyBilling.filter(m => !m.isCurrentOrPast && (!m.billing || !m.billing.isPaid));
  const allUnpaidMonths = [...unpaidPastMonths, ...futureMonths];
  const paidMonths = yearlyBilling.filter(m => m.billing?.isPaid);
  
  const totalPaid = billingData
    .filter(b => b.year === selectedYear && b.isPaid)
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const totalUnpaid = unpaidPastMonths.reduce((sum, m) => {
    if (m.billing && !m.billing.isPaid) {
      return sum + parseFloat(m.billing.amount);
    } else if (!m.billing && m.isCurrentOrPast) {
      return sum + monthlyCharge;
    }
    return sum;
  }, 0);

  const openAddBillingDialog = (month: number) => {
    setSelectedMonth(month);
    setCustomAmount(defaultAmount);
    setShowAddDialog(true);
  };

  const handleCreateBilling = () => {
    if (selectedMonth === null) return;
    createBillingMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      amount: customAmount,
    });
    setShowAddDialog(false);
  };

  const handleBulkPayment = async () => {
    const amount = parseFloat(bulkAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    if (allUnpaidMonths.length === 0) {
      toast({ title: "Info", description: "No unpaid months to apply payment to", variant: "default" });
      return;
    }

    let remainingAmount = amount;
    const monthsProcessed: string[] = [];
    
    try {
      for (const monthData of allUnpaidMonths) {
        if (remainingAmount <= 0) break;
        
        const alreadyPaid = monthData.billing ? parseFloat(monthData.billing.paidAmount || "0") : 0;
        const monthTotal = monthData.billing ? parseFloat(monthData.billing.amount) : monthlyCharge;
        const stillNeeded = monthTotal - alreadyPaid;
        
        if (remainingAmount >= stillNeeded) {
          // Can fully pay this month
          if (monthData.billing) {
            await apiRequest("PUT", `/api/billing/${monthData.billing.id}`, {
              isPaid: true,
              paidAmount: monthTotal.toString(),
              paidDate: new Date(paymentDate).toISOString(),
            });
          } else {
            await apiRequest("POST", `/api/clients/${clientId}/billing`, {
              month: monthData.month,
              year: monthData.year,
              amount: defaultAmount,
              paidAmount: monthTotal.toString(),
              isPaid: true,
              paidDate: new Date(paymentDate).toISOString(),
            });
          }
          remainingAmount -= stillNeeded;
          monthsProcessed.push(`${monthData.monthName.slice(0, 3)}'${String(monthData.year).slice(-2)}`);
        } else if (remainingAmount > 0) {
          // Partial payment for this month
          const newPaidAmount = alreadyPaid + remainingAmount;
          if (monthData.billing) {
            await apiRequest("PUT", `/api/billing/${monthData.billing.id}`, {
              paidAmount: newPaidAmount.toString(),
            });
          } else {
            await apiRequest("POST", `/api/clients/${clientId}/billing`, {
              month: monthData.month,
              year: monthData.year,
              amount: defaultAmount,
              paidAmount: newPaidAmount.toString(),
              isPaid: false,
            });
          }
          monthsProcessed.push(`${monthData.monthName.slice(0, 3)}'${String(monthData.year).slice(-2)} (partial)`);
          remainingAmount = 0;
        }
      }

      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/billing`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Payment Applied",
        description: `Applied to: ${monthsProcessed.join(", ")}`,
      });
      
      setShowBulkPaymentDialog(false);
      setBulkAmount("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply payment", variant: "destructive" });
    }
  };

  const handleTogglePayment = (billing: Billing) => {
    togglePaymentMutation.mutate({
      billingId: billing.id,
      isPaid: !billing.isPaid,
    });
  };

  const bulkPaymentPreview = useMemo(() => {
    let amount = parseFloat(bulkAmount) || 0;
    const monthsInfo: { name: string; amount: number; isPartial: boolean }[] = [];
    let totalMonthsFullyPaid = 0;
    let partialMonth: { name: string; paid: number; remaining: number } | null = null;
    
    for (const monthData of allUnpaidMonths) {
      if (amount <= 0) break;
      
      const alreadyPaid = monthData.billing ? parseFloat(monthData.billing.paidAmount || "0") : 0;
      const monthTotal = monthData.billing ? parseFloat(monthData.billing.amount) : monthlyCharge;
      const stillNeeded = monthTotal - alreadyPaid;
      const monthName = `${monthData.monthName.slice(0, 3)}'${String(monthData.year).slice(-2)}`;
      
      if (amount >= stillNeeded) {
        monthsInfo.push({ name: monthName, amount: stillNeeded, isPartial: false });
        totalMonthsFullyPaid++;
        amount -= stillNeeded;
      } else {
        monthsInfo.push({ name: monthName, amount: amount, isPartial: true });
        partialMonth = { name: monthName, paid: alreadyPaid + amount, remaining: monthTotal - (alreadyPaid + amount) };
        amount = 0;
      }
    }
    
    const monthNames = monthsInfo.map(m => m.isPartial ? `${m.name} (partial)` : m.name).join(", ");
    return { monthsCount: totalMonthsFullyPaid, monthNames, partialMonth, monthsInfo };
  }, [bulkAmount, monthlyCharge, allUnpaidMonths]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Outstanding</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{formatCurrency(totalUnpaid)}</p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Paid Months</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{paidMonths.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Unpaid</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{unpaidPastMonths.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Billing - {selectedYear}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSelectedYear(selectedYear - 1)}>
              ← {selectedYear - 1}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedYear(selectedYear + 1)}>
              {selectedYear + 1} →
            </Button>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowBulkPaymentDialog(true)}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
        >
          <Banknote className="w-4 h-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Monthly Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {yearlyBilling.map(({ month, monthName, billing, isCurrentOrPast }) => {
          const isPaid = billing?.isPaid;
          const isFuture = !isCurrentOrPast;
          const totalAmount = billing ? parseFloat(billing.amount) : monthlyCharge;
          const paidAmount = billing ? parseFloat(billing.paidAmount || "0") : 0;
          const remainingAmount = totalAmount - paidAmount;
          const hasPartialPayment = paidAmount > 0 && !isPaid;
          
          return (
            <Card 
              key={month} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                isPaid 
                  ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border-emerald-300 dark:border-emerald-700' 
                  : hasPartialPayment
                    ? 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-300 dark:border-blue-700'
                  : isFuture 
                    ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60'
                    : 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-800 border-red-300 dark:border-red-700'
              }`}
            >
              {isPaid && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-emerald-500 border-l-[40px] border-l-transparent">
                  <Check className="absolute -top-[32px] right-[4px] w-4 h-4 text-white" />
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {monthName.slice(0, 3)}
                  </span>
                  {isPaid ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">
                      Paid
                    </Badge>
                  ) : hasPartialPayment ? (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
                      Partial
                    </Badge>
                  ) : isFuture ? (
                    <Badge variant="outline" className="text-xs">Future</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                      Unpaid
                    </Badge>
                  )}
                </div>
                
                {hasPartialPayment ? (
                  <div className="mb-2">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(remainingAmount)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      remaining of {formatCurrency(totalAmount)}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {formatCurrency(totalAmount)}
                  </p>
                )}
                
                {billing?.isPaid && billing.paidDate && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                    {new Date(billing.paidDate).toLocaleDateString()}
                  </p>
                )}
                
                {!isFuture && (
                  <div className="mt-2">
                    {billing ? (
                      <Button
                        variant={billing.isPaid ? "outline" : "default"}
                        size="sm"
                        className={`w-full text-xs ${billing.isPaid ? '' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                        onClick={() => handleTogglePayment(billing)}
                        disabled={togglePaymentMutation.isPending}
                      >
                        {billing.isPaid ? "Undo" : "Mark Paid"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => openAddBillingDialog(month)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Single Billing Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Billing Record</DialogTitle>
            <DialogDescription>
              {selectedMonth ? getMonthName(selectedMonth) : ""} {selectedYear}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBilling} disabled={!customAmount || createBillingMutation.isPending}>
              Add Billing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Dialog */}
      <Dialog open={showBulkPaymentDialog} onOpenChange={setShowBulkPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Add Payment
            </DialogTitle>
            <DialogDescription>
              Enter the total amount received. It will be automatically distributed across unpaid months.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Monthly Charge:</span>
                <span className="font-semibold">{formatCurrency(monthlyCharge)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Unpaid Months:</span>
                <span className="font-semibold text-red-600">{unpaidPastMonths.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Available for advance:</span>
                <span className="font-semibold text-blue-600">{futureMonths.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkAmount">Payment Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="bulkAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  className="pl-10 text-lg"
                  placeholder="Enter amount received"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {parseFloat(bulkAmount) > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Payment Preview</h4>
                <div className="space-y-2 text-sm">
                  {bulkPaymentPreview.monthsCount > 0 && (
                    <div className="flex justify-between">
                      <span>Months fully paid:</span>
                      <span className="font-semibold">{bulkPaymentPreview.monthsCount}</span>
                    </div>
                  )}
                  {bulkPaymentPreview.monthNames && (
                    <div className="flex justify-between">
                      <span>Applies to:</span>
                      <span className="font-medium text-emerald-600">{bulkPaymentPreview.monthNames}</span>
                    </div>
                  )}
                  {bulkPaymentPreview.partialMonth && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700">
                      <div className="flex justify-between text-blue-600">
                        <span>Next month ({bulkPaymentPreview.partialMonth.name}) will need:</span>
                        <span className="font-semibold">{formatCurrency(bulkPaymentPreview.partialMonth.remaining)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleBulkPayment} 
              disabled={!bulkAmount || parseFloat(bulkAmount) <= 0}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Apply Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
