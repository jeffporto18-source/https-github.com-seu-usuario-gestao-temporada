ALTER TABLE `contract_rent_charges` ADD `multaJuros` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_rent_charges` ADD `desconto` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_rent_charges` ADD `valorRecebido` decimal(12,2);--> statement-breakpoint
ALTER TABLE `contract_rent_charges` ADD `descontoExpenseId` int;