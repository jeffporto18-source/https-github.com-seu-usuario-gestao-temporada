import { describe, expect, it } from "vitest";
import {
  processarOperacao,
  emitirNfse,
  COD_LOCACAO,
  COD_INTERMEDIACAO,
  REDUTOR_BASE_TEMPORADA,
  CBS_TESTE,
  IBS_TESTE,
  type OperacaoInput,
} from "./fiscal";

const baseInput: OperacaoInput = {
  reservaCodigo: "HMABCDE123",
  propriedadeApelido: "Studio Beira-Mar",
  checkin: "2026-06-01",
  checkout: "2026-06-04",
  noites: 3,
  valorBruto: 1800,
  taxaLimpeza: 200,
  taxaAirbnbPct: 4,
  comissaoPct: 20,
  admin: { cnpj: "00.000.000/0001-00", razaoSocial: "Admin LTDA" },
  proprietario: { nome: "João Silva", cpfCnpj: "123.456.789-00", tipo: "PF" },
};

describe("motor fiscal — processarOperacao", () => {
  const r = processarOperacao(baseInput);

  it("soma diárias + taxa de limpeza na receita de locação", () => {
    expect(r.receitaLocacao).toBe(2000);
  });

  it("aplica taxa Airbnb de 4% sobre a receita bruta", () => {
    expect(r.taxaAirbnb).toBe(80); // 2000 * 4%
  });

  it("calcula a comissão da administradora sobre a receita bruta", () => {
    expect(r.comissaoAdmin).toBe(400); // 2000 * 20%
  });

  it("aplica redutor de base de 40% na tributação da locação", () => {
    const baseEsperada = 2000 * (1 - REDUTOR_BASE_TEMPORADA); // 1200
    expect(r.baseTributavelLocacao).toBe(1200);
    expect(r.cbsLocacao).toBeCloseTo(1200 * CBS_TESTE, 2); // 10,80
    expect(r.ibsLocacao).toBeCloseTo(1200 * IBS_TESTE, 2); // 1,20
  });

  it("calcula o líquido do proprietário (receita − airbnb − comissão)", () => {
    expect(r.liquidoProprietario).toBe(2000 - 80 - 400); // 1520
  });

  it("emite nota de locação com código nacional 99.03.01", () => {
    const servico = r.notaLocacao.servico as Record<string, unknown>;
    expect(servico.codigoTributacaoNacional).toBe(COD_LOCACAO);
    expect(servico.valorServicos).toBe(2000);
  });

  it("emite nota de comissão para a administradora com o valor correto", () => {
    const servico = r.notaComissao.servico as Record<string, unknown>;
    expect(servico.codigoTributacaoNacional).toBe(COD_INTERMEDIACAO);
    expect(servico.valorServicos).toBe(400);
  });

  it("respeita percentuais parametrizados por reserva", () => {
    const custom = processarOperacao({ ...baseInput, comissaoPct: 15, taxaAirbnbPct: 3 });
    expect(custom.comissaoAdmin).toBe(300); // 2000 * 15%
    expect(custom.taxaAirbnb).toBe(60); // 2000 * 3%
  });
});

describe("emitirNfse (modo simulado)", () => {
  it("retorna uma nota autorizada com chave de acesso e PDF", async () => {
    const r = processarOperacao(baseInput);
    const resp = await emitirNfse(r.notaLocacao);
    expect(resp.status).toBe("autorizada");
    expect(resp.chaveAcesso).toHaveLength(50);
    expect(resp.urlDanfsePdf).toContain(".pdf");
  });
});

describe("motor fiscal — categorias fiscais", () => {
  it("PF isento: não gera nota de locação e tributos são zero", () => {
    const r = processarOperacao({ ...baseInput, fiscalCategory: "pf_isento" });
    expect(r.gerarNotaLocacao).toBe(false);
    expect(r.cbsLocacao).toBe(0);
    expect(r.ibsLocacao).toBe(0);
    expect(r.baseTributavelLocacao).toBe(0);
  });

  it("PF com CBS/IBS: gera nota de locação com redutor e tributos", () => {
    const r = processarOperacao({ ...baseInput, fiscalCategory: "pf_cbs_ibs" });
    expect(r.gerarNotaLocacao).toBe(true);
    expect(r.baseTributavelLocacao).toBe(1200);
    expect(r.cbsLocacao).toBeGreaterThan(0);
    expect(r.ibsLocacao).toBeGreaterThan(0);
  });

  it("PJ: gera nota de locação com redutor e tributos (mesmo comportamento)", () => {
    const r = processarOperacao({ ...baseInput, fiscalCategory: "pj" });
    expect(r.gerarNotaLocacao).toBe(true);
    expect(r.baseTributavelLocacao).toBe(1200);
    expect(r.cbsLocacao).toBeGreaterThan(0);
  });
});
