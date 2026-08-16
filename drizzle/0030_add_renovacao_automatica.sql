ALTER TABLE `long_term_contracts` ADD `renovacaoAutomatica` enum('novo_contrato','prazo_indeterminado');
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `renovacaoContratoUrl` varchar(500);
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `renovacaoContratoKey` varchar(255);
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoDataInicio` date;
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoValor` decimal(12,2);
--> statement-breakpoint
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoPrazoReajusteMeses` int;
