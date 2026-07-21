import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { nanoid } from "nanoid";

async function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

export function registerAuthRoutes(app: Express) {
  // ---------------------------------------------------------------- REGISTER
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { tipoCadastro, userType, email, password, razaoSocial, cnpj, nomeResponsavel, cpfResponsavel, name, telefone } = req.body;

      const VALID_USER_TYPES = ["administradora", "admin_airbnb", "proprietario", "holding", "gestor_temporada_pj"];

      if (!email || !password) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        return;
      }

      if (!tipoCadastro || !['pj', 'pf'].includes(tipoCadastro)) {
        res.status(400).json({ error: "Tipo de cadastro (PJ ou PF) é obrigatório." });
        return;
      }

      if (!userType || !VALID_USER_TYPES.includes(userType)) {
        res.status(400).json({ error: "Selecione um perfil de atuação válido." });
        return;
      }

      if (tipoCadastro === 'pj' && (!razaoSocial || !cnpj || !nomeResponsavel || !cpfResponsavel)) {
        res.status(400).json({ error: "Razão social, CNPJ, nome e CPF do responsável são obrigatórios para Pessoa Jurídica." });
        return;
      }

      if (tipoCadastro === 'pf' && (!nomeResponsavel || !cpfResponsavel)) {
        res.status(400).json({ error: "Nome e CPF são obrigatórios para Pessoa Física." });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
        return;
      }

      const db = await getDb();

      // Check if email already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: "Este e-mail já está cadastrado." });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate a unique openId for this user (used by session system)
      const openId = `local_${nanoid(20)}`;

      // Determine display name
      const displayName = tipoCadastro === 'pj'
        ? razaoSocial.trim()
        : (nomeResponsavel || name || '').trim();

      // Insert user
      await db.insert(users).values({
        openId,
        name: displayName,
        email: email.toLowerCase().trim(),
        passwordHash,
        loginMethod: "email",
        tipoCadastro,
        userType,
        cnpj: tipoCadastro === 'pj' ? cnpj.trim() : null,
        razaoSocial: tipoCadastro === 'pj' ? razaoSocial.trim() : null,
        cpfResponsavel: cpfResponsavel ? cpfResponsavel.trim() : null,
        nomeResponsavel: tipoCadastro === 'pf' ? (nomeResponsavel || '').trim() : (nomeResponsavel || '').trim(),
        telefone: telefone ? telefone.replace(/\D/g, '') : null,
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("[Auth] Register failed:", error);
      res.status(500).json({ error: "Erro interno ao criar conta." });
    }
  });

  // ------------------------------------------------------------------- LOGIN
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios." });
        return;
      }

      const db = await getDb();

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (rows.length === 0) {
        res.status(401).json({ error: "E-mail ou senha incorretos." });
        return;
      }

      const user = rows[0];

      if (!user.passwordHash) {
        res.status(401).json({ error: "Esta conta não possui senha. Use outro método de login." });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "E-mail ou senha incorretos." });
        return;
      }

      // Update lastSignedIn
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });
}
