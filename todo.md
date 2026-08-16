# Gestão de Temporada — TODO

> Atualizado até o commit `6173dbe` (16/08/2026) — "Excluir lançamentos automáticos das telas de Receitas/Despesas/Aportes".
>
> As seções até "Melhorias: Perfil, Validação, Telefone e Gestão de Usuários" cobrem a construção inicial do produto (curta temporada + motor fiscal). As seções seguintes cobrem a evolução para gestão imobiliária completa, com locação de longa duração e contabilidade em plano de contas.

## Identidade visual
- [x] Definir paleta elegante/sofisticada e tipografia (index.css + Google Fonts)
- [x] Configurar DashboardLayout com navegação lateral

## Banco de dados (schema + migração)
- [x] Tabela `clients` (tipo PF/PJ, cpf_cnpj, nome, contato, certificado A1 + validade)
- [x] Tabela `properties` (vinculada a client, apelido, endereço, comissão %, inscrição municipal, código IBGE)
- [x] Tabela `expenses` (vinculada a property, categoria fixa, valor, competência, descrição)
- [x] Tabela `investments` (vinculada a property, categoria, valor, competência, descrição)
- [x] Tabela `reservations` (vinculada a property, código, valor bruto, taxa limpeza, taxa airbnb, checkin/checkout, noites)
- [x] Tabela `invoices` (vinculada a reservation, tipo locação/comissão, payload JSON, chave, status)
- [x] Gerar migração e aplicar via webdev_execute_sql

## Backend (tRPC + motor fiscal)
- [x] Helpers de DB em server/db.ts (CRUD por usuário/administradora)
- [x] Motor fiscal server/fiscal.ts (dupla operação, CBS/IBS teste, redutor 40%, taxa Airbnb 4%, código 99.03.01)
- [x] Emissão simulada de NFS-e (2 payloads por reserva) arquitetada para provedor real
- [x] Routers: clients, properties, expenses, investments, reservations, invoices, dashboard, dre

## Frontend (páginas)
- [x] Home / landing elegante
- [x] Página de clientes (CRUD, CPF/CNPJ, certificado A1)
- [x] Página de imóveis (CRUD vinculado a cliente)
- [x] Página de despesas por unidade (categorias fixas)
- [x] Página de investimentos por unidade
- [x] Página de reservas por unidade + botão emitir NFS-e (mostra os 2 payloads)
- [x] Página de DRE mensal por unidade
- [x] Página de extrato de repasse ao proprietário (Owner Statement) com notas reais emitidas
- [x] Dashboard com visão geral, comissões do mês e alertas de vencimento de certificado A1
- [x] Registrar rotas em App.tsx com DashboardLayout

## Qualidade e entrega
- [x] Testes vitest do motor fiscal e de routers (10 passando)
- [x] Validar fluxos no preview (screenshots)
- [x] Salvar checkpoint e entregar a Jeff

## Faxina — custo fixo por reserva (Opção 3)
- [x] Adicionar campo `custoFaxina` no cadastro de imóvel (valor unitário por faxina)
- [x] Adicionar campo `faxinasUtilizadas` na reserva (quantidade de faxinas consumidas)
- [x] Ao registrar reserva, gerar automaticamente despesa de faxina (faxinas × custo unitário)
- [x] Incluir custo de faxina gerado automaticamente na DRE e no repasse
- [x] Atualizar frontend: campo no formulário de imóvel e campo no formulário de reserva

## Importação de CSV do Airbnb
- [x] Criar endpoint de importação no backend (parse CSV, mapeamento de campos, criação em lote)
- [x] Criar página/modal de importação no frontend (upload, preview dos dados, confirmação)
- [x] Gerar despesas automáticas de faxina para reservas importadas (se custoFaxina configurado)
- [x] Adicionar link na navegação lateral

## Edição inline de registros
- [x] Edição de clientes (nome, CPF/CNPJ, contato, certificado)
- [x] Edição de imóveis (apelido, endereço, comissão, custo faxina, dados fiscais)
- [x] Edição de despesas (categoria, valor, competência, descrição)
- [x] Edição de investimentos (categoria, valor, competência, descrição)
- [x] Edição de reservas (código, valores, datas, faxinas)

## Correções de lacunas na edição
- [x] Adicionar campo editável de competência nos formulários de edição de despesas e investimentos
- [x] Ao editar reserva, recalcular/atualizar a despesa automática de faxina vinculada (reservationId)
- [x] Bloquear edição de campos fiscais críticos em reservas com NFS-e já emitida (ou avisar)

## Tipos de usuário e categorias fiscais (onboarding)
- [x] Adicionar campos `userType` (administradora / admin_airbnb / proprietario) e `fiscalCategory` (pj / pf_cbs_ibs / pf_isento) na tabela users
- [x] Migrar schema e aplicar SQL
- [x] Criar tela de onboarding obrigatória no primeiro acesso (classificação tipo + categoria fiscal)
- [x] Redirecionar usuário sem classificação para o onboarding antes de acessar qualquer página
- [x] Adaptar motor fiscal: PF isento não emite nota de locação; PF com CBS/IBS emite com redutor; PJ emite normalmente
- [x] Adaptar permissões: proprietário vê apenas seus imóveis (substituído pela reestruturação: categoria fiscal no cliente)
- [x] Exibir tipo e categoria no perfil do usuário e permitir alteração

