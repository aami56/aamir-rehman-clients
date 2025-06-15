import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertBillingSchema, insertCampaignSchema, insertClientNoteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const { search, status } = req.query;
      
      let clients = await storage.getClients();
      
      if (search) {
        clients = await storage.searchClients(search as string);
      }
      
      if (status && status !== 'all') {
        clients = clients.filter(client => client.status === status);
      }
      
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error: error.message });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data", error: error.message });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Billing routes
  app.get("/api/clients/:clientId/billing", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const billing = await storage.getBillingByClient(clientId);
      res.json(billing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  app.post("/api/clients/:clientId/billing", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const validatedData = insertBillingSchema.parse({
        ...req.body,
        clientId,
      });
      const billing = await storage.createBilling(validatedData);
      res.status(201).json(billing);
    } catch (error) {
      res.status(400).json({ message: "Invalid billing data", error: error.message });
    }
  });

  app.put("/api/billing/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBillingSchema.partial().parse(req.body);
      const billing = await storage.updateBilling(id, validatedData);
      
      if (!billing) {
        return res.status(404).json({ message: "Billing record not found" });
      }
      
      res.json(billing);
    } catch (error) {
      res.status(400).json({ message: "Invalid billing data", error: error.message });
    }
  });

  // Campaign routes
  app.get("/api/clients/:clientId/campaigns", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const campaigns = await storage.getCampaignsByClient(clientId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/clients/:clientId/campaigns", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const validatedData = insertCampaignSchema.parse({
        ...req.body,
        clientId,
      });
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data", error: error.message });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, validatedData);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data", error: error.message });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Notes routes
  app.get("/api/clients/:clientId/notes", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const notes = await storage.getNotesByClient(clientId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/clients/:clientId/notes", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const validatedData = insertClientNoteSchema.parse({
        ...req.body,
        clientId,
      });
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error: error.message });
    }
  });

  app.put("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientNoteSchema.partial().parse(req.body);
      const note = await storage.updateNote(id, validatedData);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data", error: error.message });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNote(id);
      
      if (!success) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // File upload routes
  app.post("/api/clients/:clientId/files", upload.single('file'), async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileData = {
        clientId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: "system", // In a real app, this would be the current user
        description: req.body.description || "",
      };
      
      const file = await storage.createFile(fileData);
      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/clients/:clientId/files", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const files = await storage.getFilesByClient(clientId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFile(id);
      
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Activity log routes
  app.get("/api/clients/:clientId/activity", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const activity = await storage.getActivityByClient(clientId);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity log" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const clients = await storage.getClients();
      const billingStats = await storage.getBillingStats();
      
      const totalClients = clients.length;
      const activeClients = clients.filter(c => c.status === 'active').length;
      const overdueClients = clients.filter(c => c.status === 'overdue').length;
      
      // Calculate total campaigns
      let totalCampaigns = 0;
      for (const client of clients) {
        const campaigns = await storage.getCampaignsByClient(client.id);
        totalCampaigns += campaigns.filter(c => c.status === 'active').length;
      }
      
      const stats = {
        totalClients,
        activeClients,
        overdueClients,
        activeCampaigns: totalCampaigns,
        monthlyRevenue: billingStats.totalRevenue,
        pendingPayments: billingStats.pendingAmount,
        paidCount: billingStats.paidCount,
        unpaidCount: billingStats.unpaidCount,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Export data routes
  app.get("/api/export/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      
      // Convert to CSV format
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Industry', 'Monthly Charge', 'Status'];
      const csvRows = [headers.join(',')];
      
      clients.forEach(client => {
        const row = [
          client.id,
          `"${client.name}"`,
          client.email,
          client.phone,
          client.industry || '',
          client.monthlyServiceCharge,
          client.status
        ];
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export clients" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
