DROP TABLE `ledger_entries`;
--> statement-breakpoint
DROP TABLE `chart_accounts`;
--> statement-breakpoint
CREATE TABLE `chart_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`grupo` enum('despesa_fixa','despesa_variavel','receita','aporte_capital') NOT NULL,
	`nome` varchar(100) NOT NULL,
	`parentId` int,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chart_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`chartAccountId` int,
	`grupo` enum('despesa_fixa','despesa_variavel','receita','aporte_capital') NOT NULL,
	`categoria` varchar(300),
	`descricao` varchar(300),
	`contraparte` varchar(150),
	`valor` decimal(12,2) NOT NULL,
	`dia` int NOT NULL,
	`competenciaInicio` varchar(7) NOT NULL,
	`qtdMeses` int NOT NULL DEFAULT 1,
	`observacao` varchar(1000),
	`reservationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