## Reestruturação: categoria fiscal no cliente (não no usuário)
- [x] Adicionar campo `fiscalCategory` na tabela `clients` (PJ / PF com CBS/IBS / PF isento)
- [x] Migrar schema e aplicar SQL
- [x] Simplificar onboarding: manter apenas tipo de usuário (remover obrigatoriedade de categoria fiscal)
- [x] Atualizar formulário de clientes para incluir categoria fiscal do proprietário
- [x] Adaptar motor fiscal e emissão de NFS-e para usar categoria do cliente (não do usuário logado)
- [x] Atualizar DRE/repasse para refletir a categoria fiscal por cliente
- [x] Remover item pendente anterior de permissões (substituído por esta reestruturação)

## Login próprio (e-mail + senha)
- [x] Adicionar campo `passwordHash` na tabela users
- [x] Instalar bcrypt para hash de senha
- [x] Criar rotas de registro (POST /api/auth/register) e login (POST /api/auth/login) no backend
- [x] Criar sessão JWT no cookie após login/registro
- [x] Criar tela de cadastro (nome, e-mail, senha)
- [x] Criar tela de login (e-mail, senha)
- [x] Adaptar o App.tsx para usar login próprio em vez de Manus OAuth
- [x] Manter Manus OAuth como fallback para o owner/admin do projeto
- [x] Testar fluxo completo: cadastro → onboarding → painel (validado via screenshots)

## Melhorias: categorias configuráveis, contrato e simplificação fiscal

- [x] Criar tabela `expense_categories` (id, userId, nome, ativa) para categorias personalizáveis
- [x] Manter categorias padrão pré-criadas (luz, gás, IPTU, condomínio, faxineira, material_limpeza, kit_banheiro)
- [x] Alterar tabela `expenses` para referenciar expense_categories em vez de enum fixo
- [x] Remover campos `inscricaoMunicipal` e `codigoIbge` do schema de properties
- [x] Implementar upload de contrato (PDF) vinculado ao imóvel via S3
- [x] Atualizar motor fiscal: emissão pelo CPF/CNPJ do proprietário (portal nacional único)
- [x] Atualizar frontend: CRUD de categorias, upload de contrato, formulários simplificados

## Reestruturação do fluxo de entrada (cadastro → perfil → painel)

- [x] Remover auto-login do owner (Manus OAuth direto) — primeira tela deve ser cadastro/login
- [x] Primeira tela: formulário de cadastro (nome, e-mail, senha) ou login
- [x] Segunda tela: escolha de perfil obrigatória (administradora, admin Airbnb, proprietário)
- [x] Após perfil escolhido, redirecionar para o painel principal
- [x] Garantir que usuários sem perfil definido sejam redirecionados para a tela de perfil

## Cadastro com opção PJ e PF master

- [x] Adicionar campos no schema users: tipoCadastro (pj/pf), cnpj, razaoSocial, cpfResponsavel, nomeResponsavel
- [x] Atualizar rota de registro para aceitar dados de PJ ou PF
- [x] Reescrever tela de cadastro com toggle PJ/PF e campos adequados para cada tipo
- [x] Testar fluxo completo de cadastro PJ e PF

## Melhorias: Perfil, Validação, Telefone e Gestão de Usuários

- [x] Adicionar campo telefone/WhatsApp no schema users e no cadastro
- [x] Criar validação de dígito verificador CPF (módulo 11) no frontend
- [x] Criar validação de dígito verificador CNPJ (módulo 11) no frontend
- [x] Criar tela "Meu Perfil" com edição de dados pessoais/empresa
- [x] Criar tela "Gerenciamento de Usuários" para o dono adicionar/remover usuários do sistema
- [x] Adicionar procedure backend para atualizar perfil
- [x] Adicionar procedure backend para CRUD de usuários (convite/criação pelo dono)

## Locação de longa duração — base (migrações 0013–0016)

- [x] Tabela `long_term_contracts` (imóvel, inquilino, vigência, valor, índice e periodicidade de reajuste, dia de vencimento)
- [x] Tabela `contract_rent_charges` (parcelas mensais geradas a partir do contrato, com vencimento e status)
- [x] Tabela `guarantee_types` (tipos de garantia: fiança, caução, seguro-fiança)
- [x] Tabela `imobiliarias` (imobiliárias parceiras que intermediam contratos)
- [x] Tabela `curta_managers` (gestores de curta temporada)
- [x] Tabela `inventory_items` (inventário de itens por imóvel)
- [x] Tabela `investment_categories` (categorias de aporte configuráveis)
- [x] Campo de tipo de garantia no contrato
- [x] Campos de comissão e administradora no contrato
- [x] Campos de multa e desconto nas parcelas de aluguel
- [x] Perfis de usuário `holding` e `gestor_temporada_pj`, com perfis filtrados por tipo de cadastro (PJ/PF)

