'use strict';
const config = require('../lib/config').load();
const { open } = require('../lib/db');
const { seedIfEmpty } = require('../lib/seed');
const db = open(config.dbPath);
console.log(`Seeded ${seedIfEmpty(db)} products into ${config.dbPath}`);
