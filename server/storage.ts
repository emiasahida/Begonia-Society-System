import {
  species, members, photos, photoSubmissions, auditLogs, termsVersions, featureFlags,
  type Species, type InsertSpecies,
  type Member, type InsertMember,
  type Photo, type InsertPhoto,
  type PhotoSubmission, type InsertPhotoSubmission,
  type AuditLog, type InsertAuditLog,
  type TermsVersion, type InsertTermsVersion,
  type FeatureFlag, type InsertFeatureFlag,
  type RejectionCode
} from "@shared/schema";
import { db } from "./db";
import { eq, like, or, desc, asc, sql, and, lt } from "drizzle-orm";

export interface IStorage {
  // Species
  getSpecies(id: string): Promise<Species | undefined>;
  searchSpecies(query: string, page: number, limit: number, classification?: string): Promise<{ data: Species[]; total: number }>;
  getDistinctClassifications(): Promise<string[]>;
  getRecentSpecies(limit: number): Promise<Species[]>;
  createSpecies(data: InsertSpecies): Promise<Species>;
  updateSpecies(id: string, data: Partial<InsertSpecies>): Promise<Species | undefined>;
  deleteSpecies(id: string): Promise<boolean>;

  // Members
  getMember(id: string): Promise<Member | undefined>;
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  searchMembers(query: string): Promise<Member[]>;
  createMember(data: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined>;

  // Photos
  getPhotos(): Promise<Photo[]>;
  getPhotosBySpeciesId(speciesId: string): Promise<Photo[]>;
  createPhoto(data: InsertPhoto): Promise<Photo>;
  deletePhoto(id: string): Promise<boolean>;

  // Photo Submissions
  getSubmission(id: string): Promise<PhotoSubmission | undefined>;
  getSubmissionQueue(): Promise<PhotoSubmission[]>;
  getPendingSubmissions(): Promise<PhotoSubmission[]>;
  getExpiredSubmissions(days: number): Promise<PhotoSubmission[]>;
  createSubmission(data: InsertPhotoSubmission): Promise<PhotoSubmission>;
  approveSubmission(id: string, reviewerId: string): Promise<PhotoSubmission | undefined>;
  rejectSubmission(id: string, reviewerId: string, code: RejectionCode): Promise<PhotoSubmission | undefined>;
  deleteSubmission(id: string): Promise<boolean>;

  // Audit Logs
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  // Terms
  getLatestTerms(): Promise<TermsVersion | undefined>;
  createTerms(data: InsertTermsVersion): Promise<TermsVersion>;

  // Feature Flags
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  setFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag>;

  // Stats
  getStats(): Promise<{ totalSpecies: number; totalPhotos: number }>;
}

export class DatabaseStorage implements IStorage {
  // Species
  async getSpecies(id: string): Promise<Species | undefined> {
    const [result] = await db.select().from(species).where(eq(species.id, id));
    return result;
  }

  async searchSpecies(query: string, page: number, limit: number, classification?: string): Promise<{ data: Species[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const conditions = [];
    
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(or(
        like(species.scientificName, searchPattern),
        like(species.authorName, searchPattern),
        like(species.notes, searchPattern),
        like(species.japaneseName, searchPattern)
      ));
    }
    
    if (classification) {
      conditions.push(eq(species.classification, classification));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(species)
      .where(whereClause);

    const data = await db
      .select()
      .from(species)
      .where(whereClause)
      .orderBy(asc(species.scientificName))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult?.count || 0 };
  }

  async getDistinctClassifications(): Promise<string[]> {
    const results = await db
      .select({ 
        classification: species.classification,
        count: sql<number>`count(*)::int`
      })
      .from(species)
      .where(sql`${species.classification} IS NOT NULL AND ${species.classification} != ''`)
      .groupBy(species.classification)
      .having(sql`count(*) >= 50`)
      .orderBy(sql`count(*) DESC`);
    
    return results.map(r => r.classification).filter((c): c is string => c !== null);
  }

  async getRecentSpecies(limit: number): Promise<Species[]> {
    return db
      .select()
      .from(species)
      .orderBy(desc(species.createdAt))
      .limit(limit);
  }

  async createSpecies(data: InsertSpecies): Promise<Species> {
    const [result] = await db.insert(species).values(data).returning();
    return result;
  }

  async updateSpecies(id: string, data: Partial<InsertSpecies>): Promise<Species | undefined> {
    const [result] = await db
      .update(species)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(species.id, id))
      .returning();
    return result;
  }

  async deleteSpecies(id: string): Promise<boolean> {
    const result = await db.delete(species).where(eq(species.id, id));
    return true;
  }

