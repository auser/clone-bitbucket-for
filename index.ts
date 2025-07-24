#!/usr/bin/env tsx

import { scrape } from './lib/scraper.js';
import { getConfig } from './lib/config.js';
import { exec } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';

async function main() {
  const config = getConfig();
  console.log(config);

  const url = "https://bitbucket.org"
  const searchTerm = "jquery-2.1.0.min.js";
  const results = await scrape(url, searchTerm);

  for (const result of results) {
    console.log(result);
    const repoName = result.split('/').pop();
    const { mkdirSync, existsSync } = await import('node:fs');
    if (!existsSync(config.clonePath)) {
      mkdirSync(config.clonePath, { recursive: true });
    }
    exec(`git clone ${result} ${config.clonePath}/${repoName}`);
  }
}

main();
