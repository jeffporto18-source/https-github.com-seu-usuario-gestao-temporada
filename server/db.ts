import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clients,
  properties,
  ledgerEntries,
  reservations,
  invoices,
  chartAccounts,
  DEFAULT_CHART_ACCOUNTS,
  imobiliarias,
  curtaManagers,
  guaranteeTypes,
  DEFAULT_GUARANTEE_TYPES,
  fornecedores,
  inventoryItems,
  longTermContracts,
  contractRentCharges,
  InsertClient,
  InsertProperty,
  InsertLedgerEntry,
  InsertReservation,
  InsertInvoice,
  InsertChartAccount,
  InsertImobiliaria,
  InsertCurtaManager,
  InsertGuaranteeType,
  InsertFornecedor,
  InsertInventoryItem,
  InsertLongTermContract,
  InsertContractRentCharge,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ------------------------------------------------------------------ users
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await requireDb();
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --------------------------------------------------------------- clients
export async function listClients(ownerId: number) {
  const db = await requireDb();
  return db.select().from(clients).where(eq(clients.ownerId, ownerId)).orderBy(desc(clients.createdAt));
}

export async function getClient(ownerId: number, id: number) {
  const db = await requireDb();
  const rows = await db.select().from(clients).where(and(eq(clients.ownerId, ownerId), eq(clients.id, id))).limit(1);
  return rows[0];
}

export async function createClient(data: InsertClient) {
  const db = await requireDb();
  const res = await db.insert(clients).values(data);
  return (res as unknown as { insertId: number }[])[0]?.insertId ?? (res as unknown as { insertId: number }).insertId;
}

export async function updateClient(ownerId: number, id: number, data: Partial<InsertClient>) {
  const db = await requireDb();
  await db.update(clients).set(data).where(and(eq(clients.ownerId, ownerId), eq(clients.id, id)));
}

export async function deleteClient(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(clients).where(and(eq(clients.ownerId, ownerId), eq(clients.id, id)));
}

// ------------------------------------------------------------ properties
export async function listProperties(ownerId: number) {
  const db = await requireDb();
  return db.select().from(properties).where(eq(properties.ownerId, ownerId)).orderBy(desc(properties.createdAt));
}

export async function getProperty(ownerId: number, id: number) {
  const db = await requireDb();
  const rows = await db.select().from(properties).where(and(eq(properties.ownerId, ownerId), eq(properties.id, id))).limit(1);
  return rows[0];
}

export async function createProperty(data: InsertProperty) {
  const db = await requireDb();
  await db.insert(properties).values(data);
}

export async function updateProperty(ownerId: number, id: number, data: Partial<InsertProperty>) {
  const db = await requireDb();
  await db.update(properties).set(data).where(and(eq(properties.ownerId, ownerId), eq(properties.id, id)));
}

export async function deleteProperty(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(properties).where(and(eq(properties.ownerId, ownerId), eq(properties.id, id)));
}

// --------------------------------------------------------- ledger entries
/** Cada linha representa uma série mensal (competenciaInicio + qtdMeses), não uma ocorrência única. */
export async function listLedgerEntries(
  ownerId: number,
  propertyId?: number,
  grupo?: "despesa_fixa" | "despesa_variavel" | "receita" | "aporte_capital",
) {
  const db = await requireDb();
  const conds = [eq(ledgerEntries.ownerId, ownerId)];
  if (propertyId) conds.push(eq(ledgerEntries.propertyId, propertyId));
  if (grupo) conds.push(eq(ledgerEntries.grupo, grupo));
  return db.select().from(ledgerEntries).where(and(...conds)).orderBy(desc(ledgerEntries.createdAt));
}

/** Verifica se a competência alvo ("AAAA-MM") cai dentro da série [competenciaInicio, competenciaInicio + qtdMeses - 1]. */
export function competenciaNaSerie(competenciaInicio: string, qtdMeses: number, alvo: string): boolean {
  const [y0, m0] = competenciaInicio.split("-").map(Number);
  const [y1, m1] = alvo.split("-").map(Number);
  const idx = (y1 * 12 + (m1 - 1)) - (y0 * 12 + (m0 - 1));
  return idx >= 0 && idx < qtdMeses;
}

