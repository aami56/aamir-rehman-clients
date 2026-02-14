import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  clients, billing, campaigns, clientNotes, clientFiles, activityLog, users, invoiceTokens,
  type Client, type InsertClient,
  type Billing, type InsertBilling,
  type Campaign, type InsertCampaign,
  type ClientNote, type InsertClientNote,
  type ClientFile, type InsertClientFile,
  type ActivityLog, type InsertActivityLog,
  type User, type InsertUser,
  type InvoiceToken, type InsertInvoiceToken
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
}

export const storage = new DatabaseStorage();
