import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SearchFilters } from "@/components/dashboard/search-filters";
import { ClientCard } from "@/components/dashboard/client-card";
import { ClientForm } from "@/components/client/client-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { debounce } from "@/lib/utils";
import type { Client } from "@shared/schema";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddClient, setShowAddClient] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/clients?${params}`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const handleAddClient = () => {
    setShowAddClient(true);
  };

  const handleGenerateInvoices = () => {
    // TODO: Generate invoices functionality
    console.log("Generate invoices clicked");
  };

  const defaultStats = {
    totalClients: 0,
    activeCampaigns: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    overdueClients: 0,
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Dashboard" 
          subtitle="Manage your clients and campaigns efficiently" 
        />
        
        <div className="p-8">
          <StatsCards stats={stats || defaultStats} />
          
          <SearchFilters
            searchQuery={searchQuery}
            onSearchChange={debouncedSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onAddClient={handleAddClient}
            onGenerateInvoices={handleGenerateInvoices}
          />

          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {clientsLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                        <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : clients.length > 0 ? (
              clients.map((client, index) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  animationDelay={index * 0.1}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-slate-400 mb-4">
                  <Plus className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">No clients found</p>
                  <p className="text-sm">Get started by adding your first client</p>
                </div>
                <Button onClick={handleAddClient} className="mt-4">
                  Add New Client
                </Button>
              </div>
            )}
          </div>

          {/* Load More */}
          {clients.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Load More Clients
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <Button
        onClick={handleAddClient}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 p-0"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSuccess={() => {
              setShowAddClient(false);
            }}
            onCancel={() => setShowAddClient(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
