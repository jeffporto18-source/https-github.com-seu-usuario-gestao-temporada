import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocka a camada de banco para testar a lógica de consolidação da DRE isoladamente.
vi.mock("./db", () => ({
  getProperty: vi.fn(),
  getClient: vi.fn(),
  listReservations: vi.fn(),
  listLedgerEntriesNaCompetencia: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "u1",
      email: "a@b.com",
      name: "Admin",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("dre.porUnidade", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consolida receita, comissão, despesas e resultado do proprietário", async () => {
    (db.getProperty as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      clientId: 5,
      apelido: "Studio Beira-Mar",
      comissaoPct: "20",
    });
    (db.getClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      nome: "João Silva",
      cpfCnpj: "123",
      tipo: "PF",
    });
    (db.listReservations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, codigo: "R1", valorBruto: "1800", taxaLimpeza: "200", taxaAirbnb: "80", noites: 3, checkin: new Date("2026-06-01"), checkout: new Date("2026-06-04") },
    ]);
    (db.listLedgerEntriesNaCompetencia as ReturnType<typeof vi.fn>).mockImplementation((_ownerId: number, _propertyId: number, _competencia: string, grupo: string) => {
      if (grupo === "despesa_variavel") {
        return Promise.resolve([
          { id: 1, categoria: "luz", valor: "150" },
          { id: 2, categoria: "condominio", valor: "300" },
        ]);
      }
      return Promise.resolve([]);
    });

    const caller = appRouter.createCaller(ctxFor());
    const dre = await caller.dre.porUnidade({ propertyId: 10, competencia: "2026-06" });

    expect(dre.receitaBruta).toBe(2000);
    expect(dre.taxaAirbnb).toBe(80);
    expect(dre.comissao).toBe(400);
    expect(dre.repasseBruto).toBe(1520); // 2000 - 80 - 400
    expect(dre.totalDespesas).toBe(450);
    expect(dre.resultadoProprietario).toBe(1070); // 1520 - 450
    expect(dre.totalReservas).toBe(1);
  });

  it("lança erro quando o imóvel não existe", async () => {
    (db.getProperty as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctxFor());
    await expect(caller.dre.porUnidade({ propertyId: 999, competencia: "2026-06" })).rejects.toThrow();
  });
});
