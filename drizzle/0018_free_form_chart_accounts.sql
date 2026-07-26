ALTER TABLE `chart_accounts` MODIFY COLUMN `grupo` enum('despesa_fixa','despesa_variavel','investimento','receita','aporte_capital') NOT NULL;
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`chartAccountId` int,
	`grupo` enum('despesa_fixa','despesa_variavel','investimento','receita','aporte_capital') NOT NULL,
	`categoria` varchar(300),
	`valor` decimal(12,2) NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`descricao` varchar(500),
	`reservationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ledger_entries` ADD COLUMN `_old_expense_id` int;
--> statement-breakpoint
INSERT INTO `ledger_entries` (`ownerId`, `propertyId`, `chartAccountId`, `grupo`, `categoria`, `valor`, `competencia`, `descricao`, `reservationId`, `createdAt`, `updatedAt`, `_old_expense_id`)
SELECT `ownerId`, `propertyId`, `chartAccountId`,
       CASE WHEN `tipoDespesa` = 'fixa' THEN 'despesa_fixa' ELSE 'despesa_variavel' END,
       `categoria`, `valor`, `competencia`, `descricao`, `reservationId`, `createdAt`, `updatedAt`, `id`
FROM `expenses`
WHERE `chartAccountId` IS NOT NULL;
--> statement-breakpoint
UPDATE `contract_rent_charges` crc
JOIN `ledger_entries` le ON le.`_old_expense_id` = crc.`descontoExpenseId`
SET crc.`descontoExpenseId` = le.`id`;
--> statement-breakpoint
ALTER TABLE `ledger_entries` DROP COLUMN `_old_expense_id`;
--> statement-breakpoint
INSERT INTO `ledger_entries` (`ownerId`, `propertyId`, `chartAccountId`, `grupo`, `categoria`, `valor`, `competencia`, `descricao`, `createdAt`, `updatedAt`)
SELECT `ownerId`, `propertyId`, `chartAccountId`, 'investimento', `categoria`, `valor`, `competencia`, `descricao`, `createdAt`, `updatedAt`
FROM `investments`
WHERE `chartAccountId` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `contract_rent_charges` CHANGE COLUMN `descontoExpenseId` `descontoLedgerEntryId` int;
--> statement-breakpoint
DROP TABLE `expenses`;
--> statement-breakpoint
DROP TABLE `investments`;
