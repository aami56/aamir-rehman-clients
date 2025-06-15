import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Play, Pause, MoreHorizontal, DollarSign, Calendar, Target } from "lucide-react";
import { formatCurrency, formatDate, getStatusBadgeClass } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCampaignSchema, type Campaign, type InsertCampaign } from "@shared/schema";

interface CampaignsTabProps {
  clientId: number;
}

const platforms = [
  "Google Ads",
  "Facebook Ads",
  "Instagram Ads",
  "LinkedIn Ads",
  "Twitter Ads",
  "TikTok Ads",
  "YouTube Ads",
  "Other"
];

export function CampaignsTab({ clientId }: CampaignsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: [`/api/clients/${clientId}/campaigns`],
  });

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      clientId,
      name: "",
      platform: "",
      budget: "0.00",
      startDate: new Date(),
      description: "",
      targetAudience: "",
      keywords: [],
      status: "active",
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/campaigns`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/campaigns`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/campaigns/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/campaigns`] });
      toast({
        title: "Success",
        description: "Campaign status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertCampaign) => {
    // Convert keywords string to array
    const keywordsArray = typeof data.keywords === 'string' 
      ? data.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : data.keywords || [];

    await createCampaignMutation.mutateAsync({
      ...data,
      keywords: keywordsArray,
    });
  };

  const handleStatusChange = (campaignId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateCampaignMutation.mutate({ id: campaignId, status: newStatus });
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.budget), 0);
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Campaigns</p>
                <p className="text-2xl font-bold text-emerald-600">{activeCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Budget</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Pause className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Paused Campaigns</p>
                <p className="text-2xl font-bold text-amber-600">{pausedCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Campaigns ({campaigns.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter campaign name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {platforms.map((platform) => (
                              <SelectItem key={platform} value={platform}>
                                {platform}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Age 25-45, Tech professionals" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="keyword1, keyword2, keyword3"
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Campaign description and goals" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCampaignMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-lift transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                      {campaign.name}
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {campaign.platform}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBadgeClass(campaign.status)}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(campaign.id, campaign.status)}
                      disabled={updateCampaignMutation.isPending}
                    >
                      {campaign.status === 'active' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Budget</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(campaign.budget)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Start Date</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(campaign.startDate)}
                    </span>
                  </div>

                  {campaign.targetAudience && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Target</span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 text-right">
                        {campaign.targetAudience}
                      </span>
                    </div>
                  )}

                  {campaign.description && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {campaign.description}
                      </p>
                    </div>
                  )}

                  {campaign.keywords && campaign.keywords.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {campaign.keywords.slice(0, 3).map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {campaign.keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{campaign.keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Target className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm">Create your first campaign to get started</p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="mt-4 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Campaign
          </Button>
        </div>
      )}
    </div>
  );
}
