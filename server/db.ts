import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clients,
  properties,
  expenses,
  investments,
  reservations,
  invoices,
  expenseCategoriesTable,
  DEFAULT_EXPENSE_CATEGORIES,
  investmentCategoriesTable,
  DEFAULT_INVESTMENT_CATEGORIES,
  imobiliarias,
  curtaManagers,
  guaranteeTypes,
  DEFAULT_GUARANTEE_TYPES,
  inventoryItems,
  longTermContracts,
  contractRentCharges,
  InsertClient,
  InsertProperty,
  InsertExpense,
  InsertInvestment,
  InsertReservation,
  InsertInvoice,
  InsertExpenseCategory,
  InsertInvestmentCategory,
  InsertImobiliaria,
  InsertCurtaManager,
  InsertGuaranteeType,
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

// -------------------------------------------------------------- expenses
export async function listExpenses(ownerId: number, propertyId?: number, competencia?: string) {
  const db = await requireDb();
  const conds = [eq(expenses.ownerId, ownerId)];
  if (propertyId) conds.push(eq(expenses.propertyId, propertyId));
  if (competencia) conds.push(eq(expenses.competencia, competencia));
  return db.select().from(expenses).where(and(...conds)).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: InsertExpense) {
  const db = await requireDb();
  const res = await db.insert(expenses).values(data);
  return (res as unknown as { insertId: number }[])[0]?.insertId ?? (res as unknown as { insertId: number }).insertId;
}

export async function updateExpense(ownerId: number, id: number, data: Partial<InsertExpense>) {
  const db = await requireDb();
  await db.update(expenses).set(data).where(and(eq(expenses.ownerId, ownerId), eq(expenses.id, id)));
}

export async function deleteExpense(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(expenses).where(and(eq(expenses.ownerId, ownerId), eq(expenses.id, id)));
}

// ----------------------------------------------------------- expense categories
export async function listExpenseCategories(ownerId: number) {
  const db = await requireDb();
  return db.select().from(expenseCategoriesTable).where(eq(expenseCategoriesTable.ownerId, ownerId)).orderBy(expenseCategoriesTable.id);
}

export async function createExpenseCategory(data: InsertExpenseCategory) {
  const db = await requireDb();
  await db.insert(expenseCategoriesTable).values(data);
}

export async function updateExpenseCategory(ownerId: number, id: number, data: Partial<Pick<InsertExpenseCategory, "nome" | "ativa">>) {
  const db = await requireDb();
  await db.update(expenseCategoriesTable).set(data).where(and(eq(expenseCategoriesTable.ownerId, ownerId), eq(expenseCategoriesTable.id, id)));
}

export async function deleteExpenseCategory(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(expenseCategoriesTable).where(and(eq(expenseCategoriesTable.ownerId, ownerId), eq(expenseCategoriesTable.id, id)));
}

/** Seed default categories if user has none yet */
export async function seedDefaultCategoriesIfNeeded(ownerId: number) {
  const existing = await listExpenseCategories(ownerId);
  if (existing.length > 0) return existing;
  for (const nome of DEFAULT_EXPENSE_CATEGORIES) {
    await createExpenseCategory({ ownerId, nome, ativa: 1 });
  }
  return listExpenseCategories(ownerId);
}

// ----------------------------------------------------------- investments
export async function listInvestments(ownerId: number, propertyId?: number, competencia?: string) {
  const db = await requireDb();
  const conds = [eq(investments.ownerId, ownerId)];
  if (propertyId) conds.push(eq(investments.propertyId, propertyId));
  if (competencia) conds.push(eq(investments.competencia, competencia));
  return db.select().from(investments).where(and(...conds)).orderBy(desc(investments.createdAt));
}

export async function createInvestment(data: InsertInvestment) {
  const db = await requireDb();
  await db.insert(investments).values(data);
}

export async function updateInvestment(ownerId: number, id: number, data: Partial<InsertInvestment>) {
  const db = await requireDb();
  await db.update(investments).set(data).where(and(eq(investments.ownerId, ownerId), eq(investments.id, id)));
}

export async function deleteInvestment(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(investments).where(and(eq(investments.ownerId, ownerId), eq(investments.id, id)));
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

export async function deleteExpensesByReservation(ownerId: number, reservationId: number) {
  const db = await requireDb();
  await db.delete(expenses).where(and(eq(expenses.ownerId, ownerId), eq(expenses.reservationId, reservationId)));
}

export async function deleteReservation(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(reservations).where(and(eq(reservations.ownerId, ownerId), eq(reservations.id, id)));
  await db.delete(invoices).where(and(eq(invoices.ownerId, ownerId), eq(invoices.reservationId, id)));
  // Remover despesas automáticas de faxina vinculadas a esta reserva
  await db.delete(expenses).where(and(eq(expenses.ownerId, ownerId), eq(expenses.reservationId, id)));
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

// ----------------------------------------------------------- investment categories
export async function listInvestmentCategories(ownerId: number) {
  const db = await requireDb();
  return db.select().from(investmentCategoriesTable).where(eq(investmentCategoriesTable.ownerId, ownerId)).orderBy(investmentCategoriesTable.id);
}

export async function createInvestmentCategory(data: InsertInvestmentCategory) {
  const db = await requireDb();
  await db.insert(investmentCategoriesTable).values(data);
}

export async function updateInvestmentCategory(ownerId: number, id: number, data: Partial<Pick<InsertInvestmentCategory, "nome" | "ativa">>) {
  const db = await requireDb();
  await db.update(investmentCategoriesTable).set(data).where(and(eq(investmentCategoriesTable.ownerId, ownerId), eq(investmentCategoriesTable.id, id)));
}

export async function deleteInvestmentCategory(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(investmentCategoriesTable).where(and(eq(investmentCategoriesTable.ownerId, ownerId), eq(investmentCategoriesTable.id, id)));
}

/** Seed default investment categories if user has none yet */
export async function seedDefaultInvestmentCategoriesIfNeeded(ownerId: number) {
  const existing = await listInvestmentCategories(ownerId);
  if (existing.length > 0) return existing;
  for (const nome of DEFAULT_INVESTMENT_CATEGORIES) {
    await createInvestmentCategory({ ownerId, nome, ativa: 1 });
  }
  return listInvestmentCategories(ownerId);
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
