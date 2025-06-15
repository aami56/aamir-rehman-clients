import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Mail, MessageCircle, Globe, MapPin, User, Building2 } from "lucide-react";
import { formatCurrency, getStatusBadgeClass, formatPhoneNumber } from "@/lib/utils";
import { ClientForm } from "@/components/client/client-form";
import { BillingTab } from "@/components/client/billing-tab";
import { CampaignsTab } from "@/components/client/campaigns-tab";
import { NotesTab } from "@/components/client/notes-tab";
import { HistoryTab } from "@/components/client/history-tab";
import type { Client } from "@shared/schema";

export default function ClientDetail() {
  const params = useParams();
  const clientId = parseInt(params.id as string);

  const { data: client, isLoading, error } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const handleContact = (type: 'phone' | 'email' | 'whatsapp') => {
    if (!client) return;
    
    switch (type) {
      case 'phone':
        window.open(`tel:${client.phone}`, '_self');
        break;
      case 'email':
        window.open(`mailto:${client.email}`, '_self');
        break;
      case 'whatsapp':
        const phone = client.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}`, '_blank');
        break;
    }
  };

  const handleWebsiteVisit = () => {
    if (client?.website) {
      const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
      window.open(url, '_blank');
    }
  };

  if (error) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header title="Client Not Found" />
          <div className="p-8">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <div className="text-red-500 mb-4">
                  <User className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Client Not Found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  The client you're looking for doesn't exist or has been deleted.
                </p>
                <Link href="/">
                  <Button className="bg-primary hover:bg-primary/90">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title={isLoading ? "Loading..." : client?.name || "Client Details"} 
          subtitle="Manage client information, billing, and campaigns" 
        />
        
        <div className="p-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {isLoading ? (
            /* Loading State */
            <div className="space-y-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : client ? (
            <>
              {/* Client Header Card */}
              <Card className="glass-card mb-8 hover-lift">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-6 lg:space-y-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {client.name}
                        </h1>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadgeClass(client.status)}>
                            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                          </Badge>
                          <span className="text-slate-500 dark:text-slate-400">•</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {client.industry || 'General'}
                          </span>
                        </div>
                        {client.contactPerson && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {client.contactPerson}
                          </p>
                        )}
                        {client.address && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {client.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      {/* Contact Buttons */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContact('phone')}
                          className="text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {formatPhoneNumber(client.phone)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContact('email')}
                          className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-600"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContact('whatsapp')}
                          className="text-slate-600 dark:text-slate-300 hover:text-green-600 hover:border-green-600"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                        {client.website && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleWebsiteVisit}
                            className="text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-600"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Website
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Charge</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(client.monthlyServiceCharge)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Google Ads ID</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {client.googleAdAccountId || 'Not set'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Client Since</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {new Date(client.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabbed Content */}
              <Card className="glass-card">
                <Tabs defaultValue="overview" className="w-full">
                  <div className="border-b border-slate-200 dark:border-slate-700 px-6">
                    <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-transparent">
                      <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Billing
                      </TabsTrigger>
                      <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Campaigns
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Notes
                      </TabsTrigger>
                      <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6">
                    <TabsContent value="overview" className="mt-0">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Client Information
                          </h3>
                        </div>
                        <ClientForm client={client} />
                      </div>
                    </TabsContent>

                    <TabsContent value="billing" className="mt-0">
                      <BillingTab clientId={clientId} />
                    </TabsContent>

                    <TabsContent value="campaigns" className="mt-0">
                      <CampaignsTab clientId={clientId} />
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0">
                      <NotesTab clientId={clientId} />
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                      <HistoryTab clientId={clientId} />
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
