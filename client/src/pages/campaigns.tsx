import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Calendar, DollarSign, Target, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate, getStatusBadgeClass } from "@/lib/utils";
import type { Campaign, Client } from "@shared/schema";

export default function Campaigns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Get all campaigns from all clients
  const getAllCampaigns = async () => {
    try {
      const allCampaigns = [];
      for (const client of (clients as any[])) {
        try {
          const response = await fetch(`/api/clients/${client.id}/campaigns`);
          if (response.ok) {
            const text = await response.text();
            if (text) {
              const campaigns = JSON.parse(text);
              allCampaigns.push(...campaigns.map((campaign: Campaign) => ({
                ...campaign,
                clientName: client.name,
              })));
            }
          }
        } catch (error) {
          console.error(`Error fetching campaigns for client ${client.id}:`, error);
        }
      }
      return allCampaigns;
    } catch (error) {
      console.error('Error in getAllCampaigns:', error);
      return [];
    }
  };

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns", clients],
    queryFn: getAllCampaigns,
    enabled: (clients as any[]).length > 0,
  });

  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || campaign.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const platforms = Array.from(new Set(campaigns.map((c: any) => c.platform)));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Campaigns" 
          subtitle="Monitor and manage all advertising campaigns" 
        />
        
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Active Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {campaigns.filter((c: any) => c.status === "active").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(campaigns.reduce((sum: number, c: any) => sum + parseFloat(c.budget), 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Platforms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platforms.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search campaigns or clients..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-100 rounded"></div>
                      <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign: any) => (
                <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {campaign.clientName}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeClass(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span>Budget</span>
                        </div>
                        <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-slate-400" />
                          <span>Platform</span>
                        </div>
                        <span className="font-medium">{campaign.platform}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Start Date</span>
                        </div>
                        <span className="font-medium">{formatDate(campaign.startDate)}</span>
                      </div>

                      {campaign.endDate && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>End Date</span>
                          </div>
                          <span className="font-medium">{formatDate(campaign.endDate)}</span>
                        </div>
                      )}

                      {campaign.description && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {campaign.description}
                          </p>
                        </div>
                      )}

                      <Button variant="outline" className="w-full">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        View Performance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {searchQuery || statusFilter !== "all" || platformFilter !== "all"
                    ? "No campaigns match your search criteria"
                    : "No campaigns found"
                  }
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  Campaigns are managed from individual client detail pages
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