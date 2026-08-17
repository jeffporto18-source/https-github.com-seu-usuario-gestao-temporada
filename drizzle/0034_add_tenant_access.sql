CREATE TABLE `tenant_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantOwnerId` int NOT NULL,
	`nivel` enum('total','operacional','consulta') NOT NULL DEFAULT 'total',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_access_user_tenant` UNIQUE(`userId`,`tenantOwnerId`)
);
--> statement-breakpoint
INSERT INTO `tenant_access` (`userId`, `tenantOwnerId`, `nivel`)
SELECT `id`, `id`, 'total' FROM `users` WHERE `invitedBy` IS NULL;
--> statement-breakpoint
INSERT INTO `tenant_access` (`userId`, `tenantOwnerId`, `nivel`)
SELECT `id`, `invitedBy`, 'total' FROM `users` WHERE `invitedBy` IS NOT NULL;
