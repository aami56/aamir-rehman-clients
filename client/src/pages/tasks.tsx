import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Filter, MoreHorizontal, CheckCircle2, Clock, AlertTriangle,
  ListTodo, LayoutGrid, CalendarDays, BarChart3, Trash2, Copy, PauseCircle,
  ArrowUpCircle, ArrowDownCircle, ChevronRight, ChevronDown, Timer, Tag,
  Users, Target, Download, RefreshCw, Eye, X, Bell
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "todo", label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "waiting", label: "Waiting", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "review", label: "Review", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "done", label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600", icon: ArrowDownCircle },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-600", icon: ChevronRight },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-600", icon: ArrowUpCircle },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-600", icon: AlertTriangle },
];

const RECURRING_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  clientId: string;
  campaignId: string;
  assignedTo: string;
  dueDate: string;
  dueTime: string;
  labels: string;
  isRecurring: boolean;
  recurringPattern: string;
  timeEstimate: string;
  timeActual: string;
  slaDeadline: string;
  subtasks: { text: string; done: boolean }[];
  blockedBy: string;
  blocks: string;
}

const defaultForm: TaskFormData = {
  title: "", description: "", status: "todo", priority: "medium",
  clientId: "", campaignId: "", assignedTo: "", dueDate: "", dueTime: "",
  labels: "", isRecurring: false, recurringPattern: "", timeEstimate: "",
  timeActual: "", slaDeadline: "", subtasks: [], blockedBy: "", blocks: "",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState("myday");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [form, setForm] = useState<TaskFormData>({ ...defaultForm });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [showTaskDetail, setShowTaskDetail] = useState<any>(null);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [taskComments, setTaskComments] = useState<any[]>([]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPriority !== "all") params.set("priority", filterPriority);
    if (filterClient !== "all") params.set("clientId", filterClient);
    if (searchQuery) params.set("search", searchQuery);
    return params.toString();
  }, [filterStatus, filterPriority, filterClient, searchQuery]);

  const { data: allTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?${queryParams}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: stats } = useQuery<any>({ queryKey: ["/api/tasks/stats"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: campaignsList = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns/all"] });
  const { data: usersList = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: myDayTasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/my-day"] });
  const { data: overdueTasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/overdue"] });
  const { data: upcomingTasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/upcoming/7"] });
  const { data: agingReport = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/aging"] });
  const { data: completionRate = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/completion-rate"] });
  const { data: productivity = [] } = useQuery<any[]>({ queryKey: ["/api/tasks/productivity"] });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-day"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/upcoming/7"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/aging"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/completion-rate"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/productivity"] });
  };

  const loadComments = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { credentials: "include" });
      if (res.ok) setTaskComments(await res.json());
    } catch { }
  };

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      if (editingTask) loadComments(editingTask.id);
      setNewComment("");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setShowCreateDialog(false);
      setForm({ ...defaultForm });
      toast({ title: "Task created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setEditingTask(null);
      setForm({ ...defaultForm });
      toast({ title: "Task updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Task deleted" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/tasks/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Task duplicated" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      const res = await apiRequest("POST", "/api/tasks/bulk-status", { ids, status });
      return res.json();
    },
    onSuccess: (data) => {
      invalidateAll();
      setSelectedTasks([]);
      toast({ title: `${data.updated} tasks updated` });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: number; days: number }) => {
      const res = await apiRequest("POST", `/api/tasks/${id}/snooze`, { days });
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Task snoozed" });
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => invalidateAll(),
  });

  const handleSubmit = () => {
    const data: any = {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      clientId: form.clientId ? parseInt(form.clientId) : undefined,
      campaignId: form.campaignId ? parseInt(form.campaignId) : undefined,
      assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
      dueDate: form.dueDate || undefined,
      dueTime: form.dueTime || undefined,
      labels: form.labels ? form.labels.split(",").map(l => l.trim()).filter(Boolean) : undefined,
      isRecurring: form.isRecurring,
      recurringPattern: form.isRecurring ? form.recurringPattern : undefined,
      timeEstimate: form.timeEstimate ? parseInt(form.timeEstimate) : undefined,
      timeActual: form.timeActual ? parseInt(form.timeActual) : undefined,
      slaDeadline: form.slaDeadline || undefined,
      subtasks: form.subtasks.length > 0 ? form.subtasks : undefined,
      blockedBy: form.blockedBy ? parseInt(form.blockedBy) : undefined,
      blocks: form.blocks ? parseInt(form.blocks) : undefined,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setTaskComments([]);
    loadComments(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      clientId: task.clientId?.toString() || "",
      campaignId: task.campaignId?.toString() || "",
      assignedTo: task.assignedTo?.toString() || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      dueTime: task.dueTime || "",
      labels: (task.labels || []).join(", "),
      isRecurring: task.isRecurring || false,
      recurringPattern: task.recurringPattern || "",
      timeEstimate: task.timeEstimate?.toString() || "",
      timeActual: task.timeActual?.toString() || "",
      slaDeadline: task.slaDeadline ? new Date(task.slaDeadline).toISOString().split('T')[0] : "",
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      blockedBy: task.blockedBy?.toString() || "",
      blocks: task.blocks?.toString() || "",
    });
    setShowCreateDialog(true);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setForm(f => ({ ...f, subtasks: [...f.subtasks, { text: newSubtask.trim(), done: false }] }));
      setNewSubtask("");
    }
  };

  const toggleSubtask = (idx: number) => {
    setForm(f => ({
      ...f,
      subtasks: f.subtasks.map((s, i) => i === idx ? { ...s, done: !s.done } : s)
    }));
  };

  const removeSubtask = (idx: number) => {
    setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, i) => i !== idx) }));
  };

  const toggleSelectTask = (id: number) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedTasks.length === allTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(allTasks.map(t => t.id));
    }
  };

  const getPriorityInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];
  const getStatusInfo = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[0];

  const getSlaIndicator = (task: any) => {
    if (!task.slaDeadline) return null;
    const now = new Date();
    const sla = new Date(task.slaDeadline);
    const diff = sla.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 0) return { text: "SLA Breached", color: "text-red-600" };
    if (hours < 4) return { text: `${hours}h left`, color: "text-orange-600" };
    if (hours < 24) return { text: `${hours}h left`, color: "text-yellow-600" };
    return { text: `${Math.floor(hours / 24)}d left`, color: "text-green-600" };
  };

  const getTimeTrackingInfo = (task: any) => {
    if (!task.timeEstimate) return null;
    const pct = task.timeActual ? Math.min(100, Math.round((task.timeActual / task.timeEstimate) * 100)) : 0;
    return { estimate: task.timeEstimate, actual: task.timeActual || 0, pct };
  };

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    STATUSES.forEach(s => { grouped[s.value] = []; });
    allTasks.forEach(t => {
      if (grouped[t.status]) grouped[t.status].push(t);
      else grouped[t.status] = [t];
    });
    return grouped;
  }, [allTasks]);

  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number; tasks: any[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTasks = allTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.getDate() === d && due.getMonth() === month && due.getFullYear() === year;
      });
      days.push({ day: d, tasks: dayTasks });
    }
    return { firstDay, days, monthName: now.toLocaleString('default', { month: 'long' }), year };
  }, [allTasks]);

  const TaskRow = ({ task }: { task: any }) => {
    const priority = getPriorityInfo(task.priority);
    const status = getStatusInfo(task.status);
    const sla = getSlaIndicator(task);
    const PriorityIcon = priority.icon;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

    return (
      <div className={`flex items-center gap-3 p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
        <Checkbox
          checked={selectedTasks.includes(task.id)}
          onCheckedChange={() => toggleSelectTask(task.id)}
        />
        <button
          className="w-5 h-5 flex-shrink-0"
          onClick={() => quickStatusMutation.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}
        >
          {task.status === "done" ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-green-400 transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-slate-400" : ""}`}>
              {task.title}
            </span>
            <PriorityIcon className={`w-3.5 h-3.5 ${priority.color.split(' ')[1]}`} />
            {task.isRecurring && <RefreshCw className="w-3 h-3 text-blue-400" />}
            {sla && <span className={`text-xs font-medium ${sla.color}`}>{sla.text}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Badge className={status.color} variant="secondary">{status.label}</Badge>
            {task.clientName && <span>{task.clientName}</span>}
            {task.assignedToName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.assignedToName}</span>}
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                <Clock className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.labels?.length > 0 && task.labels.map((l: string) => (
              <Badge key={l} variant="outline" className="text-xs py-0">{l}</Badge>
            ))}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(task)}>
              <Eye className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateMutation.mutate(task.id)}>
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUSES.filter(s => s.value !== task.status).map(s => (
              <DropdownMenuItem key={s.value} onClick={() => quickStatusMutation.mutate({ id: task.id, status: s.value })}>
                Mark as {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: task.id, days: 1 })}>
              <PauseCircle className="w-4 h-4 mr-2" /> Snooze 1 day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => snoozeMutation.mutate({ id: task.id, days: 3 })}>
              <PauseCircle className="w-4 h-4 mr-2" /> Snooze 3 days
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(task.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const KanbanColumn = ({ status, tasks: columnTasks }: { status: typeof STATUSES[0]; tasks: any[] }) => (
    <div className="flex-1 min-w-[260px] max-w-[320px]">
      <div className={`rounded-t-lg px-3 py-2 ${status.color} flex items-center justify-between`}>
        <span className="font-medium text-sm">{status.label}</span>
        <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-b-lg p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
        {columnTasks.map(task => {
          const priority = getPriorityInfo(task.priority);
          const PriorityIcon = priority.icon;
          return (
            <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(task)}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-medium flex-1">{task.title}</span>
                  <PriorityIcon className={`w-3.5 h-3.5 flex-shrink-0 ${priority.color.split(' ')[1]}`} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {task.clientName && <Badge variant="outline" className="text-xs py-0">{task.clientName}</Badge>}
                  {task.dueDate && (
                    <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-slate-400'}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.assignedToName && (
                    <span className="text-xs text-slate-400">{task.assignedToName}</span>
                  )}
                </div>
                {task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                  <div className="mt-2">
                    <Progress value={Math.round(task.subtasks.filter((s: any) => s.done).length / task.subtasks.length * 100)} className="h-1" />
                    <span className="text-xs text-slate-400 mt-1">
                      {task.subtasks.filter((s: any) => s.done).length}/{task.subtasks.length}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Button
          variant="ghost"
          className="w-full text-xs text-slate-400"
          onClick={() => { setForm({ ...defaultForm, status: status.value }); setEditingTask(null); setShowCreateDialog(true); }}
        >
          <Plus className="w-3 h-3 mr-1" /> Add task
        </Button>
      </div>
    </div>
  );

  const CalendarView = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{calendarData.monthName} {calendarData.year}</h3>
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-slate-100 dark:bg-slate-800 p-2 text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
        {Array.from({ length: calendarData.firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 p-2 min-h-[80px]" />
        ))}
        {calendarData.days.map(({ day, tasks: dayTasks }) => {
          const isToday = new Date().getDate() === day && new Date().getMonth() === new Date().getMonth();
          return (
            <div key={day} className={`bg-white dark:bg-slate-900 p-1.5 min-h-[80px] ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
              <span className={`text-xs font-medium ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-600 dark:text-slate-400'}`}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map(t => {
                  const pInfo = getPriorityInfo(t.priority);
                  return (
                    <div
                      key={t.id}
                      className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${pInfo.color}`}
                      onClick={() => openEdit(t)}
                    >
                      {t.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && <span className="text-xs text-slate-400">+{dayTasks.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ReportsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Completion Rate (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {completionRate.length > 0 ? (
            <div className="space-y-1">
              {completionRate.slice(-7).map((day: any) => (
                <div key={day.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-slate-500">{new Date(day.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="bg-green-400 h-4 rounded" style={{ width: `${Math.max(day.completed * 20, 0)}px` }} />
                    <div className="bg-blue-400 h-4 rounded" style={{ width: `${Math.max(day.created * 20, 0)}px` }} />
                  </div>
                  <span className="text-green-600">{day.completed}done</span>
                  <span className="text-blue-600">{day.created}new</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No data yet</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Task Aging</CardTitle>
        </CardHeader>
        <CardContent>
          {agingReport.length > 0 ? (
            <div className="space-y-3">
              {agingReport.map((bucket: any) => (
                <div key={bucket.bucket} className="flex items-center justify-between">
                  <span className="text-sm">{bucket.bucket}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${Math.min(100, bucket.count * 20)}%` }}
                      />
                    </div>
                    <Badge variant="secondary">{bucket.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No overdue tasks</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Productivity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {productivity.length > 0 ? (
            <div className="space-y-3">
              {productivity.map((u: any) => (
                <div key={u.userId} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{u.userName}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600">{u.completed} done</span>
                    <span className="text-red-600">{u.overdue} overdue</span>
                    {u.avgTime > 0 && <span className="text-slate-400">{u.avgTime}min avg</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No data yet</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Overdue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-4xl font-bold text-red-600">{overdueTasks.length}</div>
            <p className="text-sm text-slate-500 mt-1">Currently overdue tasks</p>
            {overdueTasks.length > 0 && (
              <div className="mt-4 space-y-2">
                {overdueTasks.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="text-xs text-left flex justify-between">
                    <span className="truncate">{t.title}</span>
                    <span className="text-red-500 ml-2 flex-shrink-0">{formatDate(t.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header title="Task Management" subtitle="Manage, track, and report on all tasks" />
        <div className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("all")}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-slate-500">Total Tasks</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("todo")}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats?.todo || 0}</div>
                <p className="text-xs text-slate-500">To Do</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("in_progress")}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
                <p className="text-xs text-slate-500">In Progress</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 cursor-pointer hover:shadow-md">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</div>
                <p className="text-xs text-slate-500">Overdue</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus("done")}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats?.completedToday || 0}</div>
                <p className="text-xs text-slate-500">Completed Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              {selectedTasks.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Bulk Actions ({selectedTasks.length})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {STATUSES.map(s => (
                      <DropdownMenuItem key={s.value} onClick={() => bulkStatusMutation.mutate({ ids: selectedTasks, status: s.value })}>
                        Mark as {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" size="sm" onClick={() => window.open('/api/tasks/export?format=csv', '_blank')}>
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>

              <Button onClick={() => { setEditingTask(null); setForm({ ...defaultForm }); setShowCreateDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" /> New Task
              </Button>
            </div>
          </div>

          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList>
              <TabsTrigger value="myday" className="flex items-center gap-1"><Target className="w-4 h-4" /> My Day</TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1"><ListTodo className="w-4 h-4" /> List</TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Kanban</TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Calendar</TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="myday" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    My Day
                    <Badge variant="secondary">{myDayTasks.length}</Badge>
                  </h3>
                  <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>

                {overdueTasks.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Overdue ({overdueTasks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {overdueTasks.map((t: any) => <TaskRow key={t.id} task={t} />)}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListTodo className="w-4 h-4" /> Today's Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {myDayTasks.length > 0 ? (
                      myDayTasks.map((t: any) => <TaskRow key={t.id} task={t} />)
                    ) : (
                      <div className="p-8 text-center">
                        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <p className="text-slate-500">All caught up! No tasks for today.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {upcomingTasks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Upcoming (Next 7 Days)
                        <Badge variant="secondary">{upcomingTasks.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {upcomingTasks.map((t: any) => <TaskRow key={t.id} task={t} />)}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              {/* Smart Sections */}
              {overdueTasks.length > 0 && filterStatus === "all" && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Overdue ({overdueTasks.length})
                  </h3>
                  <Card>
                    <CardContent className="p-0">
                      {overdueTasks.slice(0, 5).map((t: any) => <TaskRow key={t.id} task={t} />)}
                      {overdueTasks.length > 5 && (
                        <div className="p-2 text-center text-xs text-slate-400">+{overdueTasks.length - 5} more overdue</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {upcomingTasks.length > 0 && filterStatus === "all" && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Upcoming 7 Days ({upcomingTasks.length})
                  </h3>
                  <Card>
                    <CardContent className="p-0">
                      {upcomingTasks.slice(0, 5).map((t: any) => <TaskRow key={t.id} task={t} />)}
                      {upcomingTasks.length > 5 && (
                        <div className="p-2 text-center text-xs text-slate-400">+{upcomingTasks.length - 5} more upcoming</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  checked={selectedTasks.length === allTasks.length && allTasks.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs text-slate-500">
                  {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-400">Loading tasks...</div>
                  ) : allTasks.length > 0 ? (
                    allTasks.map(task => <TaskRow key={task.id} task={task} />)
                  ) : (
                    <div className="p-12 text-center">
                      <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No tasks found</p>
                      <Button className="mt-3" onClick={() => { setEditingTask(null); setForm({ ...defaultForm }); setShowCreateDialog(true); }}>
                        <Plus className="w-4 h-4 mr-1" /> Create your first task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kanban" className="mt-4">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STATUSES.map(status => (
                  <KanbanColumn key={status.value} status={status} tasks={tasksByStatus[status.value] || []} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <CalendarView />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <ReportsView />
            </TabsContent>
          </Tabs>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || !!editingTask} onOpenChange={(open) => {
          if (!open) { setShowCreateDialog(false); setEditingTask(null); setForm({ ...defaultForm }); }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task description" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Due Time</Label>
                  <Input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign to Client</Label>
                  <Select value={form.clientId || "none"} onValueChange={v => setForm(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assign to Campaign</Label>
                  <Select value={form.campaignId || "none"} onValueChange={v => setForm(f => ({ ...f, campaignId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {campaignsList.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assign to User</Label>
                  <Select value={form.assignedTo || "none"} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {usersList.map((u: any) => <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Labels (comma-separated)</Label>
                  <Input value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} placeholder="urgent, follow-up, seo" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Estimate (minutes)</Label>
                  <Input type="number" value={form.timeEstimate} onChange={e => setForm(f => ({ ...f, timeEstimate: e.target.value }))} placeholder="60" />
                </div>
                <div>
                  <Label>Time Actual (minutes)</Label>
                  <Input type="number" value={form.timeActual} onChange={e => setForm(f => ({ ...f, timeActual: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SLA Deadline</Label>
                  <Input type="date" value={form.slaDeadline} onChange={e => setForm(f => ({ ...f, slaDeadline: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Blocked By (Task ID)</Label>
                  <Select value={form.blockedBy || "none"} onValueChange={v => setForm(f => ({ ...f, blockedBy: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allTasks.filter(t => t.id !== editingTask?.id).map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>#{t.id} - {t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Blocks (Task ID)</Label>
                  <Select value={form.blocks || "none"} onValueChange={v => setForm(f => ({ ...f, blocks: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allTasks.filter(t => t.id !== editingTask?.id).map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>#{t.id} - {t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.timeEstimate && form.timeActual && (
                <div>
                  <Label className="flex items-center gap-2 mb-1"><Timer className="w-4 h-4" /> Time Tracking</Label>
                  <Progress value={Math.min(100, Math.round((parseInt(form.timeActual) / parseInt(form.timeEstimate)) * 100))} className="h-2" />
                  <span className="text-xs text-slate-400">{form.timeActual}min / {form.timeEstimate}min ({Math.round((parseInt(form.timeActual) / parseInt(form.timeEstimate)) * 100)}%)</span>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.isRecurring}
                    onCheckedChange={(c) => setForm(f => ({ ...f, isRecurring: !!c }))}
                  />
                  <Label>Recurring Task</Label>
                </div>
                {form.isRecurring && (
                  <Select value={form.recurringPattern} onValueChange={v => setForm(f => ({ ...f, recurringPattern: v }))}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Pattern" /></SelectTrigger>
                    <SelectContent>
                      {RECURRING_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Subtasks / Checklist */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Subtasks / Checklist
                </Label>
                {form.subtasks.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <Checkbox checked={st.done} onCheckedChange={() => toggleSubtask(i)} />
                    <span className={`text-sm flex-1 ${st.done ? 'line-through text-slate-400' : ''}`}>{st.text}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeSubtask(i)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    placeholder="Add subtask..."
                    className="text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddSubtask}>Add</Button>
                </div>
                {form.subtasks.length > 0 && (
                  <div className="mt-2">
                    <Progress value={Math.round(form.subtasks.filter(s => s.done).length / form.subtasks.length * 100)} className="h-2" />
                    <span className="text-xs text-slate-400">{form.subtasks.filter(s => s.done).length}/{form.subtasks.length} complete</span>
                  </div>
                )}
              </div>
              {editingTask && (
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Bell className="w-4 h-4" /> Comments</Label>
                  {taskComments.length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto">
                      {taskComments.map((c: any) => (
                        <div key={c.id} className="bg-slate-50 dark:bg-slate-800 rounded p-2 text-sm">
                          <p>{c.content}</p>
                          <span className="text-xs text-slate-400 mt-1">{formatDate(c.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-2">No comments yet</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newComment.trim()) {
                          e.preventDefault();
                          addCommentMutation.mutate({ taskId: editingTask.id, content: newComment.trim() });
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!newComment.trim()}
                      onClick={() => addCommentMutation.mutate({ taskId: editingTask.id, content: newComment.trim() })}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingTask(null); setForm({ ...defaultForm }); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}>
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