/** Lançamentos cuja série cobre a competência informada (para a DRE do mês). */
export async function listLedgerEntriesNaCompetencia(
  ownerId: number,
  propertyId: number,
  competencia: string,
  grupo?: "despesa_fixa" | "despesa_variavel" | "receita" | "aporte_capital",
) {
  const todos = await listLedgerEntries(ownerId, propertyId, grupo);
  return todos.filter((e) => competenciaNaSerie(e.competenciaInicio, e.qtdMeses, competencia));
}

export async function createLedgerEntry(data: InsertLedgerEntry) {
  const db = await requireDb();
  const res = await db.insert(ledgerEntries).values(data);
  return (res as unknown as { insertId: number }[])[0]?.insertId ?? (res as unknown as { insertId: number }).insertId;
}

export async function updateLedgerEntry(ownerId: number, id: number, data: Partial<InsertLedgerEntry>) {
  const db = await requireDb();
  await db.update(ledgerEntries).set(data).where(and(eq(ledgerEntries.ownerId, ownerId), eq(ledgerEntries.id, id)));
}

export async function deleteLedgerEntry(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(ledgerEntries).where(and(eq(ledgerEntries.ownerId, ownerId), eq(ledgerEntries.id, id)));
}

export async function deleteLedgerEntriesByReservation(ownerId: number, reservationId: number) {
  const db = await requireDb();
  await db.delete(ledgerEntries).where(and(eq(ledgerEntries.ownerId, ownerId), eq(ledgerEntries.reservationId, reservationId)));
}

// ---------------------------------------------------------- reservations
export async function listReservations(ownerId: number, propertyId?: number, competencia?: string) {
  const db = await requireDb();
  const conds = [eq(reservations.ownerId, ownerId)];
  if (propertyId) conds.push(eq(reservations.propertyId, propertyId));
  if (competencia) conds.push(eq(reservations.competencia, competencia));
  return db.select().from(reservations).where(and(...conds)).orderBy(desc(reservations.checkin));
}

export async function getReservation(ownerId: number, id: number) {
  const db = await requireDb();
  const rows = await db.select().from(reservations).where(and(eq(reservations.ownerId, ownerId), eq(reservations.id, id))).limit(1);
  return rows[0];
}

export async function createReservation(data: InsertReservation) {
  const db = await requireDb();
  const res = await db.insert(reservations).values(data);
  return (res as unknown as { insertId: number }).insertId;
}

export async function updateReservation(ownerId: number, id: number, data: Partial<InsertReservation>) {
  const db = await requireDb();
  await db.update(reservations).set(data).where(and(eq(reservations.ownerId, ownerId), eq(reservations.id, id)));
}

export async function deleteReservation(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(reservations).where(and(eq(reservations.ownerId, ownerId), eq(reservations.id, id)));
  await db.delete(invoices).where(and(eq(invoices.ownerId, ownerId), eq(invoices.reservationId, id)));
  // Remover lançamentos automáticos de faxina vinculados a esta reserva
  await db.delete(ledgerEntries).where(and(eq(ledgerEntries.ownerId, ownerId), eq(ledgerEntries.reservationId, id)));
}

// -------------------------------------------------------------- invoices
export async function listInvoicesByReservation(ownerId: number, reservationId: number) {
  const db = await requireDb();
  return db.select().from(invoices).where(and(eq(invoices.ownerId, ownerId), eq(invoices.reservationId, reservationId)));
}

export async function listInvoices(ownerId: number, competencia?: string) {
  const db = await requireDb();
  // notas ligadas a reservas da competência (join simples via reservationId)
  const rows = await db.select().from(invoices).where(eq(invoices.ownerId, ownerId)).orderBy(desc(invoices.createdAt));
  return rows;
}

