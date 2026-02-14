import { eq, desc, asc, ilike, or, and, sql, lte, gte, lt, gt, inArray, isNull, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  clients, billing, campaigns, clientNotes, clientFiles, activityLog, users, invoiceTokens,
  tasks, taskComments, notifications,
  type Client, type InsertClient,
  type Billing, type InsertBilling,
  type Campaign, type InsertCampaign,
  type ClientNote, type InsertClientNote,
  type ClientFile, type InsertClientFile,
  type ActivityLog, type InsertActivityLog,
  type User, type InsertUser,
  type InvoiceToken, type InsertInvoiceToken,
  type Task, type InsertTask,
  type TaskComment, type InsertTaskComment,
  type Notification, type InsertNotification
} from "@shared/schema";

export interface IStorage {
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  searchClients(query: string): Promise<Client[]>;

  getBillingByClient(clientId: number): Promise<Billing[]>;
  getBilling(id: number): Promise<Billing | undefined>;
  createBilling(billing: InsertBilling): Promise<Billing>;
  updateBilling(id: number, billing: Partial<InsertBilling>): Promise<Billing | undefined>;
  deleteBilling(id: number): Promise<boolean>;
  getBillingStats(): Promise<{ totalRevenue: number; pendingAmount: number; paidCount: number; unpaidCount: number }>;
  getAllBilling(): Promise<Billing[]>;
  generateMonthlyInvoices(month: number, year: number, dueDays?: number): Promise<{ created: number; skipped: number; details: string[] }>;

