import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Send, DollarSign, Calendar, FileText } from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatusBadgeClass, getCurrentMonthYear, getMonthName } from "@/lib/utils";
import type { Billing, Client } from "@shared/schema";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Get all billing records from all clients
  const getAllBilling = async () => {
    try {
      const allBilling = [];
      for (const client of (clients as any[])) {
        try {
          const response = await fetch(`/api/clients/${client.id}/billing`);
          if (response.ok) {
            const text = await response.text();
            if (text) {
              const billing = JSON.parse(text);
              allBilling.push(...billing.map((bill: Billing) => ({
                ...bill,
                clientName: client.name,
                clientEmail: client.email,
              })));
            }
          }
        } catch (error) {
          console.error(`Error fetching billing for client ${client.id}:`, error);
        }
      }
      return allBilling;
    } catch (error) {
      console.error('Error in getAllBilling:', error);
      return [];
    }
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/billing", clients],
    queryFn: getAllBilling,
    enabled: (clients as any[]).length > 0,
  });

  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "paid" && invoice.isPaid) ||
                         (statusFilter === "unpaid" && !invoice.isPaid);
    const matchesMonth = monthFilter === "all" || invoice.month.toString() === monthFilter;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);
  const paidAmount = invoices.filter((inv: any) => inv.isPaid).reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);
  const unpaidAmount = totalRevenue - paidAmount;
  const currentMonth = getCurrentMonthYear();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Invoices & Billing" 
          subtitle="Track payments and generate invoices" 
        />
        
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Paid Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(unpaidAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search invoices or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Generate Invoices
            </Button>
          </div>

          {/* Invoices List */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-48"></div>
                        <div className="h-4 bg-slate-100 rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice: any) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">{invoice.clientName}</h3>
                          <Badge className={getPaymentStatusBadgeClass(invoice.isPaid)}>
                            {invoice.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{getMonthName(invoice.month)} {invoice.year}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatCurrency(invoice.amount)}</span>
                          </div>
                          {invoice.invoiceNumber && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span>#{invoice.invoiceNumber}</span>
                            </div>
                          )}
                        </div>
                        {invoice.paidDate && (
                          <p className="text-sm text-green-600 mt-2">
                            Paid on {formatDate(invoice.paidDate)}
                          </p>
                        )}
                        {invoice.notes && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                            {invoice.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        {!invoice.isPaid && (
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {searchQuery || statusFilter !== "all" || monthFilter !== "all"
                    ? "No invoices match your search criteria"
                    : "No invoices found"
                  }
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  Invoices are generated from client billing records
                </p>
                <Button variant="outline">
                  Go to Clients
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}