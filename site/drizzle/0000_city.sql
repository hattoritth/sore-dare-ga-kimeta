CREATE TABLE `city_state` (
  `id` integer PRIMARY KEY NOT NULL CHECK (`id` = 1),
  `version` integer NOT NULL,
  `json` text NOT NULL
);
