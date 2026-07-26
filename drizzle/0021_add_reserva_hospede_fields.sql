ALTER TABLE `reservations` ADD `nomeHospede` varchar(150);
--> statement-breakpoint
ALTER TABLE `reservations` ADD `estrangeiro` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `reservations` ADD `documentoUrl` varchar(500);
--> statement-breakpoint
ALTER TABLE `reservations` ADD `documentoKey` varchar(255);