export async function listInvoicesByProperty(ownerId: number, propertyId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.ownerId, ownerId), eq(invoices.propertyId, propertyId)))
    .orderBy(desc(invoices.createdAt));
}

export async function createInvoice(data: InsertInvoice) {
  const db = await requireDb();
  await db.insert(invoices).values(data);
}

export async function deleteInvoicesByReservation(ownerId: number, reservationId: number) {
  const db = await requireDb();
  await db.delete(invoices).where(and(eq(invoices.ownerId, ownerId), eq(invoices.reservationId, reservationId)));
}

// ----------------------------------------------------------- user management
export async function listTeamUsers(ownerId: number) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.invitedBy, ownerId)).orderBy(desc(users.createdAt));
  return rows.map(({ passwordHash, ...u }) => u);
}

export async function createTeamUser(data: {
  ownerId: number;
  name: string;
  email: string;
  password: string;
  telefone?: string | null;
}) {
  const db = await requireDb();
  const bcrypt = await import("bcryptjs");
  const { nanoid } = await import("nanoid");

  // Check if email already exists
  const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase().trim())).limit(1);
  if (existing.length > 0) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const openId = `local_${nanoid(20)}`;

  await db.insert(users).values({
    openId,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    passwordHash,
    loginMethod: "email",
    invitedBy: data.ownerId,
    telefone: data.telefone ? data.telefone.replace(/\D/g, "") : null,
    lastSignedIn: new Date(),
  });
}

export async function deleteTeamUser(ownerId: number, userId: number) {
  const db = await requireDb();
  await db.delete(users).where(and(eq(users.id, userId), eq(users.invitedBy, ownerId)));
}

export async function getUserById(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] || null;
}

// ------------------------------------------------------- plano de contas (chart accounts)
type ChartAccountGrupo = "despesa_fixa" | "despesa_variavel" | "receita" | "aporte_capital";

export async function listChartAccounts(ownerId: number, grupo?: ChartAccountGrupo) {
  const db = await requireDb();
  const conds = [eq(chartAccounts.ownerId, ownerId)];
  if (grupo) conds.push(eq(chartAccounts.grupo, grupo));
  return db.select().from(chartAccounts).where(and(...conds)).orderBy(chartAccounts.grupo, chartAccounts.id);
}

export async function createChartAccount(data: InsertChartAccount) {
  const db = await requireDb();
  const res = await db.insert(chartAccounts).values(data);
  return (res as unknown as { insertId: number }[])[0]?.insertId ?? (res as unknown as { insertId: number }).insertId;
}

export async function updateChartAccount(ownerId: number, id: number, data: Partial<Pick<InsertChartAccount, "nome" | "ativa">>) {
  const db = await requireDb();
  await db.update(chartAccounts).set(data).where(and(eq(chartAccounts.ownerId, ownerId), eq(chartAccounts.id, id)));
}

/** Remove a conta e toda a sua descendência (sub-contas em qualquer profundidade). */
export async function deleteChartAccount(ownerId: number, id: number) {
  const db = await requireDb();
  const all = await listChartAccounts(ownerId);
  const toDelete = new Set<number>([id]);
  // Percorre repetidamente até não achar mais filhos novos (profundidade livre).
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (c.parentId !== null && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
        toDelete.add(c.id);
        changed = true;
      }
    }
  }
  for (const accountId of Array.from(toDelete)) {
    await db.delete(chartAccounts).where(and(eq(chartAccounts.ownerId, ownerId), eq(chartAccounts.id, accountId)));
  }
}

/** Semeia a conta principal padrão (uma por grupo/natureza) na primeira vez que o usuário acessa o plano de contas. */
export async function seedDefaultChartAccountsIfNeeded(ownerId: number) {
  const existing = await listChartAccounts(ownerId);
  if (existing.length > 0) return existing;
  for (const [grupo, nome] of Object.entries(DEFAULT_CHART_ACCOUNTS) as [keyof typeof DEFAULT_CHART_ACCOUNTS, string][]) {
    await createChartAccount({ ownerId, grupo, nome, ativa: 1 });
  }
  return listChartAccounts(ownerId);
}

