# Gestão de Temporada — TODO

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
