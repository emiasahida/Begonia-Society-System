import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import multer from "multer";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { insertSpeciesSchema, insertMemberSchema, type RejectionCode, type UserRole } from "@shared/schema";
import { z } from "zod";

// Validation schemas
const createMemberSchema = z.object({
  memberNumber: z.string().optional(),
  displayName: z.string().min(1),
  role: z.enum(["member", "admin", "reviewer"]).default("member"),
  status: z.enum(["pending", "active", "inactive", "suspended"]).default("pending"),
});

const updateMemberSchema = createMemberSchema.partial();

const uploadPhotoSchema = z.object({
  speciesId: z.string().optional(),
  credit: z.string().min(1, "Credit is required"),
});

const rejectSubmissionSchema = z.object({
  code: z.enum(["R01", "R02", "R03", "R04", "R05"]),
});

const upload = multer({ 
  dest: "/tmp/uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middleware to get current member and check role
async function getMember(req: Request): Promise<{ id: string; role: UserRole } | null> {
  const user = (req as any).user;
  if (!user?.claims?.sub) return null;
  const member = await storage.getMemberByUserId(user.claims.sub);
  if (!member || member.status !== "active") return null;
  return { id: member.id, role: member.role };
}

function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const member = await getMember(req);
    if (!member) {
      return res.status(403).json({ message: "Member not found or inactive" });
    }
    if (!roles.includes(member.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    (req as any).member = member;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // ===== Public Stats =====
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ===== Current Member =====
  app.get("/api/me", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let member = await storage.getMemberByUserId(user.claims.sub);
      
      // Auto-create member if not exists (pending approval)
      if (!member) {
        member = await storage.createMember({
          userId: user.claims.sub,
          displayName: user.claims.first_name || user.claims.email || "会員",
          role: "member",
          status: "pending",
        });
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  // Update own display name
  app.patch("/api/me", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const member = await storage.getMemberByUserId(user.claims.sub);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      const updateSchema = z.object({
        displayName: z.string().min(1, "表示名は必須です").max(100),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid input",
          errors: parsed.error.errors 
        });
      }
      
      const updated = await storage.updateMember(member.id, {
        displayName: parsed.data.displayName,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== Species API =====
  app.get("/api/species", isAuthenticated, async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const classification = (req.query.classification as string) || undefined;
      
      const result = await storage.searchSpecies(q, page, limit, classification);
      const isAdmin = (req as any).member?.role === "admin";
      const data = isAdmin ? result.data : result.data.map(({ adminComment, ...rest }: any) => rest);
      res.json({
        data,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      console.error("Error searching species:", error);
      res.status(500).json({ message: "Failed to search species" });
    }
  });

  app.get("/api/species/classifications", isAuthenticated, async (req, res) => {
    try {
      const classifications = await storage.getDistinctClassifications();
      res.json(classifications);
    } catch (error) {
      console.error("Error fetching classifications:", error);
      res.status(500).json({ message: "Failed to fetch classifications" });
    }
  });

  app.get("/api/species/recent", isAuthenticated, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const result = await storage.getRecentSpecies(limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching recent species:", error);
      res.status(500).json({ message: "Failed to fetch recent species" });
    }
  });

  app.get("/api/species/:id", isAuthenticated, async (req, res) => {
    try {
      const species = await storage.getSpecies(req.params.id);
      if (!species) {
        return res.status(404).json({ message: "Species not found" });
      }
      const photos = await storage.getPhotosBySpeciesId(req.params.id);
      const result: any = { ...species, photos };
      if ((req as any).member?.role !== "admin") {
        delete result.adminComment;
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching species:", error);
      res.status(500).json({ message: "Failed to fetch species" });
    }
  });

  // ===== Admin Species API =====
  app.post("/api/admin/species", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const data = insertSpeciesSchema.parse(req.body);
      const species = await storage.createSpecies(data);
      await storage.createAuditLog({
        action: "species.create",
        entityType: "species",
        entityId: species.id,
        performedBy: (req as any).member.id,
        details: { scientificName: species.scientificName },
      });
      res.status(201).json(species);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating species:", error);
      res.status(500).json({ message: "Failed to create species" });
    }
  });

  app.patch("/api/admin/species/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const data = insertSpeciesSchema.partial().parse(req.body);
      const species = await storage.updateSpecies(req.params.id, data);
      if (!species) {
        return res.status(404).json({ message: "Species not found" });
      }
      await storage.createAuditLog({
        action: "species.update",
        entityType: "species",
        entityId: species.id,
        performedBy: (req as any).member.id,
        details: data,
      });
      res.json(species);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating species:", error);
      res.status(500).json({ message: "Failed to update species" });
    }
  });

  app.delete("/api/admin/species/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteSpecies(req.params.id);
      await storage.createAuditLog({
        action: "species.delete",
        entityType: "species",
        entityId: req.params.id,
        performedBy: (req as any).member.id,
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting species:", error);
      res.status(500).json({ message: "Failed to delete species" });
    }
  });

  app.post("/api/admin/species/import", isAuthenticated, requireRole("admin"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = fs.readFileSync(req.file.path, "utf-8");
      const lines = content.split("\n").filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      let imported = 0;

      for (const line of dataLines) {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        // CSV format: 出典(0), 品種名(1), 交配親・産地(2), 分類(3), 花色(4), 作出命名者(5), 所属・Sec/原種(6), 発表見/掲載(7), 読み(8), 掲載(9)
        const scientificName = cols[1]?.trim();
        if (!scientificName) continue;

        try {
          await storage.createSpecies({
            scientificName,
            notes: cols[2] || null,
            classification: cols[3] || null,
            flowerColor: cols[4] || null,
            authorName: cols[5] || null,
            origin: [cols[0], cols[6], cols[7], cols[9]].filter(Boolean).join(" ").trim() || null,
            japaneseName: cols[8] || null,
          });
          imported++;
        } catch (e) {
          // Skip duplicates
        }
      }

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      await storage.createAuditLog({
        action: "species.import",
        entityType: "species",
        performedBy: (req as any).member.id,
        details: { imported },
      });

      res.json({ imported });
    } catch (error) {
      console.error("Error importing species:", error);
      res.status(500).json({ message: "Failed to import species" });
    }
  });

  // ===== Admin Members API =====
  app.get("/api/admin/members", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const members = await storage.searchMembers(q);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/admin/members", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const data = createMemberSchema.parse(req.body);
      const member = await storage.createMember(data);
      await storage.createAuditLog({
        action: "member.create",
        entityType: "member",
        entityId: member.id,
        performedBy: (req as any).member.id,
      });
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.patch("/api/admin/members/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const data = updateMemberSchema.parse(req.body);
      const member = await storage.updateMember(req.params.id, data);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      await storage.createAuditLog({
        action: "member.update",
        entityType: "member",
        entityId: member.id,
        performedBy: (req as any).member.id,
        details: data,
      });
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // ===== Admin Photos API =====
  app.get("/api/admin/photos", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const photos = await storage.getPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.get("/api/admin/submissions/pending", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const submissions = await storage.getPendingSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
      res.status(500).json({ message: "Failed to fetch pending submissions" });
    }
  });

  app.post("/api/admin/photos", isAuthenticated, requireRole("admin"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const validationResult = uploadPhotoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid input", errors: validationResult.error.errors });
      }
      const { speciesId, credit } = validationResult.data;

      const uuid = randomUUID();
      const ext = ".jpg";
      const fileKey = `${uuid}${ext}`;
      const thumbKey = `${uuid}_thumb${ext}`;
      const destPath = path.join(UPLOADS_DIR, fileKey);
      const thumbPath = path.join(UPLOADS_DIR, thumbKey);

      const srcBuffer = fs.readFileSync(req.file.path);

      await sharp(srcBuffer)
        .rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(destPath);

      await sharp(srcBuffer)
        .rotate()
        .resize({ width: 400, height: 400, fit: "cover", position: "centre" })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      fs.unlinkSync(req.file.path);

      const memberId = (req as any).member.id;

      // If speciesId is provided, auto-approve and create photo directly
      if (speciesId) {
        const photo = await storage.createPhoto({
          speciesId,
          memberId,
          fileKey,
          thumbKey,
          credit,
        });
        await storage.createAuditLog({
          action: "photo.create",
          entityType: "photo",
          entityId: photo.id,
          performedBy: memberId,
        });
        res.status(201).json(photo);
      } else {
        // Create as pending submission
        const terms = await storage.getLatestTerms();
        const submission = await storage.createSubmission({
          memberId,
          fileKey,
          thumbKey,
          credit,
          termsVersion: terms?.version || "v1.0",
          termsAcceptedAt: new Date(),
        });
        res.status(201).json(submission);
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.delete("/api/admin/photos/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      await storage.deletePhoto(req.params.id);
      await storage.createAuditLog({
        action: "photo.delete",
        entityType: "photo",
        entityId: req.params.id,
        performedBy: (req as any).member.id,
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // ===== Review API =====
  app.get("/api/review/queue", isAuthenticated, requireRole("reviewer"), async (req, res) => {
    try {
      const queue = await storage.getSubmissionQueue();
      
      // Enrich with species and member names
      const enriched = await Promise.all(queue.map(async (sub) => {
        let speciesName: string | undefined;
        let memberName: string | undefined;
        
        if (sub.speciesId) {
          const species = await storage.getSpecies(sub.speciesId);
          speciesName = species?.scientificName;
        }
        
        const member = await storage.getMember(sub.memberId);
        memberName = member?.displayName;
        
        return { ...sub, speciesName, memberName };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching review queue:", error);
      res.status(500).json({ message: "Failed to fetch review queue" });
    }
  });

  app.post("/api/review/:id/approve", isAuthenticated, requireRole("reviewer"), async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      if (submission.status !== "submitted") {
        return res.status(400).json({ message: "Submission already processed" });
      }
      if (!submission.speciesId) {
        return res.status(400).json({ message: "Species must be specified before approval" });
      }

      const reviewerId = (req as any).member.id;
      
      // Approve submission
      await storage.approveSubmission(req.params.id, reviewerId);
      
      // Create photo record
      if (submission.fileKey) {
        await storage.createPhoto({
          speciesId: submission.speciesId,
          memberId: submission.memberId,
          fileKey: submission.fileKey,
          thumbKey: submission.thumbKey,
          credit: submission.credit,
        });
      }
      
      await storage.createAuditLog({
        action: "submission.approve",
        entityType: "photo_submission",
        entityId: req.params.id,
        performedBy: reviewerId,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving submission:", error);
      res.status(500).json({ message: "Failed to approve submission" });
    }
  });

  app.post("/api/review/:id/reject", isAuthenticated, requireRole("reviewer"), async (req, res) => {
    try {
      const validationResult = rejectSubmissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Valid rejection code is required", errors: validationResult.error.errors });
      }
      const { code } = validationResult.data;

      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      if (submission.status !== "submitted") {
        return res.status(400).json({ message: "Submission already processed" });
      }

      const reviewerId = (req as any).member.id;

      // Delete file immediately
      if (submission.fileKey) {
        const filePath = path.join(UPLOADS_DIR, submission.fileKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (submission.thumbKey) {
        const thumbPath = path.join(UPLOADS_DIR, submission.thumbKey);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }

      // Reject submission
      await storage.rejectSubmission(req.params.id, reviewerId, code as RejectionCode);
      
      await storage.createAuditLog({
        action: "submission.reject",
        entityType: "photo_submission",
        entityId: req.params.id,
        performedBy: reviewerId,
        details: { code },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting submission:", error);
      res.status(500).json({ message: "Failed to reject submission" });
    }
  });

  // ===== File Serving API =====
  app.get("/api/files/:key", isAuthenticated, async (req, res) => {
    try {
      const filePath = path.join(UPLOADS_DIR, req.params.key);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  return httpServer;
}