// ----------------------------------------------------------------- imobiliarias
export async function listImobiliarias(ownerId: number) {
  const db = await requireDb();
  return db.select().from(imobiliarias).where(eq(imobiliarias.ownerId, ownerId)).orderBy(desc(imobiliarias.createdAt));
}

export async function createImobiliaria(data: InsertImobiliaria) {
  const db = await requireDb();
  await db.insert(imobiliarias).values(data);
}

export async function updateImobiliaria(ownerId: number, id: number, data: Partial<InsertImobiliaria>) {
  const db = await requireDb();
  await db.update(imobiliarias).set(data).where(and(eq(imobiliarias.ownerId, ownerId), eq(imobiliarias.id, id)));
}

export async function deleteImobiliaria(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(imobiliarias).where(and(eq(imobiliarias.ownerId, ownerId), eq(imobiliarias.id, id)));
}

// -------------------------------------------------------------- curta managers
export async function listCurtaManagers(ownerId: number) {
  const db = await requireDb();
  return db.select().from(curtaManagers).where(eq(curtaManagers.ownerId, ownerId)).orderBy(desc(curtaManagers.createdAt));
}

export async function createCurtaManager(data: InsertCurtaManager) {
  const db = await requireDb();
  await db.insert(curtaManagers).values(data);
}

export async function updateCurtaManager(ownerId: number, id: number, data: Partial<InsertCurtaManager>) {
  const db = await requireDb();
  await db.update(curtaManagers).set(data).where(and(eq(curtaManagers.ownerId, ownerId), eq(curtaManagers.id, id)));
}

export async function deleteCurtaManager(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(curtaManagers).where(and(eq(curtaManagers.ownerId, ownerId), eq(curtaManagers.id, id)));
}

// --------------------------------------------------------------- guarantee types
export async function listGuaranteeTypes(ownerId: number) {
  const db = await requireDb();
  return db.select().from(guaranteeTypes).where(eq(guaranteeTypes.ownerId, ownerId)).orderBy(guaranteeTypes.id);
}

export async function createGuaranteeType(data: InsertGuaranteeType) {
  const db = await requireDb();
  await db.insert(guaranteeTypes).values(data);
}

export async function updateGuaranteeType(ownerId: number, id: number, data: Partial<Pick<InsertGuaranteeType, "nome" | "ativa">>) {
  const db = await requireDb();
  await db.update(guaranteeTypes).set(data).where(and(eq(guaranteeTypes.ownerId, ownerId), eq(guaranteeTypes.id, id)));
}

export async function deleteGuaranteeType(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(guaranteeTypes).where(and(eq(guaranteeTypes.ownerId, ownerId), eq(guaranteeTypes.id, id)));
}

/** Seed default guarantee types if user has none yet */
export async function seedDefaultGuaranteeTypesIfNeeded(ownerId: number) {
  const existing = await listGuaranteeTypes(ownerId);
  if (existing.length > 0) return existing;
  for (const nome of DEFAULT_GUARANTEE_TYPES) {
    await createGuaranteeType({ ownerId, nome, ativa: 1 });
  }
  return listGuaranteeTypes(ownerId);
}

// -------------------------------------------------------------------- fornecedores
export async function listFornecedores(ownerId: number) {
  const db = await requireDb();
  return db.select().from(fornecedores).where(eq(fornecedores.ownerId, ownerId)).orderBy(fornecedores.nome);
}

export async function createFornecedor(data: InsertFornecedor) {
  const db = await requireDb();
  await db.insert(fornecedores).values(data);
}

export async function updateFornecedor(
  ownerId: number,
  id: number,
  data: Partial<Pick<InsertFornecedor, "nome" | "cpfCnpj" | "telefone" | "email" | "ativo">>,
) {
  const db = await requireDb();
  await db.update(fornecedores).set(data).where(and(eq(fornecedores.ownerId, ownerId), eq(fornecedores.id, id)));
}

export async function deleteFornecedor(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(fornecedores).where(and(eq(fornecedores.ownerId, ownerId), eq(fornecedores.id, id)));
}

