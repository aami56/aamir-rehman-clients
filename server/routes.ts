import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertBillingSchema, insertCampaignSchema, insertClientNoteSchema, insertTaskSchema, insertTaskCommentSchema, users } from "@shared/schema";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = req.user as any;
    if (roles.includes(user.role)) {
      return next();
    }
    res.status(403).json({ message: "Insufficient permissions" });
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const SessionStore = MemoryStore(session);

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({ checkPeriod: 86400000 }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password !== hash) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  async function ensureDefaultUser() {
    const existing = await storage.getUserByUsername("admin");
    if (!existing) {
      const hash = crypto.createHash('sha256').update('admin123').digest('hex');
      await storage.createUser({
        username: "admin",
        password: hash,
        fullName: "Admin User",
        email: "admin@example.com",
        role: "owner",
      });
    }
  }
  ensureDefaultUser().catch(console.error);

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...safeUser } = req.user as any;
      return res.json(safeUser);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/auth/register", requireRole("owner"), async (req, res) => {
    try {
      const { username, password, fullName, email, role } = req.body;
      if (!username || !password || !fullName || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      const user = await storage.createUser({ username, password: hash, fullName, email, role: role || "manager" });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const { search, status } = req.query;
      let result = search ? await storage.searchClients(search as string) : await storage.getClients();
      if (status && status !== 'all') {
        result = result.filter(client => client.status === status);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid client data", error: error.message });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid client data", error: error.message });
    }
  });

  app.delete("/api/clients/:id", requireRole("owner", "manager"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      if (!success) return res.status(404).json({ message: "Client not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.get("/api/clients/:clientId/billing", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const billingData = await storage.getBillingByClient(clientId);
      res.json(billingData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  app.post("/api/clients/:clientId/billing", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const body = { ...req.body, clientId };
      if (body.paidDate && typeof body.paidDate === 'string') {
        body.paidDate = new Date(body.paidDate);
      }
      if (body.dueDate && typeof body.dueDate === 'string') {
        body.dueDate = new Date(body.dueDate);
      }
      const validatedData = insertBillingSchema.parse(body);
      const billingRecord = await storage.createBilling(validatedData);
      res.status(201).json(billingRecord);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid billing data", error: error.message });
    }
  });

  app.put("/api/billing/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.paidDate && typeof body.paidDate === 'string') {
        body.paidDate = new Date(body.paidDate);
      }
      if (body.dueDate && typeof body.dueDate === 'string') {
        body.dueDate = new Date(body.dueDate);
      }
      const validatedData = insertBillingSchema.partial().parse(body);
      const billingRecord = await storage.updateBilling(id, validatedData);
      if (!billingRecord) return res.status(404).json({ message: "Billing record not found" });
      res.json(billingRecord);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid billing data", error: error.message });
    }
  });

  app.post("/api/billing/generate-monthly", requireRole("owner", "manager"), async (req, res) => {
    try {
      const { month, year, dueDays } = req.body;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }
      const result = await storage.generateMonthlyInvoices(month, year, dueDays || 15);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate invoices" });
    }
  });

  app.get("/api/billing/aging", requireAuth, async (req, res) => {
    try {
      const report = await storage.getAgingReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch aging report" });
    }
  });

  app.get("/api/billing/reconciliation", requireAuth, async (req, res) => {
    try {
      const data = await storage.getReconciliation();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reconciliation data" });
    }
  });

  app.get("/api/billing/all", requireAuth, async (req, res) => {
    try {
      const allBilling = await storage.getAllBilling();
      res.json(allBilling);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  app.get("/api/clients/:clientId/campaigns", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const campaignsList = await storage.getCampaignsByClient(clientId);
      res.json(campaignsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/clients/:clientId/campaigns", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const body = { ...req.body, clientId };
      if (body.startDate && typeof body.startDate === 'string') body.startDate = new Date(body.startDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const validatedData = insertCampaignSchema.parse(body);
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid campaign data", error: error.message });
    }
  });

  app.put("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.startDate && typeof body.startDate === 'string') body.startDate = new Date(body.startDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const validatedData = insertCampaignSchema.partial().parse(body);
      const campaign = await storage.updateCampaign(id, validatedData);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid campaign data", error: error.message });
    }
  });

  app.delete("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      if (!success) return res.status(404).json({ message: "Campaign not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.get("/api/campaigns/all", requireAuth, async (req, res) => {
    try {
      const allCampaigns = await storage.getAllCampaigns();
      res.json(allCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.put("/api/campaigns/:id/roi", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { performance, roiScore } = req.body;
      const campaign = await storage.updateCampaign(id, { performance, roiScore });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/clients/:clientId/notes", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const notes = await storage.getNotesByClient(clientId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/clients/:clientId/notes", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const body = { ...req.body, clientId };
      if (body.dueDate && typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
      const validatedData = insertClientNoteSchema.parse(body);
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid note data", error: error.message });
    }
  });

  app.put("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
      const validatedData = insertClientNoteSchema.partial().parse(body);
      const note = await storage.updateNote(id, validatedData);
      if (!note) return res.status(404).json({ message: "Note not found" });
      res.json(note);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid note data", error: error.message });
    }
  });

  app.delete("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNote(id);
      if (!success) return res.status(404).json({ message: "Note not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  app.get("/api/tasks/today", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTodaysTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's tasks" });
    }
  });

  app.get("/api/tasks/overdue-legacy", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getOverdueTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue tasks" });
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { status, priority, clientId, campaignId, assignedTo, search, label } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (clientId) filters.clientId = parseInt(clientId as string);
      if (campaignId) filters.campaignId = parseInt(campaignId as string);
      if (assignedTo) filters.assignedTo = parseInt(assignedTo as string);
      if (search) filters.search = search;
      if (label) filters.label = label;
      const result = await storage.getTasks(filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getTaskStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });

  app.get("/api/tasks/my-day", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const result = await storage.getMyDayTasks(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch my day tasks" });
    }
  });

  app.get("/api/tasks/overdue", requireAuth, async (req, res) => {
    try {
      const result = await storage.getOverdueTasksList();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue tasks" });
    }
  });

  app.get("/api/tasks/upcoming/:days", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 7;
      const result = await storage.getUpcomingTasks(days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming tasks" });
    }
  });

  app.get("/api/tasks/calendar", requireAuth, async (req, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) return res.status(400).json({ message: "start and end dates required" });
      const result = await storage.getTasksByDateRange(new Date(start as string), new Date(end as string));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar tasks" });
    }
  });

  app.get("/api/tasks/aging", requireAuth, async (req, res) => {
    try {
      const report = await storage.getTaskAgingReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task aging report" });
    }
  });

  app.get("/api/tasks/completion-rate", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getCompletionRateStats(days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch completion rate" });
    }
  });

  app.get("/api/tasks/productivity", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getProductivityMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch productivity metrics" });
    }
  });

  app.get("/api/tasks/export", requireAuth, async (req, res) => {
    try {
      const allTasks = await storage.getTasks();
      const format = req.query.format || "csv";

      if (format === "csv") {
        const headers = ['ID', 'Title', 'Status', 'Priority', 'Client', 'Campaign', 'Assigned To', 'Due Date', 'Labels', 'Time Estimate', 'Time Actual', 'Created At'];
        const csvRows = [headers.join(',')];
        allTasks.forEach(t => {
          csvRows.push([
            t.id,
            `"${(t.title || '').replace(/"/g, '""')}"`,
            t.status,
            t.priority,
            `"${t.clientName || ''}"`,
            `"${t.campaignName || ''}"`,
            `"${t.assignedToName || ''}"`,
            t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
            `"${(t.labels || []).join('; ')}"`,
            t.timeEstimate || '',
            t.timeActual || '',
            new Date(t.createdAt).toISOString().split('T')[0],
          ].join(','));
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
        res.send(csvRows.join('\n'));
      } else {
        res.json(allTasks);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export tasks" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      body.createdBy = (req.user as any)?.id;
      if (body.dueDate && typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
      if (body.slaDeadline && typeof body.slaDeadline === 'string') body.slaDeadline = new Date(body.slaDeadline);
      const task = await storage.createTask(body);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid task data", error: error.message });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === 'string') body.dueDate = new Date(body.dueDate);
      if (body.slaDeadline && typeof body.slaDeadline === 'string') body.slaDeadline = new Date(body.slaDeadline);
      if (body.status === 'done' && !body.completedAt) {
        body.completedAt = new Date();
      }
      if (body.status && body.status !== 'done') {
        body.completedAt = null;
      }
      const task = await storage.updateTask(id, body);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid task data", error: error.message });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);
      if (!success) return res.status(404).json({ message: "Task not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.duplicateTask(id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate task" });
    }
  });

  app.post("/api/tasks/bulk-status", requireAuth, async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!ids || !Array.isArray(ids) || !status) {
        return res.status(400).json({ message: "ids array and status are required" });
      }
      const updated = await storage.bulkUpdateTaskStatus(ids, status);
      res.json({ updated });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk update tasks" });
    }
  });

  app.post("/api/tasks/:id/snooze", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { days } = req.body;
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + (days || 1));
      const task = await storage.updateTask(id, { dueDate: newDate });
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to snooze task" });
    }
  });

  app.get("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const comment = await storage.createTaskComment({
        taskId,
        userId,
        content: req.body.content,
      });
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const result = await storage.getNotifications(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      }).from(users);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/clients/:clientId/files", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const fileData = {
        clientId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: (req.user as any)?.fullName || "system",
        description: req.body.description || "",
        category: req.body.category || "general",
      };

      const file = await storage.createFile(fileData);
      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/clients/:clientId/files", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const files = await storage.getFilesByClient(clientId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      if (!file) return res.status(404).json({ message: "File not found" });
      if (!fs.existsSync(file.filePath)) return res.status(404).json({ message: "File not found on disk" });
      res.download(file.filePath, file.originalName);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      if (file && fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
      const success = await storage.deleteFile(id);
      if (!success) return res.status(404).json({ message: "File not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.get("/api/clients/:clientId/activity", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const activity = await storage.getActivityByClient(clientId);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity log" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const clientsList = await storage.getClients();
      const billingStats = await storage.getBillingStats();

      const totalClients = clientsList.length;
      const activeClients = clientsList.filter(c => c.status === 'active').length;
      const overdueClients = clientsList.filter(c => c.status === 'overdue').length;

      let totalCampaigns = 0;
      for (const client of clientsList) {
        const campaignsList = await storage.getCampaignsByClient(client.id);
        totalCampaigns += campaignsList.filter(c => c.status === 'active').length;
      }

      res.json({
        totalClients,
        activeClients,
        overdueClients,
        activeCampaigns: totalCampaigns,
        monthlyRevenue: billingStats.totalRevenue,
        pendingPayments: billingStats.pendingAmount,
        paidCount: billingStats.paidCount,
        unpaidCount: billingStats.unpaidCount,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/export/clients", requireAuth, async (req, res) => {
    try {
      const clientsList = await storage.getClients();
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Industry', 'Monthly Charge', 'Status'];
      const csvRows = [headers.join(',')];

      clientsList.forEach(client => {
        csvRows.push([
          client.id,
          `"${client.name}"`,
          client.email,
          client.phone,
          client.industry || '',
          client.monthlyServiceCharge,
          client.status
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
      res.send(csvRows.join('\n'));
    } catch (error) {
      res.status(500).json({ message: "Failed to export clients" });
    }
  });

  app.post("/api/import/clients", requireRole("owner", "manager"), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ message: "CSV must have a header and at least one row" });

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const results: { imported: number; errors: string[] } = { imported: 0, errors: [] };

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

          const clientData = {
            name: row.name || row.client || '',
            email: row.email || '',
            phone: row.phone || '',
            monthlyServiceCharge: row['monthly charge'] || row.monthlyservicecharge || row.amount || '0',
            status: row.status || 'active',
            industry: row.industry || undefined,
            website: row.website || undefined,
            contactPerson: row['contact person'] || row.contactperson || undefined,
            address: row.address || undefined,
          };

          if (!clientData.name || !clientData.email || !clientData.phone) {
            results.errors.push(`Row ${i}: Missing required fields (name, email, phone)`);
            continue;
          }

          await storage.createClient(clientData as any);
          results.imported++;
        } catch (err: any) {
          results.errors.push(`Row ${i}: ${err.message}`);
        }
      }

      fs.unlinkSync(req.file.path);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Import failed" });
    }
  });

  app.post("/api/import/billing", requireRole("owner", "manager"), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ message: "CSV must have a header and at least one row" });

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const results: { imported: number; errors: string[] } = { imported: 0, errors: [] };

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

          const billingData = {
            clientId: parseInt(row['client id'] || row.clientid || '0'),
            month: parseInt(row.month || '0'),
            year: parseInt(row.year || '0'),
            amount: row.amount || '0',
            isPaid: row['is paid'] === 'true' || row.ispaid === 'true',
            paymentMethod: row['payment method'] || row.paymentmethod || undefined,
          };

          if (!billingData.clientId || !billingData.month || !billingData.year) {
            results.errors.push(`Row ${i}: Missing required fields (clientId, month, year)`);
            continue;
          }

          await storage.createBilling(billingData as any);
          results.imported++;
        } catch (err: any) {
          results.errors.push(`Row ${i}: ${err.message}`);
        }
      }

      fs.unlinkSync(req.file.path);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Import failed" });
    }
  });

  app.post("/api/invoice/token", requireAuth, async (req, res) => {
    try {
      const { billingId, clientId, expiryHours } = req.body;
      if (!billingId || !clientId) {
        return res.status(400).json({ message: "billingId and clientId required" });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + (expiryHours || 72) * 60 * 60 * 1000);

      const invoiceToken = await storage.createInvoiceToken({
        token,
        billingId,
        clientId,
        expiresAt,
      });

      res.json({ token: invoiceToken.token, expiresAt: invoiceToken.expiresAt });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create token" });
    }
  });

  app.get("/api/invoice/public/:token", async (req, res) => {
    try {
      const invoiceToken = await storage.getInvoiceToken(req.params.token);
      if (!invoiceToken) return res.status(404).json({ message: "Invalid invoice link" });
      if (new Date() > invoiceToken.expiresAt) return res.status(410).json({ message: "Invoice link has expired" });

      const billingRecord = await storage.getBilling(invoiceToken.billingId);
      const client = await storage.getClient(invoiceToken.clientId);

      if (!billingRecord || !client) return res.status(404).json({ message: "Invoice not found" });

      res.json({ billing: billingRecord, client });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
