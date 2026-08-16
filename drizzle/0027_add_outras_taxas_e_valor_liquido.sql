ALTER TABLE `reservations` ADD `outrasTaxas` decimal(12,2) NOT NULL DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `reservations` ADD `valorLiquidoRecebido` decimal(12,2) NOT NULL DEFAULT '0.00';
