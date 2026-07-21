ALTER TABLE `properties` ADD `custoFaxina` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `reservations` ADD `faxinasUtilizadas` int DEFAULT 1 NOT NULL;