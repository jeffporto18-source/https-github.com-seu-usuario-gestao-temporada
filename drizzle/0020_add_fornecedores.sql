CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`nome` varchar(150) NOT NULL,
	`cpfCnpj` varchar(20),
	`telefone` varchar(20),
	`email` varchar(150),
	`ativo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`)
);
