CREATE TABLE `contract_rent_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`contractId` int NOT NULL,
	`propertyId` int NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`dataVencimento` date NOT NULL,
	`status` enum('pendente','recebido') NOT NULL DEFAULT 'pendente',
	`dataRecebimento` date,
	CONSTRAINT `contract_rent_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curta_managers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`telefone` varchar(40),
	`email` varchar(320),
	`contato` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curta_managers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guarantee_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guarantee_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imobiliarias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`telefone` varchar(40),
	`email` varchar(320),
	`contato` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`endereco` varchar(500),
	`celular` varchar(40),
	`whatsapp` varchar(40),
	CONSTRAINT `imobiliarias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	`descricao` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investment_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investment_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `long_term_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`dataInicio` date NOT NULL,
	`dataFim` date NOT NULL,
	`dataReajuste` date,
	`indiceCorrecao` varchar(50) NOT NULL DEFAULT 'IGPM',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`nomeInquilino` varchar(255),
	`cpfCnpjInquilino` varchar(20),
	`contatoInquilino` varchar(255),
	`telefoneInquilino` varchar(40),
	`celularInquilino` varchar(40),
	`whatsappInquilino` varchar(40),
	`emailInquilino` varchar(320),
	`carenciaInicio` date,
	`carenciaFim` date,
	`prazoMeses` int NOT NULL DEFAULT 12,
	`diaVencimentoAluguel` int NOT NULL DEFAULT 10,
	CONSTRAINT `long_term_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `investments` MODIFY COLUMN `categoria` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `userType` enum('administradora','admin_airbnb','proprietario','holding','gestor_temporada_pj');--> statement-breakpoint
ALTER TABLE `properties` ADD `imobiliariaId` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `tipoAdministracao` enum('propria','administradora','gestor_curta_temporada') DEFAULT 'propria' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `gestorId` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `financiado` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `tipoFinanciamento` enum('financiamento','consorcio');--> statement-breakpoint
ALTER TABLE `properties` ADD `valorParcela` decimal(10,2);