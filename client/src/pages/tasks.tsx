import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: todayTasks = [], isLoading: loadingToday } = useQuery<any[]>({
    queryKey: ["/api/tasks/today"],
  });

  const { data: overdueTasks = [], isLoading: loadingOverdue } = useQuery<any[]>({
    queryKey: ["/api/tasks/overdue"],
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/notes/${id}`, { isCompleted: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
      toast({ title: "Task completed" });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "normal": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "low": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const TaskCard = ({ task }: { task: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.isCompleted}
            onCheckedChange={() => completeMutation.mutate(task.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{task.title}</h4>
              <Badge className={getPriorityColor(task.priority || "normal")} variant="secondary">
                {task.priority || "normal"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {task.type || "task"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{task.content}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              {task.clientName && (
                <Link href={`/client/${task.clientId}`}>
                  <span className="hover:text-primary cursor-pointer">{task.clientName}</span>
                </Link>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header title="Tasks & Reminders" subtitle="Manage your daily tasks and follow-ups" />
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Today's Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayTasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">0</div>
              </CardContent>
            </Card>
          </div>

          {overdueTasks.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Overdue Tasks ({overdueTasks.length})
              </h3>
              <div className="space-y-3">
                {overdueTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Today's Tasks ({todayTasks.length})
            </h3>
            {loadingToday ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : todayTasks.length > 0 ? (
              <div className="space-y-3">
                {todayTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-slate-500">All caught up! No tasks for today.</p>
                <p className="text-sm text-slate-400 mt-2">
                  Create tasks from client notes to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
