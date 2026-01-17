import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Check, X, Plus, CreditCard, TrendingUp, AlertCircle, Banknote, FileText, Printer, Download, MessageCircle, Mail, Send, Loader2, Link2 } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Billing } from "@shared/schema";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface BillingTabProps {
  clientId: number;
  defaultAmount?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  contactPerson?: string;
}

interface ProfileSettings {
  fullName: string;
  email: string;
  company: string;
}

export function BillingTab({ clientId, defaultAmount = "1500", clientName = "", clientEmail = "", clientAddress = "", contactPerson = "" }: BillingTabProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceBilling, setInvoiceBilling] = useState<Billing | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMethod, setShareMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [customWhatsApp, setCustomWhatsApp] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const [bulkAmount, setBulkAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<"auto" | "manual">("auto");
  const [manualSelectedMonths, setManualSelectedMonths] = useState<{ month: number; year: number }[]>([]);
  const [manualPaymentYear, setManualPaymentYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useCurrency();

  const profile: ProfileSettings = (() => {
    const saved = localStorage.getItem("profile");
    return saved ? JSON.parse(saved) : {
      fullName: "Aamir Rehman",
      email: "aamir@example.com",
      company: "Aamir Rehman Digital Marketing"
    };
  })();

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

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = invoiceRef.current;
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
    }
  };

  const handleDownloadInvoicePDF = async () => {
    if (!invoiceBilling) return;
    setIsGeneratingPdf(true);
    try {
      const element = invoiceRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const invoiceNumber = `INV-${invoiceBilling.year}${String(invoiceBilling.month).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;
      pdf.save(`${invoiceNumber}.pdf`);
      toast({ title: "Success", description: "PDF downloaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoiceBilling) return;
    const phone = customWhatsApp.replace(/\D/g, '');
    if (!phone) {
      toast({ title: "Error", description: "Please enter a valid WhatsApp number", variant: "destructive" });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await generatePdfBlob();
      if (pdfBlob) {
        const invoiceNumber = `INV-${invoiceBilling.year}${String(invoiceBilling.month).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;
        const pdfFile = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Invoice ${invoiceNumber}`,
            text: `Invoice for ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}. Amount: ${formatCurrency(parseFloat(invoiceBilling.amount))}`
          });
          toast({ title: "Success", description: "Invoice shared successfully" });
        } else {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `${invoiceNumber}.pdf`;
          link.click();
          URL.revokeObjectURL(pdfUrl);
          
          toast({ 
            title: "PDF Downloaded", 
            description: "Now attach the downloaded PDF to your WhatsApp message" 
          });
          
          setTimeout(() => {
            const message = encodeURIComponent(`Hi, please find the invoice ${invoiceNumber} for ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}. Amount: ${formatCurrency(parseFloat(invoiceBilling.amount))}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
          }, 500);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: "Error", description: "Failed to share PDF", variant: "destructive" });
      }
    } finally {
      setIsGeneratingPdf(false);
      setShowShareDialog(false);
    }
  };

  const handleShareEmail = async () => {
    if (!invoiceBilling) return;
    if (!customEmail || !customEmail.includes('@')) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await generatePdfBlob();
      if (pdfBlob) {
        const invoiceNumber = `INV-${invoiceBilling.year}${String(invoiceBilling.month).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;
        const pdfFile = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Invoice ${invoiceNumber}`,
            text: `Invoice for ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}. Amount: ${formatCurrency(parseFloat(invoiceBilling.amount))}`
          });
          toast({ title: "Success", description: "Invoice shared successfully" });
        } else {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `${invoiceNumber}.pdf`;
          link.click();
          URL.revokeObjectURL(pdfUrl);
          
          toast({ 
            title: "PDF Downloaded", 
            description: "Now attach the downloaded PDF to your email" 
          });
          
          setTimeout(() => {
            const subject = encodeURIComponent(`Invoice ${invoiceNumber} - ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}`);
            const body = encodeURIComponent(`Hi,\n\nPlease find attached the invoice ${invoiceNumber} for ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}.\n\nAmount: ${formatCurrency(parseFloat(invoiceBilling.amount))}\n\nThank you for your business!\n\n${profile.company}`);
            window.open(`mailto:${customEmail}?subject=${subject}&body=${body}`, '_self');
          }, 500);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: "Error", description: "Failed to share PDF", variant: "destructive" });
      }
    } finally {
      setIsGeneratingPdf(false);
      setShowShareDialog(false);
    }
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

  const toggleManualMonth = (month: number, year: number) => {
    setManualSelectedMonths(prev => {
      const exists = prev.find(m => m.month === month && m.year === year);
      if (exists) {
        return prev.filter(m => !(m.month === month && m.year === year));
      }
      return [...prev, { month, year }].sort((a, b) => 
        a.year === b.year ? a.month - b.month : a.year - b.year
      );
    });
  };

  const handleManualPayment = async () => {
    const amount = parseFloat(bulkAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    if (manualSelectedMonths.length === 0) {
      toast({ title: "Error", description: "Please select at least one month", variant: "destructive" });
      return;
    }

    let remainingAmount = amount;
    const monthsProcessed: string[] = [];
    
    try {
      for (const selected of manualSelectedMonths) {
        if (remainingAmount <= 0) break;
        
        const existingBilling = billingData.find(b => b.month === selected.month && b.year === selected.year);
        const alreadyPaid = existingBilling ? parseFloat(existingBilling.paidAmount || "0") : 0;
        const monthTotal = existingBilling ? parseFloat(existingBilling.amount) : monthlyCharge;
        const stillNeeded = monthTotal - alreadyPaid;
        const monthName = `${getMonthName(selected.month).slice(0, 3)}'${String(selected.year).slice(-2)}`;
        
        if (remainingAmount >= stillNeeded) {
          if (existingBilling) {
            await apiRequest("PUT", `/api/billing/${existingBilling.id}`, {
              isPaid: true,
              paidAmount: monthTotal.toString(),
              paidDate: new Date(paymentDate).toISOString(),
            });
          } else {
            await apiRequest("POST", `/api/clients/${clientId}/billing`, {
              month: selected.month,
              year: selected.year,
              amount: defaultAmount,
              paidAmount: monthTotal.toString(),
              isPaid: true,
              paidDate: new Date(paymentDate).toISOString(),
            });
          }
          remainingAmount -= stillNeeded;
          monthsProcessed.push(monthName);
        } else if (remainingAmount > 0) {
          const newPaidAmount = alreadyPaid + remainingAmount;
          if (existingBilling) {
            await apiRequest("PUT", `/api/billing/${existingBilling.id}`, {
              paidAmount: newPaidAmount.toString(),
            });
          } else {
            await apiRequest("POST", `/api/clients/${clientId}/billing`, {
              month: selected.month,
              year: selected.year,
              amount: defaultAmount,
              paidAmount: newPaidAmount.toString(),
              isPaid: false,
            });
          }
          monthsProcessed.push(`${monthName} (partial)`);
          remainingAmount = 0;
        }
      }

      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/billing`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Payment Applied",
        description: `Applied to: ${monthsProcessed.join(", ")}${remainingAmount > 0 ? ` | Unused: ${formatCurrency(remainingAmount)}` : ''}`,
      });
      
      setShowBulkPaymentDialog(false);
      setBulkAmount("");
      setManualSelectedMonths([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to apply payment", variant: "destructive" });
    }
  };

  const manualPaymentPreview = useMemo(() => {
    let amount = parseFloat(bulkAmount) || 0;
    const monthsInfo: { name: string; amount: number; isPartial: boolean }[] = [];
    let remaining = amount;
    
    for (const selected of manualSelectedMonths) {
      if (remaining <= 0) break;
      
      const existingBilling = billingData.find(b => b.month === selected.month && b.year === selected.year);
      const alreadyPaid = existingBilling ? parseFloat(existingBilling.paidAmount || "0") : 0;
      const monthTotal = existingBilling ? parseFloat(existingBilling.amount) : monthlyCharge;
      const stillNeeded = monthTotal - alreadyPaid;
      const monthName = `${getMonthName(selected.month).slice(0, 3)}'${String(selected.year).slice(-2)}`;
      
      if (remaining >= stillNeeded) {
        monthsInfo.push({ name: monthName, amount: stillNeeded, isPartial: false });
        remaining -= stillNeeded;
      } else {
        monthsInfo.push({ name: monthName, amount: remaining, isPartial: true });
        remaining = 0;
      }
    }
    
    const totalNeeded = manualSelectedMonths.reduce((sum, selected) => {
      const existingBilling = billingData.find(b => b.month === selected.month && b.year === selected.year);
      const alreadyPaid = existingBilling ? parseFloat(existingBilling.paidAmount || "0") : 0;
      const monthTotal = existingBilling ? parseFloat(existingBilling.amount) : monthlyCharge;
      return sum + (monthTotal - alreadyPaid);
    }, 0);
    
    return { monthsInfo, remaining, totalNeeded };
  }, [bulkAmount, manualSelectedMonths, billingData, monthlyCharge]);

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
                  <div className="mt-2 space-y-1">
                    {billing ? (
                      <>
                        <Button
                          variant={billing.isPaid ? "outline" : "default"}
                          size="sm"
                          className={`w-full text-xs ${billing.isPaid ? '' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                          onClick={() => handleTogglePayment(billing)}
                          disabled={togglePaymentMutation.isPending}
                        >
                          {billing.isPaid ? "Undo" : "Mark Paid"}
                        </Button>
                        {billing.isPaid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            onClick={() => {
                              setInvoiceBilling(billing);
                              setShowInvoiceDialog(true);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Invoice
                          </Button>
                        )}
                      </>
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
      <Dialog open={showBulkPaymentDialog} onOpenChange={(open) => {
        setShowBulkPaymentDialog(open);
        if (!open) {
          setManualSelectedMonths([]);
          setPaymentMode("auto");
        }
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Add Payment
            </DialogTitle>
            <DialogDescription>
              Choose to auto-distribute payment or manually select months.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={paymentMode} onValueChange={(v) => setPaymentMode(v as "auto" | "manual")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Auto Distribute</TabsTrigger>
              <TabsTrigger value="manual">Select Months</TabsTrigger>
            </TabsList>
            
            <TabsContent value="auto" className="space-y-4 pt-4">
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
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Year</Label>
                <Select value={manualPaymentYear.toString()} onValueChange={(v) => setManualPaymentYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Months</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isSelected = manualSelectedMonths.some(m => m.month === month && m.year === manualPaymentYear);
                    const existingBilling = billingData.find(b => b.month === month && b.year === manualPaymentYear);
                    const isPaid = existingBilling?.isPaid;
                    
                    return (
                      <div
                        key={month}
                        onClick={() => !isPaid && toggleManualMonth(month, manualPaymentYear)}
                        className={`p-2 text-center rounded-lg cursor-pointer transition-all text-sm ${
                          isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-not-allowed'
                            : isSelected 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {getMonthName(month).slice(0, 3)}
                        {isPaid && <Check className="w-3 h-3 inline ml-1" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {manualSelectedMonths.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Selected: </span>
                    {manualSelectedMonths.map(m => `${getMonthName(m.month).slice(0, 3)}'${String(m.year).slice(-2)}`).join(", ")}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Total needed: {formatCurrency(manualPaymentPreview.totalNeeded)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="manualAmount">Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="manualAmount"
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
                <Label htmlFor="manualPaymentDate">Payment Date</Label>
                <Input
                  id="manualPaymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              {parseFloat(bulkAmount) > 0 && manualSelectedMonths.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Payment Preview</h4>
                  <div className="space-y-1 text-sm">
                    {manualPaymentPreview.monthsInfo.map((m, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{m.name}{m.isPartial ? ' (partial)' : ''}:</span>
                        <span className="font-semibold">{formatCurrency(m.amount)}</span>
                      </div>
                    ))}
                    {manualPaymentPreview.remaining > 0 && (
                      <div className="flex justify-between text-amber-600 pt-2 border-t border-emerald-200">
                        <span>Unused amount:</span>
                        <span className="font-semibold">{formatCurrency(manualPaymentPreview.remaining)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={paymentMode === "auto" ? handleBulkPayment : handleManualPayment} 
              disabled={!bulkAmount || parseFloat(bulkAmount) <= 0 || (paymentMode === "manual" && manualSelectedMonths.length === 0)}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Apply Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Payment Invoice
            </DialogTitle>
          </DialogHeader>
          
          {invoiceBilling && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const printContent = document.getElementById('billing-invoice-content');
                    if (!printContent) return;
                    const printWindow = window.open('', '', 'width=800,height=600');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Invoice - ${getMonthName(invoiceBilling.month)} ${invoiceBilling.year}</title>
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; }
                            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                            .company-info h1 { font-size: 24px; color: #6366f1; margin-bottom: 8px; }
                            .company-info p { color: #64748b; font-size: 14px; }
                            .invoice-title { text-align: right; }
                            .invoice-title h2 { font-size: 32px; color: #1e293b; margin-bottom: 8px; }
                            .invoice-title p { color: #64748b; }
                            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; }
                            .meta-section h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
                            .meta-section p { font-size: 14px; color: #1e293b; }
                            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                            .invoice-table th { text-align: left; padding: 12px; background: #6366f1; color: white; font-size: 12px; text-transform: uppercase; }
                            .invoice-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
                            .invoice-table .amount { text-align: right; }
                            .totals { margin-left: auto; width: 300px; }
                            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
                            .totals-row.total { font-weight: bold; font-size: 18px; border-bottom: 2px solid #6366f1; }
                            .footer { margin-top: 60px; text-align: center; color: #64748b; font-size: 12px; }
                            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #16a34a; }
                          </style>
                        </head>
                        <body>
                          ${printContent.innerHTML}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleDownloadInvoicePDF}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download PDF
                </Button>
                <Button 
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => { 
                    setCustomWhatsApp('');
                    setShareMethod('whatsapp'); 
                    setShowShareDialog(true); 
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp + PDF
                </Button>
                <Button 
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => { 
                    setCustomEmail(clientEmail || '');
                    setShareMethod('email'); 
                    setShowShareDialog(true); 
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email + PDF
                </Button>
                <Button 
                  variant="outline"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  onClick={() => {
                    if (invoiceBilling) {
                      const url = `${window.location.origin}/invoice/${clientId}/${invoiceBilling.month}/${invoiceBilling.year}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "Link Copied!", description: "Invoice link copied to clipboard" });
                    }
                  }}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>

              <div 
                ref={invoiceRef}
                id="billing-invoice-content"
                className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
              >
                {/* Invoice Header */}
                <div className="invoice-header flex justify-between items-start mb-6">
                  <div className="company-info">
                    <h1 className="text-xl font-bold text-indigo-600 mb-1">{profile.company}</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{profile.fullName}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{profile.email}</p>
                  </div>
                  <div className="invoice-title text-right">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">INVOICE</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      INV-{invoiceBilling.year}{String(invoiceBilling.month).padStart(2, '0')}{String(clientId).padStart(3, '0')}
                    </p>
                    <span className="status-badge mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      PAID
                    </span>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="invoice-meta grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 text-sm">
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1 font-semibold">Bill To</h3>
                    <p className="font-semibold text-slate-900 dark:text-white">{clientName || `Client #${clientId}`}</p>
                    {contactPerson && <p className="text-slate-600 dark:text-slate-400">{contactPerson}</p>}
                    {clientEmail && <p className="text-slate-600 dark:text-slate-400">{clientEmail}</p>}
                  </div>
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1 font-semibold">Payment Date</h3>
                    <p className="text-slate-900 dark:text-white">
                      {invoiceBilling.paidDate 
                        ? new Date(invoiceBilling.paidDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1 font-semibold">Billing Period</h3>
                    <p className="text-slate-900 dark:text-white flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {getMonthName(invoiceBilling.month)} {invoiceBilling.year}
                    </p>
                  </div>
                </div>

                {/* Invoice Table */}
                <table className="invoice-table w-full mb-6 text-sm">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="text-left p-2 rounded-tl-lg">Description</th>
                      <th className="text-center p-2">Qty</th>
                      <th className="text-right p-2">Rate</th>
                      <th className="text-right p-2 rounded-tr-lg">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="p-2">
                        <p className="font-medium text-slate-900 dark:text-white">Digital Marketing Services</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Monthly service - {getMonthName(invoiceBilling.month)} {invoiceBilling.year}</p>
                      </td>
                      <td className="text-center p-2 text-slate-900 dark:text-white">1</td>
                      <td className="text-right p-2 text-slate-900 dark:text-white">{formatCurrency(parseFloat(invoiceBilling.amount))}</td>
                      <td className="text-right p-2 font-medium text-slate-900 dark:text-white">{formatCurrency(parseFloat(invoiceBilling.amount))}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals */}
                <div className="totals ml-auto w-full md:w-64 text-sm">
                  <div className="totals-row flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                    <span className="text-slate-900 dark:text-white">{formatCurrency(parseFloat(invoiceBilling.amount))}</span>
                  </div>
                  <div className="totals-row flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-emerald-600">Amount Paid</span>
                    <span className="text-emerald-600">{formatCurrency(parseFloat(invoiceBilling.amount))}</span>
                  </div>
                  <div className="totals-row total flex justify-between py-2 border-b-2 border-indigo-600 font-bold">
                    <span className="text-slate-900 dark:text-white">Balance Due</span>
                    <span className="text-indigo-600">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Thank you for your business!</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs">
                    For questions, contact {profile.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {shareMethod === 'whatsapp' ? (
                <>
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  Send via WhatsApp
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 text-blue-500" />
                  Send via Email
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {shareMethod === 'whatsapp' 
                ? 'Enter the WhatsApp number to send the invoice' 
                : 'Enter the email address to send the invoice'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {shareMethod === 'whatsapp' ? (
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number-billing">WhatsApp Number</Label>
                <Input
                  id="whatsapp-number-billing"
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={customWhatsApp}
                  onChange={(e) => setCustomWhatsApp(e.target.value)}
                />
                <p className="text-xs text-slate-500">Include country code (e.g., +92 for Pakistan)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email-address-billing">Email Address</Label>
                <Input
                  id="email-address-billing"
                  type="email"
                  placeholder="client@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                />
              </div>
            )}

            {invoiceBilling && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">Invoice will be sent as PDF:</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Invoice for {clientName || `Client #${clientId}`}<br/>
                  Period: {getMonthName(invoiceBilling.month)} {invoiceBilling.year}<br/>
                  Amount: {formatCurrency(parseFloat(invoiceBilling.amount))}
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  On mobile devices, you can share the PDF directly. On desktop, the PDF will download and the app will open.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)} disabled={isGeneratingPdf}>Cancel</Button>
            <Button 
              onClick={shareMethod === 'whatsapp' ? handleShareWhatsApp : handleShareEmail}
              className={shareMethod === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isGeneratingPdf ? 'Generating PDF...' : 'Share PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
