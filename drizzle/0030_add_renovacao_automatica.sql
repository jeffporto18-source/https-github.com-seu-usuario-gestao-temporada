ALTER TABLE `long_term_contracts` ADD `renovacaoAutomatica` enum('novo_contrato','prazo_indeterminado');
ALTER TABLE `long_term_contracts` ADD `renovacaoContratoUrl` varchar(500);
ALTER TABLE `long_term_contracts` ADD `renovacaoContratoKey` varchar(255);
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoDataInicio` date;
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoValor` decimal(12,2);
ALTER TABLE `long_term_contracts` ADD `prazoIndeterminadoPrazoReajusteMeses` int;
