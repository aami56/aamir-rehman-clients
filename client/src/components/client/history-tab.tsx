import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  CreditCard, 
  Megaphone, 
  FileText, 
  Upload,
  UserPlus,
  DollarSign,
  PlayCircle,
  PauseCircle,
  Edit,
  Trash2,
  Calendar
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ActivityLog } from "@shared/schema";

interface HistoryTabProps {
  clientId: number;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'client_created':
      return UserPlus;
    case 'client_updated':
      return Edit;
    case 'client_deleted':
      return Trash2;
    case 'billing_created':
    case 'billing_updated':
    case 'billing_deleted':
      return CreditCard;
    case 'campaign_created':
    case 'campaign_updated':
    case 'campaign_deleted':
      return Megaphone;
    case 'note_created':
    case 'note_updated':
    case 'note_deleted':
      return FileText;
    case 'file_uploaded':
    case 'file_deleted':
      return Upload;
    default:
      return Calendar;
  }
};

const getActivityColor = (action: string) => {
  if (action.includes('created') || action.includes('uploaded')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (action.includes('updated')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
  if (action.includes('deleted')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    'client_created': 'Client Created',
    'client_updated': 'Client Updated',
    'client_deleted': 'Client Deleted',
    'billing_created': 'Billing Created',
    'billing_updated': 'Billing Updated',
    'billing_deleted': 'Billing Deleted',
    'campaign_created': 'Campaign Created',
    'campaign_updated': 'Campaign Updated',
    'campaign_deleted': 'Campaign Deleted',
    'note_created': 'Note Created',
    'note_updated': 'Note Updated',
    'note_deleted': 'Note Deleted',
    'file_uploaded': 'File Uploaded',
    'file_deleted': 'File Deleted',
  };
  return labels[action] || action.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export function HistoryTab({ clientId }: HistoryTabProps) {
  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/clients/${clientId}/activity`],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-4 animate-pulse">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityLog[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">
          <Calendar className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-medium">No activity history</p>
          <p className="text-sm">Client activity will appear here as actions are performed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Activity History
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Complete timeline of all client interactions and changes
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {sortedDates.map((date) => {
          const dateActivities = groupedActivities[date];
          const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          return (
            <div key={date} className="space-y-4">
              {/* Date Header */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                <Badge variant="outline" className="px-3 py-1">
                  {formattedDate}
                </Badge>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>

              {/* Activities for this date */}
              <div className="space-y-3">
                {dateActivities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.action);
                  const isLast = index === dateActivities.length - 1;

                  return (
                    <Card key={activity.id} className="relative hover-lift transition-all duration-200">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-8 top-16 w-0.5 h-full bg-slate-200 dark:bg-slate-700 -z-10"></div>
                      )}
                      
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {activity.description}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className={getActivityColor(activity.action)}>
                                    {getActionLabel(activity.action)}
                                  </Badge>
                                  {activity.entityType && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {activity.entityType}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap ml-4">
                                {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </div>

                            {/* Metadata */}
                            {activity.metadata && (
                              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  Changes:
                                </p>
                                <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More (if needed) */}
      {activities.length > 20 && (
        <div className="text-center pt-6">
          <Badge variant="outline" className="px-4 py-2">
            Showing recent {activities.length} activities
          </Badge>
        </div>
      )}
    </div>
  );
}
