import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

import { escolherAcesso } from "./tenant";

const acesso = (tenantOwnerId: number, nivel = "total") => ({ tenantOwnerId, nivel });

describe("escolherAcesso", () => {
  it("recusa quem não tem acesso a nenhuma empresa", () => {
    expect(escolherAcesso([], undefined)).toEqual({ ok: false, motivo: "sem_acesso" });
    expect(escolherAcesso([], "7")).toEqual({ ok: false, motivo: "sem_acesso" });
  });

  it("entra direto quando o usuário atende uma empresa só", () => {
    const r = escolherAcesso([acesso(5)], undefined);
    expect(r).toEqual({ ok: true, acesso: acesso(5) });
  });

  it("pede escolha quando atende mais de uma e ainda não escolheu", () => {
    expect(escolherAcesso([acesso(5), acesso(9)], undefined)).toEqual({ ok: false, motivo: "precisa_escolher" });
  });

  it("respeita a empresa escolhida quando o acesso existe", () => {
    const r = escolherAcesso([acesso(5), acesso(9)], "9");
    expect(r).toEqual({ ok: true, acesso: acesso(9) });
  });

  // Os três casos abaixo são o coração do isolamento: um cookie adulterado não pode virar acesso.
  it("não libera empresa para a qual o usuário não tem acesso", () => {
    expect(escolherAcesso([acesso(5), acesso(9)], "999")).toEqual({ ok: false, motivo: "precisa_escolher" });
  });

  it("não cai na empresa pedida quando o usuário só tem acesso a outra", () => {
    const r = escolherAcesso([acesso(5)], "999");
    expect(r).toEqual({ ok: true, acesso: acesso(5) });
    if (r.ok) expect(r.acesso.tenantOwnerId).not.toBe(999);
  });

  it("descarta a escolha quando o acesso foi revogado, em vez de mantê-la", () => {
    // O usuário tinha acesso à 9 e escolheu ela; o acesso foi retirado e sobrou só a 5.
    const r = escolherAcesso([acesso(5)], "9");
    expect(r).toEqual({ ok: true, acesso: acesso(5) });
  });

  it("preserva o nível declarado para a empresa escolhida", () => {
    const r = escolherAcesso([acesso(5, "total"), acesso(9, "consulta")], "9");
    expect(r.ok && r.acesso.nivel).toBe("consulta");
  });
});

/**
 * Varredura estrutural das rotas.
 *
 * A troca de escopo mexeu em 71 procedures de uma vez. O risco não é o que foi trocado — é o que
 * for adicionado depois: uma rota nova escrita com `protectedProcedure` e `ctx.user.id` volta a
 * misturar usuário logado com empresa dos dados, e passa a ler o banco sob o id errado. Este teste
 * quebra quando isso acontecer.
 */
describe("escopo das rotas", () => {
  const fonte = fs.readFileSync(path.join(__dirname, "routers.ts"), "utf8");
  const linhas = fonte.split("\n");

  // Rotas que agem sobre o próprio usuário logado, e por isso continuam usando ctx.user.id.
  const ROTAS_DO_USUARIO = ["auth", "onboarding", "profile", "team", "empresas"];

  /** Mapeia cada linha ao sub-router em que está. */
  function routerDaLinha(): (string | null)[] {
    const mapa: (string | null)[] = [];
    let atual: string | null = null;
    for (const linha of linhas) {
      const abertura = linha.match(/^  ([a-zA-Z]+): router\(\{/);
      if (abertura) atual = abertura[1];
      mapa.push(atual);
    }
    return mapa;
  }

  it("nenhuma rota de dados usa ctx.user.id como escopo", () => {
    const mapa = routerDaLinha();
    const infratoras: string[] = [];
    linhas.forEach((linha, i) => {
      if (!linha.includes("ctx.user.id")) return;
      const r = mapa[i];
      if (r && ROTAS_DO_USUARIO.includes(r)) return;
      infratoras.push(`${r ?? "(topo)"} — linha ${i + 1}: ${linha.trim()}`);
    });
    expect(infratoras).toEqual([]);
  });

  it("nenhuma rota de dados usa protectedProcedure", () => {
    const mapa = routerDaLinha();
    const infratoras: string[] = [];
    linhas.forEach((linha, i) => {
      if (!/:\s*protectedProcedure/.test(linha)) return;
      const r = mapa[i];
      if (r && ROTAS_DO_USUARIO.includes(r)) return;
      infratoras.push(`${r ?? "(topo)"} — linha ${i + 1}: ${linha.trim()}`);
    });
    expect(infratoras).toEqual([]);
  });

  it("rotas de resultado financeiro exigem nível total", () => {
    const mapa = routerDaLinha();
    const FINANCEIRAS = ["dre", "relatorios"];
    const infratoras: string[] = [];
    linhas.forEach((linha, i) => {
      const r = mapa[i];
      if (!r || !FINANCEIRAS.includes(r)) return;
      if (/:\s*(empresaProcedure|escritaProcedure)\b/.test(linha)) {
        infratoras.push(`${r} — linha ${i + 1}: ${linha.trim()}`);
      }
    });
    expect(infratoras).toEqual([]);
  });

  it("toda mutação de dados passa por escritaProcedure, que barra o nível consulta", () => {
    const mapa = routerDaLinha();
    const infratoras: string[] = [];
    for (let i = 0; i < linhas.length; i++) {
      const decl = linhas[i].match(/:\s*(empresaProcedure)\b/);
      if (!decl) continue;
      const r = mapa[i];
      if (r && ROTAS_DO_USUARIO.includes(r)) continue;
      // Procura .query( ou .mutation( logo abaixo da declaração.
      for (let j = i; j < Math.min(i + 40, linhas.length); j++) {
        if (linhas[j].includes(".mutation(")) {
          infratoras.push(`${r} — linha ${i + 1}: ${linhas[i].trim()}`);
          break;
        }
        if (linhas[j].includes(".query(")) break;
      }
    }
    expect(infratoras).toEqual([]);
  });
});
