import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Printer, Loader2 } from "lucide-react";
import { formatCurrency, getMonthName } from "@/lib/utils";
import type { Client, Billing } from "@shared/schema";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ProfileSettings {
  fullName: string;
  email: string;
  company: string;
}

export default function PublicInvoice() {
  const params = useParams();
  const clientId = parseInt(params.clientId || "0");
  const month = parseInt(params.month || "1");
  const year = parseInt(params.year || new Date().getFullYear().toString());
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const profile: ProfileSettings = {
    fullName: "Aamir Rehman",
    email: "aamir@example.com",
    company: "Aamir Rehman Digital Marketing"
  };

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: clientId > 0,
  });

  const { data: billingData = [], isLoading: billingLoading } = useQuery<Billing[]>({
    queryKey: [`/api/clients/${clientId}/billing`],
    enabled: clientId > 0,
  });

  const billing = billingData.find(b => b.month === month && b.year === year);
  const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}${String(clientId).padStart(3, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('public-invoice-content');
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
      pdf.save(`${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (clientLoading || billingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Card className="p-8">
          <p className="text-red-500">Invoice not found</p>
        </Card>
      </div>
    );
  }

  const amount = billing ? parseFloat(billing.amount) : parseFloat(client.monthlyServiceCharge);
  const paidAmount = billing?.paidAmount ? parseFloat(billing.paidAmount) : 0;
  const isPaid = billing?.isPaid || false;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
        </div>

        <Card id="public-invoice-content" className="bg-white shadow-lg">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-indigo-600 mb-2">{profile.company}</h1>
                <p className="text-slate-600">{profile.fullName}</p>
                <p className="text-slate-600">{profile.email}</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">INVOICE</h2>
                <p className="text-slate-600">{invoiceNumber}</p>
                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  isPaid 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : paidAmount > 0 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {isPaid ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 mb-8">
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-1 font-semibold">Bill To</h3>
                <p className="font-semibold text-slate-900">{client.name}</p>
                {client.contactPerson && <p className="text-slate-600 text-sm">{client.contactPerson}</p>}
                {client.email && <p className="text-slate-600 text-sm">{client.email}</p>}
              </div>
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-1 font-semibold">Invoice Date</h3>
                <p className="text-slate-900">
                  {billing?.paidDate 
                    ? new Date(billing.paidDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  }
                </p>
              </div>
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-1 font-semibold">Billing Period</h3>
                <p className="text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getMonthName(month)} {year}
                </p>
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="text-left p-3 rounded-tl-lg">Description</th>
                  <th className="text-center p-3">Qty</th>
                  <th className="text-right p-3">Rate</th>
                  <th className="text-right p-3 rounded-tr-lg">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-3">
                    <p className="font-medium text-slate-900">Digital Marketing Services</p>
                    <p className="text-xs text-slate-600">Monthly service - {getMonthName(month)} {year}</p>
                  </td>
                  <td className="text-center p-3 text-slate-900">1</td>
                  <td className="text-right p-3 text-slate-900">{formatCurrency(amount)}</td>
                  <td className="text-right p-3 font-medium text-slate-900">{formatCurrency(amount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="ml-auto w-64">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(amount)}</span>
              </div>
              {paidAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-emerald-600">Amount Paid</span>
                  <span className="text-emerald-600">{formatCurrency(paidAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b-2 border-indigo-600 font-bold">
                <span className="text-slate-900">Balance Due</span>
                <span className="text-indigo-600">{formatCurrency(amount - paidAmount)}</span>
              </div>
            </div>

            <div className="mt-12 pt-4 border-t border-slate-200 text-center">
              <p className="text-slate-600 text-sm mb-1">Thank you for your business!</p>
              <p className="text-slate-500 text-xs">
                For questions, contact {profile.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
