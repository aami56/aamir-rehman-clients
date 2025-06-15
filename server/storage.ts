import { 
  clients, billing, campaigns, clientNotes, clientFiles, activityLog,
  type Client, type InsertClient,
  type Billing, type InsertBilling,
  type Campaign, type InsertCampaign,
  type ClientNote, type InsertClientNote,
  type ClientFile, type InsertClientFile,
  type ActivityLog, type InsertActivityLog
} from "@shared/schema";

export interface IStorage {
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  searchClients(query: string): Promise<Client[]>;

  // Billing methods
  getBillingByClient(clientId: number): Promise<Billing[]>;
  getBilling(id: number): Promise<Billing | undefined>;
  createBilling(billing: InsertBilling): Promise<Billing>;
  updateBilling(id: number, billing: Partial<InsertBilling>): Promise<Billing | undefined>;
  deleteBilling(id: number): Promise<boolean>;
  getBillingStats(): Promise<{ totalRevenue: number; pendingAmount: number; paidCount: number; unpaidCount: number; }>;

  // Campaign methods
  getCampaignsByClient(clientId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Notes methods
  getNotesByClient(clientId: number): Promise<ClientNote[]>;
  createNote(note: InsertClientNote): Promise<ClientNote>;
  updateNote(id: number, note: Partial<InsertClientNote>): Promise<ClientNote | undefined>;
  deleteNote(id: number): Promise<boolean>;

  // Files methods
  getFilesByClient(clientId: number): Promise<ClientFile[]>;
  createFile(file: InsertClientFile): Promise<ClientFile>;
  deleteFile(id: number): Promise<boolean>;

  // Activity log methods
  getActivityByClient(clientId: number): Promise<ActivityLog[]>;
  createActivity(activity: InsertActivityLog): Promise<ActivityLog>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private billing: Map<number, Billing>;
  private campaigns: Map<number, Campaign>;
  private clientNotes: Map<number, ClientNote>;
  private clientFiles: Map<number, ClientFile>;
  private activityLog: Map<number, ActivityLog>;
  private currentId: number;

  constructor() {
    this.clients = new Map();
    this.billing = new Map();
    this.campaigns = new Map();
    this.clientNotes = new Map();
    this.clientFiles = new Map();
    this.activityLog = new Map();
    this.currentId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleClients: InsertClient[] = [
      {
        name: "TechFlow Solutions",
        email: "contact@techflow.com",
        phone: "+1-555-0123",
        website: "https://techflow.com",
        industry: "Software Development",
        googleAdAccountId: "123-456-7890",
        monthlyServiceCharge: "1500.00",
        status: "active",
        contactPerson: "John Smith",
        address: "123 Tech Street, Silicon Valley, CA 94000",
        notes: "High-value client with consistent growth"
      },
      {
        name: "Digital Marketing Pro",
        email: "info@digitalmarketingpro.com",
        phone: "+1-555-0124",
        website: "https://digitalmarketingpro.com",
        industry: "E-commerce",
        googleAdAccountId: "123-456-7891",
        monthlyServiceCharge: "2200.00",
        status: "overdue",
        contactPerson: "Sarah Johnson",
        address: "456 Commerce Ave, New York, NY 10001",
        notes: "Payment overdue - follow up required"
      },
      {
        name: "HealthTech Innovations",
        email: "hello@healthtech.com",
        phone: "+1-555-0125",
        website: "https://healthtech.com",
        industry: "Healthcare",
        googleAdAccountId: "123-456-7892",
        monthlyServiceCharge: "3500.00",
        status: "active",
        contactPerson: "Dr. Michael Brown",
        address: "789 Medical Plaza, Boston, MA 02101",
        notes: "Premium client with multiple campaign verticals"
      }
    ];

    sampleClients.forEach(client => {
      this.createClient(client);
    });
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentId++;
    const now = new Date();
    const client: Client = {
      ...insertClient,
      id,
      createdAt: now,
      updatedAt: now,
      status: insertClient.status || "active",
      website: insertClient.website || null,
      industry: insertClient.industry || null,
      googleAdAccountId: insertClient.googleAdAccountId || null,
      contactPerson: insertClient.contactPerson || null,
      address: insertClient.address || null,
      notes: insertClient.notes || null,
    };
    this.clients.set(id, client);

    // Log activity
    await this.createActivity({
      clientId: id,
      action: "client_created",
      description: `Client ${client.name} was created`,
      entityType: "client",
      entityId: id,
      metadata: null
    });

    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient: Client = {
      ...client,
      ...updateData,
      updatedAt: new Date(),
    };
    this.clients.set(id, updatedClient);

    // Log activity
    await this.createActivity({
      clientId: id,
      action: "client_updated",
      description: `Client ${updatedClient.name} was updated`,
      entityType: "client",
      entityId: id,
      metadata: updateData
    });

    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client) return false;

    this.clients.delete(id);
    
    // Log activity
    await this.createActivity({
      clientId: id,
      action: "client_deleted",
      description: `Client ${client.name} was deleted`,
      entityType: "client",
      entityId: id,
      metadata: null
    });

    return true;
  }

