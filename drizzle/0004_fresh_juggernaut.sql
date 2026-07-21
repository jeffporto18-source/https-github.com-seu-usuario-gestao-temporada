ALTER TABLE `users` ADD `userType` enum('administradora','admin_airbnb','proprietario');--> statement-breakpoint
ALTER TABLE `users` ADD `fiscalCategory` enum('pj','pf_cbs_ibs','pf_isento');