  // Members
  async getMember(id: string): Promise<Member | undefined> {
    const [result] = await db.select().from(members).where(eq(members.id, id));
    return result;
  }

  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [result] = await db.select().from(members).where(eq(members.userId, userId));
    return result;
  }

  async searchMembers(query: string): Promise<Member[]> {
    let whereClause;
    if (query) {
      const searchPattern = `%${query}%`;
      whereClause = or(
        like(members.memberNumber, searchPattern),
        like(members.displayName, searchPattern)
      );
    }
    return db.select().from(members).where(whereClause).orderBy(asc(members.displayName));
  }

  async createMember(data: InsertMember): Promise<Member> {
    const [result] = await db.insert(members).values(data).returning();
    return result;
  }

  async updateMember(id: string, data: Partial<InsertMember>): Promise<Member | undefined> {
    const [result] = await db
      .update(members)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return result;
  }

  // Photos
  async getPhotos(): Promise<(Photo & { species?: { scientificName: string; japaneseName: string | null } })[]> {
    const results = await db
      .select({
        id: photos.id,
        speciesId: photos.speciesId,
        memberId: photos.memberId,
        fileKey: photos.fileKey,
        credit: photos.credit,
        createdAt: photos.createdAt,
        updatedAt: photos.updatedAt,
        speciesName: species.scientificName,
        speciesJapaneseName: species.japaneseName,
      })
      .from(photos)
      .leftJoin(species, eq(photos.speciesId, species.id))
      .orderBy(desc(photos.createdAt));
    
    return results.map(r => ({
      id: r.id,
      speciesId: r.speciesId,
      memberId: r.memberId,
      fileKey: r.fileKey,
      credit: r.credit,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      species: r.speciesName ? { scientificName: r.speciesName, japaneseName: r.speciesJapaneseName } : undefined,
    }));
  }

  async getPhotosBySpeciesId(speciesId: string): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.speciesId, speciesId));
  }

  async createPhoto(data: InsertPhoto): Promise<Photo> {
    const [result] = await db.insert(photos).values(data).returning();
    return result;
  }

  async deletePhoto(id: string): Promise<boolean> {
    await db.delete(photos).where(eq(photos.id, id));
    return true;
  }

  // Photo Submissions
  async getSubmission(id: string): Promise<PhotoSubmission | undefined> {
    const [result] = await db.select().from(photoSubmissions).where(eq(photoSubmissions.id, id));
    return result;
  }

  async getSubmissionQueue(): Promise<PhotoSubmission[]> {
    return db
      .select()
      .from(photoSubmissions)
      .where(eq(photoSubmissions.status, "submitted"))
      .orderBy(asc(photoSubmissions.createdAt));
  }

  async getPendingSubmissions(): Promise<PhotoSubmission[]> {
    return db
      .select()
      .from(photoSubmissions)
      .where(
        and(
          eq(photoSubmissions.status, "submitted"),
          sql`${photoSubmissions.speciesId} IS NULL`
        )
      )
      .orderBy(asc(photoSubmissions.createdAt));
  }

  async getExpiredSubmissions(days: number): Promise<PhotoSubmission[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return db
      .select()
      .from(photoSubmissions)
      .where(
        and(
          eq(photoSubmissions.status, "submitted"),
          lt(photoSubmissions.createdAt, cutoffDate)
        )
      );
  }

  async createSubmission(data: InsertPhotoSubmission): Promise<PhotoSubmission> {
    const [result] = await db.insert(photoSubmissions).values(data).returning();
    return result;
  }

  async approveSubmission(id: string, reviewerId: string): Promise<PhotoSubmission | undefined> {
    const [result] = await db
      .update(photoSubmissions)
      .set({
        status: "approved",
        reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(photoSubmissions.id, id))
      .returning();
    return result;
  }

  async rejectSubmission(id: string, reviewerId: string, code: RejectionCode): Promise<PhotoSubmission | undefined> {
    const [result] = await db
      .update(photoSubmissions)
      .set({
        status: "rejected",
        rejectionCode: code,
        reviewerId,
        reviewedAt: new Date(),
        fileKey: null,
        thumbKey: null,
        updatedAt: new Date(),
      })
      .where(eq(photoSubmissions.id, id))
      .returning();
    return result;
  }

  async deleteSubmission(id: string): Promise<boolean> {
    await db.delete(photoSubmissions).where(eq(photoSubmissions.id, id));
    return true;
  }

  // Audit Logs
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(data).returning();
    return result;
  }

  // Terms
  async getLatestTerms(): Promise<TermsVersion | undefined> {
    const [result] = await db
      .select()
      .from(termsVersions)
      .orderBy(desc(termsVersions.createdAt))
      .limit(1);
    return result;
  }

  async createTerms(data: InsertTermsVersion): Promise<TermsVersion> {
    const [result] = await db.insert(termsVersions).values(data).returning();
    return result;
  }

  // Feature Flags
  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [result] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return result;
  }

  async setFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(key);
    if (existing) {
      const [result] = await db
        .update(featureFlags)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(featureFlags.key, key))
        .returning();
      return result;
    }
    const [result] = await db.insert(featureFlags).values({ key, enabled }).returning();
    return result;
  }

  // Stats
  async getStats(): Promise<{ totalSpecies: number; totalPhotos: number }> {
    const [speciesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(species);
    const [photosCount] = await db.select({ count: sql<number>`count(*)::int` }).from(photos);
    return {
      totalSpecies: speciesCount?.count || 0,
      totalPhotos: photosCount?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