  getCampaignsByClient(clientId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  getAllCampaigns(): Promise<Campaign[]>;

  getNotesByClient(clientId: number): Promise<ClientNote[]>;
  createNote(note: InsertClientNote): Promise<ClientNote>;
  updateNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined>;
  deleteNote(id: number): Promise<boolean>;
  getTodaysTasks(): Promise<(ClientNote & { clientName?: string | null })[]>;
  getOverdueTasks(): Promise<(ClientNote & { clientName?: string | null })[]>;

  getFilesByClient(clientId: number): Promise<ClientFile[]>;
  createFile(file: InsertClientFile): Promise<ClientFile>;
  deleteFile(id: number): Promise<boolean>;
  getFile(id: number): Promise<ClientFile | undefined>;

  getActivityByClient(clientId: number): Promise<ActivityLog[]>;
  createActivity(activity: InsertActivityLog): Promise<ActivityLog>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createInvoiceToken(token: InsertInvoiceToken): Promise<InvoiceToken>;
  getInvoiceToken(token: string): Promise<InvoiceToken | undefined>;

  getAgingReport(): Promise<{ bucket: string; count: number; total: number }[]>;
  getReconciliation(): Promise<{ method: string; count: number; total: number }[]>;

  getTasks(filters?: TaskFilters): Promise<TaskWithRelations[]>;
  getTask(id: number): Promise<TaskWithRelations | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  duplicateTask(id: number): Promise<Task | undefined>;
  bulkUpdateTaskStatus(ids: number[], status: string): Promise<number>;
  getTasksByDateRange(start: Date, end: Date): Promise<TaskWithRelations[]>;
  getMyDayTasks(userId?: number): Promise<TaskWithRelations[]>;
  getOverdueTasksList(): Promise<TaskWithRelations[]>;
  getUpcomingTasks(days: number): Promise<TaskWithRelations[]>;
  getTaskStats(): Promise<TaskStats>;
  getTaskAgingReport(): Promise<{ bucket: string; count: number }[]>;
  getCompletionRateStats(days: number): Promise<{ date: string; completed: number; created: number }[]>;
  getProductivityMetrics(): Promise<{ userId: number; userName: string; completed: number; overdue: number; avgTime: number }[]>;

  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;

  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  clientId?: number;
  campaignId?: number;
  assignedTo?: number;
  label?: string;
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface TaskWithRelations extends Task {
  clientName?: string | null;
  campaignName?: string | null;
  assignedToName?: string | null;
  createdByName?: string | null;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  waiting: number;
  review: number;
  done: number;
  overdue: number;
  completedToday: number;
  dueToday: number;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    await this.createActivity({
      clientId: client.id,
      action: "client_created",
      description: `Client ${client.name} was created`,
      entityType: "client",
      entityId: client.id,
      metadata: null,
    });
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (client) {
      await this.createActivity({
        clientId: id,
        action: "client_updated",
        description: `Client ${client.name} was updated`,
        entityType: "client",
        entityId: id,
        metadata: updateData,
      });
    }
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    const client = await this.getClient(id);
    if (!client) return false;
    await db.delete(activityLog).where(eq(activityLog.clientId, id));
    await db.delete(clientNotes).where(eq(clientNotes.clientId, id));
    await db.delete(clientFiles).where(eq(clientFiles.clientId, id));
    await db.delete(campaigns).where(eq(campaigns.clientId, id));
    await db.delete(billing).where(eq(billing.clientId, id));
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  async searchClients(query: string): Promise<Client[]> {
    const pattern = `%${query}%`;
    return await db.select().from(clients).where(
      or(
        ilike(clients.name, pattern),
        ilike(clients.email, pattern),
        ilike(clients.industry, pattern),
        ilike(clients.contactPerson, pattern)
      )
    );
  }

  async getBillingByClient(clientId: number): Promise<Billing[]> {
    return await db.select().from(billing).where(eq(billing.clientId, clientId)).orderBy(desc(billing.year), desc(billing.month));
  }

  async getBilling(id: number): Promise<Billing | undefined> {
    const [bill] = await db.select().from(billing).where(eq(billing.id, id));
    return bill;
  }

  async createBilling(insertBilling: InsertBilling): Promise<Billing> {
    const [bill] = await db.insert(billing).values(insertBilling).returning();
    await this.createActivity({
      clientId: bill.clientId,
      action: "billing_created",
      description: `Billing record created for ${bill.month}/${bill.year}`,
      entityType: "billing",
      entityId: bill.id,
      metadata: null,
    });
    return bill;
  }

  async updateBilling(id: number, updateData: Partial<InsertBilling>): Promise<Billing | undefined> {
    const [bill] = await db
      .update(billing)
      .set(updateData)
      .where(eq(billing.id, id))
      .returning();
    if (bill) {
      await this.createActivity({
        clientId: bill.clientId,
        action: "billing_updated",
        description: `Billing record updated for ${bill.month}/${bill.year}`,
        entityType: "billing",
        entityId: id,
        metadata: updateData,
      });
    }
    return bill;
  }

  async deleteBilling(id: number): Promise<boolean> {
    const bill = await this.getBilling(id);
    if (!bill) return false;
    await db.delete(billing).where(eq(billing.id, id));
    await this.createActivity({
      clientId: bill.clientId,
      action: "billing_deleted",
      description: `Billing record deleted for ${bill.month}/${bill.year}`,
      entityType: "billing",
      entityId: id,
      metadata: null,
    });
    return true;
  }

  async getBillingStats(): Promise<{ totalRevenue: number; pendingAmount: number; paidCount: number; unpaidCount: number }> {
    const currentYear = new Date().getFullYear();
    const allBilling = await db.select().from(billing).where(eq(billing.year, currentYear));

    const totalRevenue = allBilling
      .filter(b => b.isPaid)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);

    const pendingAmount = allBilling
      .filter(b => !b.isPaid)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);

    const paidCount = allBilling.filter(b => b.isPaid).length;
    const unpaidCount = allBilling.filter(b => !b.isPaid).length;

    return { totalRevenue, pendingAmount, paidCount, unpaidCount };
  }

  async getAllBilling(): Promise<Billing[]> {
    return await db.select().from(billing).orderBy(desc(billing.year), desc(billing.month));
  }

