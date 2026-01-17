import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Printer, Calendar, Building2 } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import type { Client, Billing } from "@shared/schema";

interface InvoiceTabProps {
  clientId: number;
  client: Client;
}

interface ProfileSettings {
  fullName: string;
  email: string;
  company: string;
}

export function InvoiceTab({ clientId, client }: InvoiceTabProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    return `INV-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;
  });
  const [showPreview, setShowPreview] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  useCurrency();

  const profile: ProfileSettings = (() => {
    const saved = localStorage.getItem("profile");
    return saved ? JSON.parse(saved) : {
      fullName: "Aamir Rehman",
      email: "aamir@example.com",
      company: "Aamir Rehman Digital Marketing"
    };
  })();

  const { data: billingData = [] } = useQuery<Billing[]>({
    queryKey: [`/api/clients/${clientId}/billing`],
  });

  const selectedBilling = billingData.find(
    b => b.month === selectedMonth && b.year === selectedYear
  );

  const amount = selectedBilling 
    ? parseFloat(selectedBilling.amount) 
    : parseFloat(client.monthlyServiceCharge);

  const paidAmount = selectedBilling?.paidAmount 
    ? parseFloat(selectedBilling.paidAmount) 
    : 0;

  const remainingAmount = amount - paidAmount;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1)
  }));

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const generateInvoiceNumber = () => {
    const newNum = `INV-${selectedYear}${String(selectedMonth).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;
    setInvoiceNumber(newNum);
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoiceNumber}</title>
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
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-paid { background: #dcfce7; color: #16a34a; }
            .status-partial { background: #dbeafe; color: #2563eb; }
            .status-unpaid { background: #fee2e2; color: #dc2626; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const getPaymentStatus = () => {
    if (!selectedBilling) return { text: 'Not Billed', class: 'status-unpaid' };
    if (selectedBilling.isPaid) return { text: 'Paid', class: 'status-paid' };
    if (paidAmount > 0) return { text: 'Partial', class: 'status-partial' };
    return { text: 'Unpaid', class: 'status-unpaid' };
  };

  const status = getPaymentStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Invoice Generator
        </h3>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => { setSelectedMonth(parseInt(v)); generateInvoiceNumber(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(parseInt(v)); generateInvoiceNumber(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => setShowPreview(true)} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>

          {showPreview && (
            <>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <div 
                ref={invoiceRef}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 shadow-sm"
              >
                {/* Invoice Header */}
                <div className="invoice-header flex justify-between items-start mb-8">
                  <div className="company-info">
                    <h1 className="text-2xl font-bold text-indigo-600 mb-2">{profile.company}</h1>
                    <p className="text-slate-600 dark:text-slate-400">{profile.fullName}</p>
                    <p className="text-slate-600 dark:text-slate-400">{profile.email}</p>
                  </div>
                  <div className="invoice-title text-right">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">INVOICE</h2>
                    <p className="text-slate-600 dark:text-slate-400">{invoiceNumber}</p>
                    <span className={`status-badge ${status.class} mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold`}>
                      {status.text}
                    </span>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="invoice-meta grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900 rounded-lg p-6 mb-8">
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2 font-semibold">Bill To</h3>
                    <p className="font-semibold text-slate-900 dark:text-white">{client.name}</p>
                    {client.contactPerson && <p className="text-slate-600 dark:text-slate-400 text-sm">{client.contactPerson}</p>}
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{client.email}</p>
                    {client.address && <p className="text-slate-600 dark:text-slate-400 text-sm">{client.address}</p>}
                  </div>
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2 font-semibold">Invoice Date</h3>
                    <p className="text-slate-900 dark:text-white">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2 mt-4 font-semibold">Due Date</h3>
                    <p className="text-slate-900 dark:text-white">
                      {new Date(selectedYear, selectedMonth, 15).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="meta-section">
                    <h3 className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2 font-semibold">Billing Period</h3>
                    <p className="text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {getMonthName(selectedMonth)} {selectedYear}
                    </p>
                  </div>
                </div>

                {/* Invoice Table */}
                <table className="invoice-table w-full mb-8">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="text-left p-3 rounded-tl-lg">Description</th>
                      <th className="text-center p-3">Quantity</th>
                      <th className="text-right p-3">Rate</th>
                      <th className="text-right p-3 rounded-tr-lg">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="p-3">
                        <p className="font-medium text-slate-900 dark:text-white">Digital Marketing Services</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Monthly service fee for {getMonthName(selectedMonth)} {selectedYear}</p>
                      </td>
                      <td className="text-center p-3 text-slate-900 dark:text-white">1</td>
                      <td className="text-right p-3 text-slate-900 dark:text-white">{formatCurrency(amount)}</td>
                      <td className="text-right p-3 font-medium text-slate-900 dark:text-white">{formatCurrency(amount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals */}
                <div className="totals ml-auto w-full md:w-80">
                  <div className="totals-row flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                    <span className="text-slate-900 dark:text-white">{formatCurrency(amount)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <div className="totals-row flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-emerald-600">Amount Paid</span>
                      <span className="text-emerald-600">- {formatCurrency(paidAmount)}</span>
                    </div>
                  )}
                  <div className="totals-row total flex justify-between py-3 border-b-2 border-indigo-600 font-bold text-lg">
                    <span className="text-slate-900 dark:text-white">
                      {paidAmount > 0 ? 'Balance Due' : 'Total Due'}
                    </span>
                    <span className="text-indigo-600">{formatCurrency(remainingAmount > 0 ? remainingAmount : amount)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Thank you for your business!</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs">
                    For questions regarding this invoice, please contact {profile.email}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
