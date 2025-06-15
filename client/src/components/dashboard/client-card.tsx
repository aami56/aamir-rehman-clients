import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageCircle, ArrowRight, User } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, getStatusBadgeClass } from "@/lib/utils";
import type { Client } from "@shared/schema";

interface ClientCardProps {
  client: Client;
  campaignCount?: number;
  animationDelay?: number;
}

export function ClientCard({ client, campaignCount = 0, animationDelay = 0 }: ClientCardProps) {
  const handleContact = (type: 'phone' | 'email' | 'whatsapp') => {
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

  return (
    <Card 
      className="glass-card hover-lift animate-slide-up cursor-pointer"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {client.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {client.industry || 'General'}
              </p>
            </div>
          </div>
          <Badge className={getStatusBadgeClass(client.status)}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Charge</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatCurrency(client.monthlyServiceCharge)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Contact Person</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {client.contactPerson || 'Not specified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Active Campaigns</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {campaignCount}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleContact('phone')}
                className="p-2 text-slate-400 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleContact('email')}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                title="Email"
              >
                <Mail className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleContact('whatsapp')}
                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
            <Link href={`/client/${client.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 font-medium flex items-center space-x-1"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