// -------------------------------------------------------------- inventory items
export async function listInventoryItems(ownerId: number, propertyId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.propertyId, propertyId)))
    .orderBy(desc(inventoryItems.createdAt));
}

export async function createInventoryItem(data: InsertInventoryItem) {
  const db = await requireDb();
  await db.insert(inventoryItems).values(data);
}

export async function updateInventoryItem(ownerId: number, id: number, data: Partial<InsertInventoryItem>) {
  const db = await requireDb();
  await db.update(inventoryItems).set(data).where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)));
}

export async function deleteInventoryItem(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(inventoryItems).where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)));
}

// --------------------------------------------------------- long term contracts
export async function listLongTermContracts(ownerId: number, propertyId?: number) {
  const db = await requireDb();
  const conds = [eq(longTermContracts.ownerId, ownerId)];
  if (propertyId) conds.push(eq(longTermContracts.propertyId, propertyId));
  return db.select().from(longTermContracts).where(and(...conds)).orderBy(desc(longTermContracts.createdAt));
}

export async function getLongTermContract(ownerId: number, id: number) {
  const db = await requireDb();
  const rows = await db.select().from(longTermContracts).where(and(eq(longTermContracts.ownerId, ownerId), eq(longTermContracts.id, id))).limit(1);
  return rows[0];
}

export async function createLongTermContract(data: InsertLongTermContract) {
  const db = await requireDb();
  const res = await db.insert(longTermContracts).values(data);
  return (res as unknown as { insertId: number }[])[0]?.insertId ?? (res as unknown as { insertId: number }).insertId;
}

export async function updateLongTermContract(ownerId: number, id: number, data: Partial<InsertLongTermContract>) {
  const db = await requireDb();
  await db.update(longTermContracts).set(data).where(and(eq(longTermContracts.ownerId, ownerId), eq(longTermContracts.id, id)));
}

export async function deleteLongTermContract(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(longTermContracts).where(and(eq(longTermContracts.ownerId, ownerId), eq(longTermContracts.id, id)));
  await db.delete(contractRentCharges).where(and(eq(contractRentCharges.ownerId, ownerId), eq(contractRentCharges.contractId, id)));
}

// ---------------------------------------------------- contract rent charges
export async function listContractRentCharges(ownerId: number, contractId?: number) {
  const db = await requireDb();
  const conds = [eq(contractRentCharges.ownerId, ownerId)];
  if (contractId) conds.push(eq(contractRentCharges.contractId, contractId));
  return db.select().from(contractRentCharges).where(and(...conds)).orderBy(contractRentCharges.dataVencimento);
}

/** Parcelas de aluguel de longa duração de um imóvel numa competência específica (usado na DRE). */
export async function listContractRentChargesByProperty(ownerId: number, propertyId: number, competencia: string) {
  const db = await requireDb();
  return db
    .select()
    .from(contractRentCharges)
    .where(and(eq(contractRentCharges.ownerId, ownerId), eq(contractRentCharges.propertyId, propertyId), eq(contractRentCharges.competencia, competencia)));
}

export async function getContractRentCharge(ownerId: number, id: number) {
  const db = await requireDb();
  const rows = await db.select().from(contractRentCharges).where(and(eq(contractRentCharges.ownerId, ownerId), eq(contractRentCharges.id, id))).limit(1);
  return rows[0];
}

export async function createContractRentCharge(data: InsertContractRentCharge) {
  const db = await requireDb();
  await db.insert(contractRentCharges).values(data);
}

export async function updateContractRentCharge(ownerId: number, id: number, data: Partial<InsertContractRentCharge>) {
  const db = await requireDb();
  await db.update(contractRentCharges).set(data).where(and(eq(contractRentCharges.ownerId, ownerId), eq(contractRentCharges.id, id)));
}

export async function deleteContractRentCharge(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(contractRentCharges).where(and(eq(contractRentCharges.ownerId, ownerId), eq(contractRentCharges.id, id)));
}
