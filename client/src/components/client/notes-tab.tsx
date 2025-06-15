import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  FileText, 
  AlertCircle, 
  CheckSquare, 
  Calendar, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Clock,
  Flag
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertClientNoteSchema, type ClientNote, type InsertClientNote } from "@shared/schema";

interface NotesTabProps {
  clientId: number;
}

const noteTypes = [
  { value: "note", label: "Note", icon: FileText },
  { value: "reminder", label: "Reminder", icon: AlertCircle },
  { value: "task", label: "Task", icon: CheckSquare },
];

const priorities = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "high", label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
];

export function NotesTab({ clientId }: NotesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [], isLoading } = useQuery<ClientNote[]>({
    queryKey: [`/api/clients/${clientId}/notes`],
  });

  const form = useForm<InsertClientNote>({
    resolver: zodResolver(insertClientNoteSchema),
    defaultValues: {
      clientId,
      title: "",
      content: "",
      type: "note",
      priority: "normal",
      isCompleted: false,
      dueDate: null,
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: InsertClientNote) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/notes`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create note",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertClientNote> }) => {
      const response = await apiRequest("PUT", `/api/notes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/notes`] });
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
    form.reset({
      clientId,
      title: "",
      content: "",
      type: "note",
      priority: "normal",
      isCompleted: false,
      dueDate: null,
    });
  };

  const handleEditNote = (note: ClientNote) => {
    setEditingNote(note);
    form.reset({
      clientId: note.clientId,
      title: note.title,
      content: note.content,
      type: note.type || "note",
      priority: note.priority || "normal",
      isCompleted: note.isCompleted,
      dueDate: note.dueDate,
    });
    setDialogOpen(true);
  };

  const handleToggleComplete = (note: ClientNote) => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { isCompleted: !note.isCompleted },
    });
  };

  const onSubmit = async (data: InsertClientNote) => {
    if (editingNote) {
      await updateNoteMutation.mutateAsync({ id: editingNote.id, data });
    } else {
      await createNoteMutation.mutateAsync(data);
    }
  };

  const getNoteIcon = (type: string) => {
    const noteType = noteTypes.find(t => t.value === type);
    return noteType ? noteType.icon : FileText;
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return priorityConfig ? priorityConfig.color : priorities[1].color;
  };

  const sortedNotes = notes.sort((a, b) => {
    // Incomplete tasks first, then by priority, then by date
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalNotes = notes.length;
  const completedTasks = notes.filter(n => n.type === 'task' && n.isCompleted).length;
  const pendingTasks = notes.filter(n => n.type === 'task' && !n.isCompleted).length;
  const overdueTasks = notes.filter(n => 
    n.type === 'task' && 
    !n.isCompleted && 
    n.dueDate && 
    new Date(n.dueDate) < new Date()
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Notes</p>
                <p className="text-2xl font-bold text-primary">{totalNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Completed Tasks</p>
                <p className="text-2xl font-bold text-emerald-600">{completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending Tasks</p>
                <p className="text-2xl font-bold text-amber-600">{pendingTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Notes & Tasks ({totalNotes})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? "Edit Note" : "Create New Note"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter note title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {noteTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {priorities.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
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
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter note content" 
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseDialog}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createNoteMutation.isPending || updateNoteMutation.isPending
                      ? "Saving..." 
                      : editingNote 
                        ? "Update Note" 
                        : "Create Note"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes List */}
      {sortedNotes.length > 0 ? (
        <div className="space-y-4">
          {sortedNotes.map((note) => {
            const IconComponent = getNoteIcon(note.type || "note");
            const isOverdue = note.dueDate && !note.isCompleted && new Date(note.dueDate) < new Date();
            
            return (
              <Card 
                key={note.id} 
                className={`hover-lift transition-all duration-200 ${
                  note.isCompleted ? 'opacity-70' : ''
                } ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        <IconComponent className={`w-5 h-5 ${
                          note.isCompleted 
                            ? 'text-emerald-600' 
                            : isOverdue 
                              ? 'text-red-600'
                              : 'text-slate-600 dark:text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CardTitle className={`text-lg ${
                            note.isCompleted ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'
                          }`}>
                            {note.title}
                          </CardTitle>
                          <Badge className={getPriorityColor(note.priority || "normal")}>
                            <Flag className="w-3 h-3 mr-1" />
                            {note.priority || "normal"}
                          </Badge>
                          <Badge variant="outline">
                            {noteTypes.find(t => t.value === note.type)?.label || "Note"}
                          </Badge>
                          {note.isCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              Completed
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                          <span>Created: {formatDate(note.createdAt)}</span>
                          {note.dueDate && (
                            <span>Due: {formatDate(note.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {note.type === 'task' && (
                          <DropdownMenuItem onClick={() => handleToggleComplete(note)}>
                            <CheckSquare className="w-4 h-4 mr-2" />
                            {note.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEditNote(note)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className={`text-slate-600 dark:text-slate-400 ${
                    note.isCompleted ? 'line-through opacity-70' : ''
                  }`}>
                    {note.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm">Add your first note or task to get started</p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="mt-4 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      )}
    </div>
  );
}
