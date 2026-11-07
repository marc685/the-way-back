import type { FamilyDoc } from './types';

/** Runs one SQL statement with $1… parameters and returns the rows. Neon in production, PGlite in tests. */
export type Sql = (text: string, params?: unknown[]) => Promise<any[]>;

export interface Device { familyId: string; memberId: string; push: PushSubscriptionJSON | null }
export interface PushSubscriptionJSON { endpoint: string; keys: { p256dh: string; auth: string } }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, doc JSONB NOT NULL, version INT NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS devices (token_hash TEXT PRIMARY KEY, family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE, member_id TEXT NOT NULL, push JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS devices_member ON devices (family_id, member_id)`,
  `CREATE TABLE IF NOT EXISTS join_codes (code TEXT PRIMARY KEY, family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE, member_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS join_attempts (ip TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())`,
];

export class Store {
  private ready: Promise<void> | null = null;
  constructor(private sql: Sql) {}

  private init() {
    this.ready ??= (async () => { for (const s of SCHEMA) await this.sql(s); })();
    return this.ready;
  }

  async createFamily(doc: FamilyDoc) {
    await this.init();
    await this.sql(`INSERT INTO families (id, doc) VALUES ($1, $2)`, [doc.id, JSON.stringify(doc)]);
  }

  async getFamily(id: string): Promise<{ doc: FamilyDoc; version: number } | null> {
    await this.init();
    const [row] = await this.sql(`SELECT doc, version FROM families WHERE id = $1`, [id]);
    return row ? { doc: typeof row.doc === 'string' ? JSON.parse(row.doc) : row.doc, version: row.version } : null;
  }

  /** Save only if nobody else saved in between (optimistic locking). */
  async saveFamily(doc: FamilyDoc, version: number): Promise<boolean> {
    await this.init();
    const rows = await this.sql(
      `UPDATE families SET doc = $2, version = version + 1, updated_at = now() WHERE id = $1 AND version = $3 RETURNING id`,
      [doc.id, JSON.stringify(doc), version]);
    return rows.length === 1;
  }

  async familyIds(): Promise<string[]> {
    await this.init();
    return (await this.sql(`SELECT id FROM families`)).map((r) => r.id);
  }

  async addDevice(tokenHash: string, familyId: string, memberId: string) {
    await this.init();
    await this.sql(`INSERT INTO devices (token_hash, family_id, member_id) VALUES ($1, $2, $3)`, [tokenHash, familyId, memberId]);
  }

  async findDevice(tokenHash: string): Promise<Device | null> {
    await this.init();
    const [r] = await this.sql(`SELECT family_id, member_id, push FROM devices WHERE token_hash = $1`, [tokenHash]);
    return r ? { familyId: r.family_id, memberId: r.member_id, push: r.push } : null;
  }

  /** Disconnect every phone of one person (used when they join on a new phone, or are removed). */
  async removeDevices(familyId: string, memberId: string, exceptHash?: string) {
    await this.init();
    await this.sql(`DELETE FROM devices WHERE family_id = $1 AND member_id = $2 AND token_hash <> $3`, [familyId, memberId, exceptHash ?? '']);
  }

  /** Which family members have a phone connected. */
  async connectedMembers(familyId: string): Promise<string[]> {
    await this.init();
    return (await this.sql(`SELECT DISTINCT member_id FROM devices WHERE family_id = $1`, [familyId])).map((r) => r.member_id);
  }

  async setPush(tokenHash: string, push: PushSubscriptionJSON | null) {
    await this.init();
    await this.sql(`UPDATE devices SET push = $2 WHERE token_hash = $1`, [tokenHash, push ? JSON.stringify(push) : null]);
  }

  async pushTargets(familyId: string, memberId: string): Promise<{ tokenHash: string; push: PushSubscriptionJSON }[]> {
    await this.init();
    const rows = await this.sql(`SELECT token_hash, push FROM devices WHERE family_id = $1 AND member_id = $2 AND push IS NOT NULL`, [familyId, memberId]);
    return rows.map((r) => ({ tokenHash: r.token_hash, push: typeof r.push === 'string' ? JSON.parse(r.push) : r.push }));
  }

  async addJoinCode(code: string, familyId: string, memberId: string, expiresAt: Date) {
    await this.init();
    // A new code replaces any unused older code for the same person.
    await this.sql(`DELETE FROM join_codes WHERE family_id = $1 AND member_id = $2 AND used_at IS NULL`, [familyId, memberId]);
    await this.sql(`INSERT INTO join_codes (code, family_id, member_id, expires_at) VALUES ($1, $2, $3, $4)`, [code, familyId, memberId, expiresAt.toISOString()]);
  }

  /** Use a join code exactly once. Returns null if unknown, used or expired. */
  async useJoinCode(code: string): Promise<{ familyId: string; memberId: string } | null> {
    await this.init();
    const [r] = await this.sql(
      `UPDATE join_codes SET used_at = now() WHERE code = $1 AND used_at IS NULL AND expires_at > now() RETURNING family_id, member_id`, [code]);
    return r ? { familyId: r.family_id, memberId: r.member_id } : null;
  }

  async failedJoins(ip: string): Promise<number> {
    await this.init();
    const [r] = await this.sql(`SELECT count(*)::int AS n FROM join_attempts WHERE ip = $1 AND at > now() - interval '15 minutes'`, [ip]);
    return r?.n ?? 0;
  }

  async recordFailedJoin(ip: string) {
    await this.init();
    await this.sql(`INSERT INTO join_attempts (ip) VALUES ($1)`, [ip]);
    await this.sql(`DELETE FROM join_attempts WHERE at < now() - interval '1 day'`);
  }
}
