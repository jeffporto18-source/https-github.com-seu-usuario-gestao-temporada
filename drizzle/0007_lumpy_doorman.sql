CREATE TABLE `expense_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `categoria` varchar(100);--> statement-breakpoint
ALTER TABLE `expenses` ADD `categoryId` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `contratoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `properties` ADD `contratoKey` varchar(255);--> statement-breakpoint
ALTER TABLE `properties` DROP COLUMN `inscricaoMunicipal`;--> statement-breakpoint
ALTER TABLE `properties` DROP COLUMN `codigoIbge`;