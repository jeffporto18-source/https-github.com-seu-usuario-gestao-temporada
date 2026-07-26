CREATE TABLE `chart_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`grupo` enum('despesa_fixa','despesa_variavel','investimento') NOT NULL,
	`nome` varchar(100) NOT NULL,
	`parentId` int,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chart_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `chartAccountId` int;
--> statement-breakpoint
ALTER TABLE `expenses` ADD `tipoDespesa` enum('fixa','variavel');
--> statement-breakpoint
ALTER TABLE `investments` ADD `chartAccountId` int;
--> statement-breakpoint
INSERT INTO `chart_accounts` (`ownerId`, `grupo`, `nome`, `ativa`)
SELECT `ownerId`,
       CASE WHEN `nome` IN ('Luz','Gás','IPTU','Condomínio') THEN 'despesa_fixa' ELSE 'despesa_variavel' END,
       `nome`, `ativa`
FROM `expense_categories`;
--> statement-breakpoint
INSERT INTO `chart_accounts` (`ownerId`, `grupo`, `nome`, `ativa`)
SELECT `ownerId`, 'investimento', `nome`, `ativa`
FROM `investment_categories`;
--> statement-breakpoint
ALTER TABLE `expenses` DROP COLUMN `categoryId`;
--> statement-breakpoint
DROP TABLE `expense_categories`;
--> statement-breakpoint
DROP TABLE `investment_categories`;