## Plano de contas e lançamentos

- [x] Tabela `chart_accounts` e tela de Plano de Contas
- [x] Tela unificada de Lançamentos ligada ao plano de contas
- [x] Reformular o plano como árvore livre, de profundidade ilimitada
- [x] Refazer com profundidade fixa em 4 níveis e páginas dedicadas de Receitas / Despesas / Aportes
- [x] Lançamento recorrente nas páginas de Receitas / Despesas / Aportes
- [x] Tabela `ledger_entries` (razão) substituindo `expenses` / `investments` como fonte de verdade
- [x] Botões sempre visíveis na árvore (sem menu escondido no hover), conforme a referência visual
- [x] Deixar os diálogos de cadastro/edição de conta mais compactos
- [x] Trocar os diálogos por edição inline na própria árvore
- [x] Mostrar a natureza (categoria) de cada conta principal
- [x] Remover etiquetas redundantes de natureza e de "Conta principal" na conta raiz
- [x] Adicionar "Conta principal" como natureza na criação de conta

## Fornecedores

- [x] Tabela `fornecedores` e tela de cadastro
- [x] Vincular fornecedor ao campo Fornecedor das Despesas
- [x] Classificação de conta de despesa no cadastro do fornecedor

## Reservas — hóspede, documentos e taxas

- [x] Campos de nome do hóspede, estrangeiro (sim/não) e anexo de documento de identificação
- [x] Campo CPF do hóspede, obrigatório quando não é estrangeiro e oculto quando é
- [x] Campo passaporte para hóspede estrangeiro
- [x] Trocar taxa Airbnb de percentual para valor livre
- [x] Campos de outras taxas e valor líquido recebido
- [x] Ajustar layout do formulário (encolher campo de faxinas, alargar nome do hóspede)
- [x] Deixar o texto do status fiscal da reserva mais claro

## Importação de CSV do Airbnb — evolução

- [x] Mapear as colunas da planilha do Airbnb para os novos campos da reserva
- [x] Mapear planilha em português e corrigir datas com 1 dia de defasagem
- [x] Suportar o novo modelo de CSV com várias unidades por planilha
- [x] Corrigir vínculo de lançamentos automáticos com reservas duplicadas no CSV

## Armazenamento de documentos

- [x] Migrar armazenamento de disco local para Cloudflare R2
- [x] Anexo de documento da garantia no contrato de longa duração
- [x] Anexar/ver contrato de locação na aba Contratos
- [x] Anexos de contrato de locação, fiança e apólice de seguro
- [x] Renomear o anexo de renovação para "Contrato renovado"
- [x] Travar substituição do contrato de locação depois de anexado

## Contratos de longa duração — gestão

- [x] Edição de contratos de longa duração
- [x] Campo de renovação automática, depois renomeado para "Renovação"
- [x] Mostrar todas as datas de reajuste no cadastro do contrato
- [x] Mostrar as datas de reajuste em campos separados
- [x] Impedir exclusão de imóvel com reserva ou contrato vinculado

## Aluguéis a Receber

- [x] Tela de parcelas de aluguel a receber, geradas a partir dos contratos
- [x] Filtro por data de vencimento
- [x] Pergunta de multa/juros ao marcar como recebido, apenas nesta tela

## Sócios

- [x] Tabela `socios` e aba de cadastro (nome e CPF)
- [x] Campo Sócio no cadastro de imóveis de longa duração

## Relatórios contábeis e fiscais

- [x] Relatório mensal para a contabilidade, cobrindo curta e longa duração
- [x] Trocar exportação CSV por Excel e PDF
- [x] Renomear o relatório para EFD Contribuições
- [x] Relatório anual DIMOB
- [x] Aba "DRE Empresa" com resultado consolidado de todos os imóveis
- [x] Não emitir nota de comissão quando o imóvel é administrado diretamente pelo proprietário

## Integração automática com o razão

- [x] Lançar receita de reservas e de aluguéis automaticamente no plano de contas
- [x] Gerar despesa automática de faxina por reserva no razão
- [x] Ocultar lançamentos automáticos das telas de Receitas / Despesas / Aportes
- [x] Bloquear no servidor a edição/exclusão de lançamento automático por essas rotas, para não dessincronizar a reserva/parcela de origem

## Painel e navegação

- [x] Card "Vigência dos contratos de longa duração" no painel, com próximos reajustes e fins de contrato ordenados por data e destaque para eventos vencidos
- [x] Esconder o card de estatística "Clientes" para o perfil holding
- [x] Esconder Clientes e Repasse ao Proprietário no menu lateral para o perfil holding
- [x] Remover Aportes do menu lateral e renomear Reservas para "Reservas de Curta Temporada"
- [x] Remover o item "Receitas, despesas e aportes" do menu de três pontinhos em Imóveis

## Identidade visual — revisões

- [x] Trocar a paleta para terracota + azul-marinho
- [x] Trocar a paleta para visual clean neutro com acento em azul petróleo
