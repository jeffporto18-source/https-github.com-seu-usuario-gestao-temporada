CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`tipo` enum('PF','PJ') NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpfCnpj` varchar(20) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(40),
	`certificadoA1Nome` varchar(255),
	`certificadoA1Validade` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`categoria` enum('luz','gas','iptu','condominio','faxineira','material_limpeza','kit_banheiro') NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`descricao` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`categoria` enum('roupa_de_cama','acessorios','outros_enxoval') NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`descricao` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`reservationId` int NOT NULL,
	`propertyId` int NOT NULL,
	`tipo` enum('locacao','comissao') NOT NULL,
	`codigoServico` varchar(20) NOT NULL,
	`valorServicos` decimal(12,2) NOT NULL,
	`baseCalculo` decimal(12,2),
	`cbs` decimal(12,2),
	`ibs` decimal(12,2),
	`status` enum('simulada','autorizada','cancelada') NOT NULL DEFAULT 'simulada',
	`chaveAcesso` varchar(60),
	`numeroNfse` varchar(30),
	`payloadJson` text NOT NULL,
	`respostaJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`clientId` int NOT NULL,
	`apelido` varchar(255) NOT NULL,
	`endereco` varchar(500),
	`comissaoPct` decimal(5,2) NOT NULL DEFAULT '20.00',
	`inscricaoMunicipal` varchar(60),
	`codigoIbge` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`codigo` varchar(60) NOT NULL,
	`valorBruto` decimal(12,2) NOT NULL,
	`taxaLimpeza` decimal(12,2) NOT NULL DEFAULT '0.00',
	`taxaAirbnbPct` decimal(5,2) NOT NULL DEFAULT '4.00',
	`checkin` date NOT NULL,
	`checkout` date NOT NULL,
	`noites` int NOT NULL DEFAULT 1,
	`competencia` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
