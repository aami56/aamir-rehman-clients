import { Card, CardContent } from "@/components/ui/card";
import { Users, Megaphone, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    totalClients: number;
    activeCampaigns: number;
    monthlyRevenue: number;
    pendingPayments: number;
    overdueClients: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      change: "+12%",
      changeType: "positive" as const,
      icon: Users,
      color: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      change: "+8%",
      changeType: "positive" as const,
      icon: Megaphone,
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      change: "+15%",
      changeType: "positive" as const,
      icon: DollarSign,
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
    },
    {
      title: "Pending Payments",
      value: formatCurrency(stats.pendingPayments),
      change: `${stats.overdueClients} overdue clients`,
      changeType: "negative" as const,
      icon: AlertTriangle,
      color: "bg-red-100 dark:bg-red-900/30 text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card 
          key={card.title}
          className="glass-card hover-lift animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {card.value}
                </p>
                <p className={`text-sm mt-2 flex items-center ${
                  card.changeType === 'positive' 
                    ? 'text-emerald-600' 
                    : 'text-red-600'
                }`}>
                  {card.changeType === 'positive' && <TrendingUp className="w-4 h-4 mr-1" />}
                  {card.changeType === 'negative' && <AlertTriangle className="w-4 h-4 mr-1" />}
                  <span>{card.change}</span>
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
