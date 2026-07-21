ALTER TABLE `users` ADD `tipoCadastro` enum('pj','pf');--> statement-breakpoint
ALTER TABLE `users` ADD `cnpj` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `razaoSocial` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `cpfResponsavel` varchar(14);--> statement-breakpoint
ALTER TABLE `users` ADD `nomeResponsavel` varchar(255);