  async generateMonthlyInvoices(month: number, year: number, dueDays: number = 15): Promise<{ created: number; skipped: number; details: string[] }> {
    const activeClients = await db.select().from(clients).where(eq(clients.status, "active"));
    let created = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const client of activeClients) {
      const existing = await db.select().from(billing).where(
        and(
          eq(billing.clientId, client.id),
          eq(billing.month, month),
          eq(billing.year, year)
        )
      );

      if (existing.length > 0) {
        skipped++;
        details.push(`Skipped ${client.name} - invoice already exists`);
        continue;
      }

      const dueDate = new Date(year, month - 1, dueDays);
      const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}${String(client.id).padStart(3, '0')}`;

      await db.insert(billing).values({
        clientId: client.id,
        month,
        year,
        amount: client.monthlyServiceCharge,
        isPaid: false,
        paidAmount: "0",
        invoiceNumber,
        dueDate,
      });

      created++;
      details.push(`Created invoice for ${client.name} - ${client.monthlyServiceCharge}`);
    }

    return { created, skipped, details };
  }

  async getCampaignsByClient(clientId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.clientId, clientId));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign).returning();
    await this.createActivity({
      clientId: campaign.clientId,
      action: "campaign_created",
      description: `Campaign "${campaign.name}" was created`,
      entityType: "campaign",
      entityId: campaign.id,
      metadata: null,
    });
    return campaign;
  }

  async updateCampaign(id: number, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    if (campaign) {
      await this.createActivity({
        clientId: campaign.clientId,
        action: "campaign_updated",
        description: `Campaign "${campaign.name}" was updated`,
        entityType: "campaign",
        entityId: id,
        metadata: updateData,
      });
    }
    return campaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const campaign = await this.getCampaign(id);
    if (!campaign) return false;
    await db.delete(campaigns).where(eq(campaigns.id, id));
    await this.createActivity({
      clientId: campaign.clientId,
      action: "campaign_deleted",
      description: `Campaign "${campaign.name}" was deleted`,
      entityType: "campaign",
      entityId: id,
      metadata: null,
    });
    return true;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getNotesByClient(clientId: number): Promise<ClientNote[]> {
    return await db.select().from(clientNotes).where(eq(clientNotes.clientId, clientId)).orderBy(desc(clientNotes.createdAt));
  }

  async createNote(insertNote: InsertClientNote): Promise<ClientNote> {
    const [note] = await db.insert(clientNotes).values(insertNote).returning();
    await this.createActivity({
      clientId: note.clientId,
      action: "note_created",
      description: `Note "${note.title}" was created`,
      entityType: "note",
      entityId: note.id,
      metadata: null,
    });
    return note;
  }

  async updateNote(id: number, updateData: Partial<InsertClientNote>): Promise<ClientNote | undefined> {
    const [note] = await db
      .update(clientNotes)
      .set(updateData)
      .where(eq(clientNotes.id, id))
      .returning();
    if (note) {
      await this.createActivity({
        clientId: note.clientId,
        action: "note_updated",
        description: `Note "${note.title}" was updated`,
        entityType: "note",
        entityId: id,
        metadata: updateData,
      });
    }
    return note;
  }

  async deleteNote(id: number): Promise<boolean> {
    const [note] = await db.select().from(clientNotes).where(eq(clientNotes.id, id));
    if (!note) return false;
    await db.delete(clientNotes).where(eq(clientNotes.id, id));
    await this.createActivity({
      clientId: note.clientId,
      action: "note_deleted",
      description: `Note "${note.title}" was deleted`,
      entityType: "note",
      entityId: id,
      metadata: null,
    });
    return true;
  }

  async getTodaysTasks(): Promise<(ClientNote & { clientName?: string | null })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await db
      .select({
        id: clientNotes.id,
        clientId: clientNotes.clientId,
        title: clientNotes.title,
        content: clientNotes.content,
        type: clientNotes.type,
        priority: clientNotes.priority,
        isCompleted: clientNotes.isCompleted,
        dueDate: clientNotes.dueDate,
        createdAt: clientNotes.createdAt,
        clientName: clients.name,
      })
      .from(clientNotes)
      .leftJoin(clients, eq(clientNotes.clientId, clients.id))
      .where(
        and(
          or(eq(clientNotes.type, "task"), eq(clientNotes.type, "reminder")),
          eq(clientNotes.isCompleted, false)
        )
      )
      .orderBy(clientNotes.dueDate);

    return tasks.filter(t => {
      if (!t.dueDate) return true;
      return t.dueDate <= tomorrow;
    });
  }

  async getOverdueTasks(): Promise<(ClientNote & { clientName?: string | null })[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await db
      .select({
        id: clientNotes.id,
        clientId: clientNotes.clientId,
        title: clientNotes.title,
        content: clientNotes.content,
        type: clientNotes.type,
        priority: clientNotes.priority,
        isCompleted: clientNotes.isCompleted,
        dueDate: clientNotes.dueDate,
        createdAt: clientNotes.createdAt,
        clientName: clients.name,
      })
      .from(clientNotes)
      .leftJoin(clients, eq(clientNotes.clientId, clients.id))
      .where(
        and(
          or(eq(clientNotes.type, "task"), eq(clientNotes.type, "reminder")),
          eq(clientNotes.isCompleted, false)
        )
      )
      .orderBy(clientNotes.dueDate);

    return tasks.filter(t => t.dueDate && t.dueDate < today);
  }

  async getFilesByClient(clientId: number): Promise<ClientFile[]> {
    return await db.select().from(clientFiles).where(eq(clientFiles.clientId, clientId)).orderBy(desc(clientFiles.createdAt));
  }

  async createFile(insertFile: InsertClientFile): Promise<ClientFile> {
    const [file] = await db.insert(clientFiles).values(insertFile).returning();
    await this.createActivity({
      clientId: file.clientId,
      action: "file_uploaded",
      description: `File "${file.originalName}" was uploaded`,
      entityType: "file",
      entityId: file.id,
      metadata: null,
    });
    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = await this.getFile(id);
    if (!file) return false;
    await db.delete(clientFiles).where(eq(clientFiles.id, id));
    await this.createActivity({
      clientId: file.clientId,
      action: "file_deleted",
      description: `File "${file.originalName}" was deleted`,
      entityType: "file",
      entityId: id,
      metadata: null,
    });
    return true;
  }

  async getFile(id: number): Promise<ClientFile | undefined> {
    const [file] = await db.select().from(clientFiles).where(eq(clientFiles.id, id));
    return file;
  }

  async getActivityByClient(clientId: number): Promise<ActivityLog[]> {
    return await db.select().from(activityLog).where(eq(activityLog.clientId, clientId)).orderBy(desc(activityLog.createdAt));
  }

  async createActivity(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const [activity] = await db.insert(activityLog).values(insertActivity).returning();
    return activity;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createInvoiceToken(insertToken: InsertInvoiceToken): Promise<InvoiceToken> {
    const [token] = await db.insert(invoiceTokens).values(insertToken).returning();
    return token;
  }

  async getInvoiceToken(token: string): Promise<InvoiceToken | undefined> {
    const [result] = await db.select().from(invoiceTokens).where(eq(invoiceTokens.token, token));
    return result;
  }

  async getAgingReport(): Promise<{ bucket: string; count: number; total: number }[]> {
    const unpaidBills = await db.select().from(billing).where(eq(billing.isPaid, false));
    const now = new Date();

    const buckets: Record<string, { count: number; total: number }> = {
      "0-15 days": { count: 0, total: 0 },
      "16-30 days": { count: 0, total: 0 },
      "31-60 days": { count: 0, total: 0 },
      "60+ days": { count: 0, total: 0 },
    };

    for (const bill of unpaidBills) {
      const dueDate = bill.dueDate || new Date(bill.year, bill.month - 1, 15);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const amount = parseFloat(bill.amount) - parseFloat(bill.paidAmount || "0");

      if (daysOverdue <= 15) {
        buckets["0-15 days"].count++;
        buckets["0-15 days"].total += amount;
      } else if (daysOverdue <= 30) {
        buckets["16-30 days"].count++;
        buckets["16-30 days"].total += amount;
      } else if (daysOverdue <= 60) {
        buckets["31-60 days"].count++;
        buckets["31-60 days"].total += amount;
      } else {
        buckets["60+ days"].count++;
        buckets["60+ days"].total += amount;
      }
    }

    return Object.entries(buckets).map(([bucket, data]) => ({
      bucket,
      ...data,
    }));
  }

  async getReconciliation(): Promise<{ method: string; count: number; total: number }[]> {
    const paidBills = await db.select().from(billing).where(eq(billing.isPaid, true));
    const methods: Record<string, { count: number; total: number }> = {};

    for (const bill of paidBills) {
      const method = bill.paymentMethod || "Not specified";
      if (!methods[method]) {
        methods[method] = { count: 0, total: 0 };
      }
      methods[method].count++;
      methods[method].total += parseFloat(bill.amount);
    }

    return Object.entries(methods).map(([method, data]) => ({
      method,
      ...data,
    }));
  }

  private async enrichTasks(rawTasks: Task[]): Promise<TaskWithRelations[]> {
    const allClients = await db.select({ id: clients.id, name: clients.name }).from(clients);
    const allCampaigns = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns);
    const allUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users);

    const clientMap = new Map(allClients.map(c => [c.id, c.name]));
    const campaignMap = new Map(allCampaigns.map(c => [c.id, c.name]));
    const userMap = new Map(allUsers.map(u => [u.id, u.fullName]));

    return rawTasks.map(t => ({
      ...t,
      clientName: t.clientId ? clientMap.get(t.clientId) || null : null,
      campaignName: t.campaignId ? campaignMap.get(t.campaignId) || null : null,
      assignedToName: t.assignedTo ? userMap.get(t.assignedTo) || null : null,
      createdByName: t.createdBy ? userMap.get(t.createdBy) || null : null,
    }));
  }

  async getTasks(filters?: TaskFilters): Promise<TaskWithRelations[]> {
    const conditions = [];

    if (filters?.status) conditions.push(eq(tasks.status, filters.status));
    if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority));
    if (filters?.clientId) conditions.push(eq(tasks.clientId, filters.clientId));
    if (filters?.campaignId) conditions.push(eq(tasks.campaignId, filters.campaignId));
    if (filters?.assignedTo) conditions.push(eq(tasks.assignedTo, filters.assignedTo));
    if (filters?.dueBefore) conditions.push(lte(tasks.dueDate, filters.dueBefore));
    if (filters?.dueAfter) conditions.push(gte(tasks.dueDate, filters.dueAfter));
    if (filters?.search) {
      const p = `%${filters.search}%`;
      conditions.push(or(ilike(tasks.title, p), ilike(tasks.description, p)));
    }

    let query = db.select().from(tasks);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rawTasks = await (query as any).orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));
    return this.enrichTasks(rawTasks);
  }

  async getTask(id: number): Promise<TaskWithRelations | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;
    const [enriched] = await this.enrichTasks([task]);
    return enriched;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: number): Promise<boolean> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return false;
    await db.delete(taskComments).where(eq(taskComments.taskId, id));
    await db.delete(notifications).where(eq(notifications.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  async duplicateTask(id: number): Promise<Task | undefined> {
    const original = await this.getTask(id);
    if (!original) return undefined;
    const { id: _id, createdAt: _ca, updatedAt: _ua, clientName: _cn, campaignName: _cmn, assignedToName: _an, createdByName: _cbn, completedAt: _comp, ...rest } = original;
    const [task] = await db.insert(tasks).values({
      ...rest,
      title: `${rest.title} (copy)`,
      status: "todo",
    }).returning();
    return task;
  }

  async bulkUpdateTaskStatus(ids: number[], status: string): Promise<number> {
    if (ids.length === 0) return 0;
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "done") {
      updateData.completedAt = new Date();
    }
    const result = await db.update(tasks).set(updateData).where(inArray(tasks.id, ids)).returning();
    return result.length;
  }

  async getTasksByDateRange(start: Date, end: Date): Promise<TaskWithRelations[]> {
    const rawTasks = await db.select().from(tasks).where(
      and(
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, start),
        lte(tasks.dueDate, end)
      )
    ).orderBy(asc(tasks.dueDate));
    return this.enrichTasks(rawTasks);
  }

  async getMyDayTasks(userId?: number): Promise<TaskWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const conditions = [
      or(
        eq(tasks.status, "todo"),
        eq(tasks.status, "in_progress"),
        eq(tasks.status, "waiting"),
        eq(tasks.status, "review")
      ),
      or(
        and(isNotNull(tasks.dueDate), lte(tasks.dueDate, tomorrow)),
        isNull(tasks.dueDate)
      )
    ];

    if (userId) {
      conditions.push(eq(tasks.assignedTo, userId));
    }

    const rawTasks = await db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate), asc(tasks.sortOrder));
    return this.enrichTasks(rawTasks);
  }

  async getOverdueTasksList(): Promise<TaskWithRelations[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const rawTasks = await db.select().from(tasks).where(
      and(
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, now),
        or(
          eq(tasks.status, "todo"),
          eq(tasks.status, "in_progress"),
          eq(tasks.status, "waiting"),
          eq(tasks.status, "review")
        )
      )
    ).orderBy(asc(tasks.dueDate));
    return this.enrichTasks(rawTasks);
  }

  async getUpcomingTasks(days: number): Promise<TaskWithRelations[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const rawTasks = await db.select().from(tasks).where(
      and(
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, now),
        lte(tasks.dueDate, future),
        or(
          eq(tasks.status, "todo"),
          eq(tasks.status, "in_progress"),
          eq(tasks.status, "waiting"),
          eq(tasks.status, "review")
        )
      )
    ).orderBy(asc(tasks.dueDate));
    return this.enrichTasks(rawTasks);
  }

  async getTaskStats(): Promise<TaskStats> {
    const allTasks = await db.select().from(tasks);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStart = new Date(now);
    const todayEnd = new Date(tomorrow);

    return {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === "todo").length,
      inProgress: allTasks.filter(t => t.status === "in_progress").length,
      waiting: allTasks.filter(t => t.status === "waiting").length,
      review: allTasks.filter(t => t.status === "review").length,
      done: allTasks.filter(t => t.status === "done").length,
      overdue: allTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== "done").length,
      completedToday: allTasks.filter(t => t.completedAt && t.completedAt >= todayStart && t.completedAt < todayEnd).length,
      dueToday: allTasks.filter(t => t.dueDate && t.dueDate >= todayStart && t.dueDate < todayEnd && t.status !== "done").length,
    };
  }

  async getTaskAgingReport(): Promise<{ bucket: string; count: number }[]> {
    const now = new Date();
    const openTasks = await db.select().from(tasks).where(
      and(
        isNotNull(tasks.dueDate),
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"), eq(tasks.status, "waiting"), eq(tasks.status, "review"))
      )
    );

    const buckets: Record<string, number> = {
      "0-7 days": 0,
      "8-15 days": 0,
      "16-30 days": 0,
      "30+ days": 0,
    };

    for (const t of openTasks) {
      if (!t.dueDate) continue;
      const daysOld = Math.max(0, Math.floor((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (daysOld <= 7) buckets["0-7 days"]++;
      else if (daysOld <= 15) buckets["8-15 days"]++;
      else if (daysOld <= 30) buckets["16-30 days"]++;
      else buckets["30+ days"]++;
    }

    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }

  async getCompletionRateStats(days: number): Promise<{ date: string; completed: number; created: number }[]> {
    const results: { date: string; completed: number; created: number }[] = [];
    const allTasks = await db.select().from(tasks);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dateStr = date.toISOString().split('T')[0];
      const completed = allTasks.filter(t => t.completedAt && t.completedAt >= date && t.completedAt < nextDay).length;
      const created = allTasks.filter(t => t.createdAt >= date && t.createdAt < nextDay).length;
      results.push({ date: dateStr, completed, created });
    }
    return results;
  }

  async getProductivityMetrics(): Promise<{ userId: number; userName: string; completed: number; overdue: number; avgTime: number }[]> {
    const allUsers = await db.select().from(users);
    const allTasks = await db.select().from(tasks);
    const now = new Date();

    return allUsers.map(u => {
      const userTasks = allTasks.filter(t => t.assignedTo === u.id);
      const completed = userTasks.filter(t => t.status === "done").length;
      const overdue = userTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== "done").length;
      const tasksWithTime = userTasks.filter(t => t.timeActual);
      const avgTime = tasksWithTime.length > 0
        ? tasksWithTime.reduce((sum, t) => sum + (t.timeActual || 0), 0) / tasksWithTime.length
        : 0;

      return { userId: u.id, userName: u.fullName, completed, overdue, avgTime: Math.round(avgTime) };
    });
  }

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db.select().from(taskComments).where(eq(taskComments.taskId, taskId)).orderBy(asc(taskComments.createdAt));
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [tc] = await db.insert(taskComments).values(comment).returning();
    return tc;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [n] = await db.insert(notifications).values(notification).returning();
    return n;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
