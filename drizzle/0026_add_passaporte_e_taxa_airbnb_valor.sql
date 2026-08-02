ALTER TABLE `reservations` ADD `passaporteHospede` varchar(40);
ALTER TABLE `reservations` CHANGE COLUMN `taxaAirbnbPct` `taxaAirbnb` decimal(12,2) NOT NULL DEFAULT '0.00';