  async searchClients(query: string): Promise<Client[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.clients.values()).filter(client =>
      client.name.toLowerCase().includes(lowercaseQuery) ||
      client.email.toLowerCase().includes(lowercaseQuery) ||
      client.industry?.toLowerCase().includes(lowercaseQuery) ||
      client.contactPerson?.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getBillingByClient(clientId: number): Promise<Billing[]> {
    return Array.from(this.billing.values()).filter(b => b.clientId === clientId);
  }

  async getBilling(id: number): Promise<Billing | undefined> {
    return this.billing.get(id);
  }

  async createBilling(insertBilling: InsertBilling): Promise<Billing> {
    const id = this.currentId++;
    const billing: Billing = {
      ...insertBilling,
      id,
      createdAt: new Date(),
      isPaid: insertBilling.isPaid ?? false,
      paidDate: insertBilling.paidDate || null,
      paymentMethod: insertBilling.paymentMethod || null,
      invoiceNumber: insertBilling.invoiceNumber || null,
      notes: insertBilling.notes || null,
    };
    this.billing.set(id, billing);

    // Log activity
    await this.createActivity({
      clientId: billing.clientId,
      action: "billing_created",
      description: `Billing record created for ${billing.month}/${billing.year}`,
      entityType: "billing",
      entityId: id,
      metadata: null
    });

    return billing;
  }

  async updateBilling(id: number, updateData: Partial<InsertBilling>): Promise<Billing | undefined> {
    const billing = this.billing.get(id);
    if (!billing) return undefined;

    const updatedBilling: Billing = {
      ...billing,
      ...updateData,
    };
    this.billing.set(id, updatedBilling);

    // Log activity
    await this.createActivity({
      clientId: billing.clientId,
      action: "billing_updated",
      description: `Billing record updated for ${billing.month}/${billing.year}`,
      entityType: "billing",
      entityId: id,
      metadata: updateData
    });

    return updatedBilling;
  }

  async deleteBilling(id: number): Promise<boolean> {
    const billing = this.billing.get(id);
    if (!billing) return false;

    this.billing.delete(id);
    
    // Log activity
    await this.createActivity({
      clientId: billing.clientId,
      action: "billing_deleted",
      description: `Billing record deleted for ${billing.month}/${billing.year}`,
      entityType: "billing",
      entityId: id,
      metadata: null
    });

    return true;
  }

  async getBillingStats(): Promise<{ totalRevenue: number; pendingAmount: number; paidCount: number; unpaidCount: number; }> {
    const allBilling = Array.from(this.billing.values());
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const currentYearBilling = allBilling.filter(b => b.year === currentYear);
    
    const totalRevenue = currentYearBilling
      .filter(b => b.isPaid)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);
    
    const pendingAmount = currentYearBilling
      .filter(b => !b.isPaid)
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);
    
    const paidCount = currentYearBilling.filter(b => b.isPaid).length;
    const unpaidCount = currentYearBilling.filter(b => !b.isPaid).length;

