CREATE TABLE `socios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(150) NOT NULL,
	`cpf` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `socios_id` PRIMARY KEY(`id`)
);
