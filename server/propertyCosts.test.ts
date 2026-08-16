import { describe, expect, it } from "vitest";

import { contratoCobreCompetencia, encerrarSerieAntes, responsavelPeloCusto } from "./db";
import type { LongTermContract, PropertyCost } from "../drizzle/schema";

function custo(over: Partial<PropertyCost> = {}): PropertyCost {
  return {
    id: 1,
    ownerId: 1,
    propertyId: 10,
    tipo: "condominio",
    valor: "800.00",
    competenciaInicio: "2026-01",
    qtdMeses: 12,
    dia: 10,
    descricao: null,
    responsavel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as PropertyCost;
}

function contrato(over: Partial<LongTermContract> = {}): LongTermContract {
  return {
    id: 1,
    ownerId: 1,
    propertyId: 10,
    dataInicio: "2026-03-01",
    dataFim: "2027-03-01",
    condominioPor: "proprietario",
    iptuPor: "proprietario",
    renovacaoAutomatica: null,
    prazoIndeterminadoDataInicio: null,
    ...over,
  } as LongTermContract;
}

describe("contratoCobreCompetencia", () => {
  it("cobre os meses entre o início e o fim, sem incluir o mês do encerramento", () => {
    const c = contrato();
    expect(contratoCobreCompetencia(c, "2026-02")).toBe(false);
    expect(contratoCobreCompetencia(c, "2026-03")).toBe(true);
    expect(contratoCobreCompetencia(c, "2027-02")).toBe(true);
    expect(contratoCobreCompetencia(c, "2027-03")).toBe(false);
  });

  it("segue cobrindo depois do fim quando houve renovação por prazo indeterminado", () => {
    const c = contrato({ renovacaoAutomatica: "prazo_indeterminado", prazoIndeterminadoDataInicio: "2027-03-01" });
    expect(contratoCobreCompetencia(c, "2027-03")).toBe(true);
    expect(contratoCobreCompetencia(c, "2030-08")).toBe(true);
  });
});

describe("responsavelPeloCusto", () => {
  it("atribui o custo ao proprietário quando o imóvel está vago", () => {
    expect(responsavelPeloCusto(custo(), null)).toBe("proprietario");
    expect(responsavelPeloCusto(custo({ tipo: "iptu" }), null)).toBe("proprietario");
  });

  it("usa o campo do contrato correspondente ao tipo de custo", () => {
    const c = contrato({ condominioPor: "inquilino_via_repasse", iptuPor: "inquilino_direto" });
    expect(responsavelPeloCusto(custo({ tipo: "condominio" }), c)).toBe("inquilino_via_repasse");
    expect(responsavelPeloCusto(custo({ tipo: "iptu" }), c)).toBe("inquilino_direto");
  });

  it("não confunde condomínio com IPTU quando as responsabilidades divergem", () => {
    const c = contrato({ condominioPor: "inquilino_direto", iptuPor: "proprietario" });
    expect(responsavelPeloCusto(custo({ tipo: "condominio" }), c)).toBe("inquilino_direto");
    expect(responsavelPeloCusto(custo({ tipo: "iptu" }), c)).toBe("proprietario");
  });

  it("mantém o rateio extraordinário no proprietário mesmo quando a mensalidade é do inquilino", () => {
    const c = contrato({ condominioPor: "inquilino_via_repasse" });
    const rateio = custo({ tipo: "condominio_extra", responsavel: "proprietario", descricao: "Rateio de obra" });
    expect(responsavelPeloCusto(rateio, c)).toBe("proprietario");
  });

  it("cobra o rateio do inquilino pela mesma forma que o contrato usa para o condomínio", () => {
    const rateio = custo({ tipo: "condominio_extra", responsavel: "inquilino" });
    expect(responsavelPeloCusto(rateio, contrato({ condominioPor: "inquilino_via_repasse" }))).toBe("inquilino_via_repasse");
    expect(responsavelPeloCusto(rateio, contrato({ condominioPor: "inquilino_direto" }))).toBe("inquilino_direto");
  });

  it("trata rateio sem responsável definido como despesa do proprietário", () => {
    const rateio = custo({ tipo: "condominio_extra", responsavel: null });
    expect(responsavelPeloCusto(rateio, contrato({ condominioPor: "inquilino_via_repasse" }))).toBe("proprietario");
  });
});

describe("encerrarSerieAntes", () => {
  it("corta a série anterior no mês em que o valor novo passa a valer", () => {
    // Condomínio começou em janeiro; valor novo entra em abril: a série antiga cobre jan, fev, mar.
    expect(encerrarSerieAntes("2026-01", "2026-04")).toBe(3);
  });

  it("zera a série quando o valor novo começa antes dela", () => {
    expect(encerrarSerieAntes("2026-06", "2026-01")).toBe(0);
  });

  it("atravessa a virada de ano", () => {
    expect(encerrarSerieAntes("2025-11", "2026-02")).toBe(3);
  });
});
