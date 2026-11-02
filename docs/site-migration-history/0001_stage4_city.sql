CREATE TABLE IF NOT EXISTS `city_state_stage4` (
  `id` integer PRIMARY KEY NOT NULL CHECK (`id` = 1),
  `version` integer NOT NULL,
  `json` text NOT NULL
);
