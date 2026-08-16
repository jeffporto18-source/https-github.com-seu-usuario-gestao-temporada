CREATE TABLE `property_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`tipo` enum('condominio','iptu','condominio_extra') NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`competenciaInicio` varchar(7) NOT NULL,
	`qtdMeses` int NOT NULL DEFAULT 1,
	`dia` int NOT NULL DEFAULT 10,
	`descricao` varchar(300),
	`costResponsavel` enum('proprietario','inquilino'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `condominioPor` enum('proprietario','inquilino_direto','inquilino_via_repasse') NOT NULL DEFAULT 'proprietario';
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `iptuPor` enum('proprietario','inquilino_direto','inquilino_via_repasse') NOT NULL DEFAULT 'proprietario';
--> statement-breakpoint
ALTER TABLE `contract_rent_charges` ADD `condominio` decimal(12,2) NOT NULL DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `contract_rent_charges` ADD `iptu` decimal(12,2) NOT NULL DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `ledger_entries` ADD `propertyCostId` int;