    return { totalRevenue, pendingAmount, paidCount, unpaidCount };
  }

  async getCampaignsByClient(clientId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(c => c.clientId === clientId);
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentId++;
    const now = new Date();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      createdAt: now,
      updatedAt: now,
      status: insertCampaign.status || "active",
      endDate: insertCampaign.endDate || null,
      description: insertCampaign.description || null,
      targetAudience: insertCampaign.targetAudience || null,
      keywords: insertCampaign.keywords || null,
      performance: insertCampaign.performance || {},
    };
    this.campaigns.set(id, campaign);

    // Log activity
    await this.createActivity({
      clientId: campaign.clientId,
      action: "campaign_created",
      description: `Campaign "${campaign.name}" was created`,
      entityType: "campaign",
      entityId: id,
      metadata: null
    });

    return campaign;
  }

  async updateCampaign(id: number, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;

    const updatedCampaign: Campaign = {
      ...campaign,
      ...updateData,
      updatedAt: new Date(),
    };
    this.campaigns.set(id, updatedCampaign);

    // Log activity
    await this.createActivity({
      clientId: campaign.clientId,
      action: "campaign_updated",
      description: `Campaign "${updatedCampaign.name}" was updated`,
      entityType: "campaign",
      entityId: id,
      metadata: updateData
    });

    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return false;

    this.campaigns.delete(id);
    
    // Log activity
    await this.createActivity({
      clientId: campaign.clientId,
      action: "campaign_deleted",
      description: `Campaign "${campaign.name}" was deleted`,
      entityType: "campaign",
      entityId: id,
      metadata: null
    });

    return true;
  }

  async getNotesByClient(clientId: number): Promise<ClientNote[]> {
    return Array.from(this.clientNotes.values()).filter(n => n.clientId === clientId);
  }

  async createNote(insertNote: InsertClientNote): Promise<ClientNote> {
    const id = this.currentId++;
    const note: ClientNote = {
      ...insertNote,
      id,
      createdAt: new Date(),
      type: insertNote.type || null,
      priority: insertNote.priority || null,
      isCompleted: insertNote.isCompleted || null,
      dueDate: insertNote.dueDate || null,
    };
    this.clientNotes.set(id, note);

    // Log activity
    await this.createActivity({
      clientId: note.clientId,
      action: "note_created",
      description: `Note "${note.title}" was created`,
      entityType: "note",
      entityId: id,
      metadata: null
    });

    return note;
  }

  async updateNote(id: number, updateData: Partial<InsertClientNote>): Promise<ClientNote | undefined> {
    const note = this.clientNotes.get(id);
    if (!note) return undefined;

    const updatedNote: ClientNote = {
      ...note,
      ...updateData,
    };
    this.clientNotes.set(id, updatedNote);

    // Log activity
    await this.createActivity({
      clientId: note.clientId,
      action: "note_updated",
      description: `Note "${updatedNote.title}" was updated`,
      entityType: "note",
      entityId: id,
      metadata: updateData
    });

    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    const note = this.clientNotes.get(id);
    if (!note) return false;

    this.clientNotes.delete(id);
    
    // Log activity
    await this.createActivity({
      clientId: note.clientId,
      action: "note_deleted",
      description: `Note "${note.title}" was deleted`,
      entityType: "note",
      entityId: id,
      metadata: null
    });

    return true;
  }

  async getFilesByClient(clientId: number): Promise<ClientFile[]> {
    return Array.from(this.clientFiles.values()).filter(f => f.clientId === clientId);
  }

  async createFile(insertFile: InsertClientFile): Promise<ClientFile> {
    const id = this.currentId++;
    const file: ClientFile = {
      ...insertFile,
      id,
      createdAt: new Date(),
      description: insertFile.description || null,
      uploadedBy: insertFile.uploadedBy || null,
    };
    this.clientFiles.set(id, file);

    // Log activity
    await this.createActivity({
      clientId: file.clientId,
      action: "file_uploaded",
      description: `File "${file.originalName}" was uploaded`,
      entityType: "file",
      entityId: id,
      metadata: null
    });

    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = this.clientFiles.get(id);
    if (!file) return false;

    this.clientFiles.delete(id);
    
    // Log activity
    await this.createActivity({
      clientId: file.clientId,
      action: "file_deleted",
      description: `File "${file.originalName}" was deleted`,
      entityType: "file",
      entityId: id,
      metadata: null
    });

    return true;
  }

  async getActivityByClient(clientId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLog.values())
      .filter(a => a.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createActivity(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentId++;
    const activity: ActivityLog = {
      ...insertActivity,
      id,
      createdAt: new Date(),
      entityType: insertActivity.entityType || null,
      entityId: insertActivity.entityId || null,
      metadata: insertActivity.metadata || {},
    };
    this.activityLog.set(id, activity);
    return activity;
  }
}

export const storage = new MemStorage();
