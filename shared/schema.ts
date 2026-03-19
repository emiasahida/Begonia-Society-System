import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ========================================
// Roles and Status Enums
// ========================================
export const userRoles = ["member", "admin", "reviewer"] as const;
export type UserRole = typeof userRoles[number];

export const memberStatuses = ["pending", "active", "inactive", "suspended"] as const;
export type MemberStatus = typeof memberStatuses[number];

export const submissionStatuses = ["submitted", "approved", "rejected"] as const;
export type SubmissionStatus = typeof submissionStatuses[number];

export const rejectionCodes = ["R01", "R02", "R03", "R04", "R05"] as const;
export type RejectionCode = typeof rejectionCodes[number];

export const rejectionReasons: Record<RejectionCode, string> = {
  R01: "本人撮影であることを確認できませんでした。本人が撮影した写真のみ受付しています。",
  R02: "写真内に個人情報につながる要素が含まれる可能性がありました。人物と住所が写らない写真でお願いします。",
  R03: "掲載に必要な画質を満たしませんでした。明るい場所でピントが合った写真を用意してください。",
  R04: "同定に必要な情報が不足していました。葉の表裏と株全体等、判別できる情報を含めてください。",
  R05: "規約に抵触する可能性がありました。",
};

// ========================================
// Members Table (extends auth users)
// ========================================
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => {
    const { users } = require("./models/auth");
    return users.id;
  }),
  memberNumber: varchar("member_number").unique(),
  displayName: varchar("display_name"),
  role: varchar("role").$type<UserRole>().default("member").notNull(),
  status: varchar("status").$type<MemberStatus>().default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

// ========================================
// Species Master Table
// ========================================
export const species = pgTable("species", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scientificName: text("scientific_name").notNull(),
  authorName: text("author_name"),
  notes: text("notes"),
  classification: text("classification"),
  flowerColor: text("flower_color"),
  origin: text("origin"),
  japaneseName: text("japanese_name"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_species_scientific_name").on(table.scientificName),
  index("idx_species_japanese_name").on(table.japaneseName),
]);

export const insertSpeciesSchema = createInsertSchema(species).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpecies = z.infer<typeof insertSpeciesSchema>;
export type Species = typeof species.$inferSelect;

// ========================================
// Terms Versions Table
// ========================================
export const termsVersions = pgTable("terms_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version").notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTermsVersionSchema = createInsertSchema(termsVersions).omit({
  id: true,
  createdAt: true,
});
export type InsertTermsVersion = z.infer<typeof insertTermsVersionSchema>;
export type TermsVersion = typeof termsVersions.$inferSelect;

// ========================================
// Photos Table (approved/published photos)
// ========================================
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  speciesId: varchar("species_id").references(() => species.id).notNull(),
  memberId: varchar("member_id").references(() => members.id).notNull(),
  fileKey: varchar("file_key").notNull(),
  thumbKey: varchar("thumb_key"),
  credit: varchar("credit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_photos_species_id").on(table.speciesId),
]);

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// ========================================
// Photo Submissions Table (pending review)
// ========================================
export const photoSubmissions = pgTable("photo_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  speciesId: varchar("species_id").references(() => species.id),
  memberId: varchar("member_id").references(() => members.id).notNull(),
  fileKey: varchar("file_key"),
  thumbKey: varchar("thumb_key"),
  credit: varchar("credit").notNull(),
  status: varchar("status").$type<SubmissionStatus>().default("submitted").notNull(),
  termsVersion: varchar("terms_version").notNull(),
  termsAcceptedAt: timestamp("terms_accepted_at").notNull(),
  rejectionCode: varchar("rejection_code").$type<RejectionCode>(),
  reviewerId: varchar("reviewer_id").references(() => members.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_submissions_status").on(table.status),
  index("idx_submissions_created_at").on(table.createdAt),
]);

export const insertPhotoSubmissionSchema = createInsertSchema(photoSubmissions).omit({
  id: true,
  status: true,
  rejectionCode: true,
  reviewerId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPhotoSubmission = z.infer<typeof insertPhotoSubmissionSchema>;
export type PhotoSubmission = typeof photoSubmissions.$inferSelect;

// ========================================
// Invitations Table
// ========================================
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  createdBy: varchar("created_by").references(() => members.id).notNull(),
  note: varchar("note"),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  usedByMemberId: varchar("used_by_member_id").references(() => members.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  usedAt: true,
  usedByMemberId: true,
  createdAt: true,
});
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// ========================================
// Audit Logs Table
// ========================================
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  performedBy: varchar("performed_by").references(() => members.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========================================
// Feature Flags Table
// ========================================
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  updatedAt: true,
});
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// ========================================
// Relations
// ========================================
export const membersRelations = relations(members, ({ many }) => ({
  photos: many(photos),
  submissions: many(photoSubmissions),
  auditLogs: many(auditLogs),
}));

export const speciesRelations = relations(species, ({ many }) => ({
  photos: many(photos),
  submissions: many(photoSubmissions),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  species: one(species, {
    fields: [photos.speciesId],
    references: [species.id],
  }),
  member: one(members, {
    fields: [photos.memberId],
    references: [members.id],
  }),
}));

export const photoSubmissionsRelations = relations(photoSubmissions, ({ one }) => ({
  species: one(species, {
    fields: [photoSubmissions.speciesId],
    references: [species.id],
  }),
  member: one(members, {
    fields: [photoSubmissions.memberId],
    references: [members.id],
  }),
  reviewer: one(members, {
    fields: [photoSubmissions.reviewerId],
    references: [members.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  performer: one(members, {
    fields: [auditLogs.performedBy],
    references: [members.id],
  }),
}));
