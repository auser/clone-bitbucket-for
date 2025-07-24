#!/usr/bin/env tsx

import { scrape } from './lib/scraper.js';
import { getConfig } from './lib/config.js';
import { exec } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('$0 [options]')
    .option('url', {
      alias: 'u',
      type: 'string',
      description: 'Bitbucket URL to search',
      default: 'https://bitbucket.org'
    })
    .option('search', {
      alias: 's',
      type: 'string',
      description: 'Search term (file name to search for)',
      demandOption: true
    })
    .option('clone-path', {
      alias: 'c',
      type: 'string',
      description: 'Directory to clone repositories to',
      default: undefined
    })
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be cloned without actually cloning',
      default: false
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    })
    .option('max-results', {
      alias: 'm',
      type: 'number',
      description: 'Maximum number of repositories to clone',
      default: undefined
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .argv;

  const config = getConfig();

  // Override clone path if specified via command line
  if (argv.clonePath) {
    config.clonePath = argv.clonePath;
  }

  if (argv.verbose) {
    console.log('Configuration:', config);
    console.log('Search URL:', argv.url);
    console.log('Search term:', argv.search);
    console.log('Clone path:', config.clonePath);
    console.log('Dry run:', argv.dryRun);
    if (argv.maxResults) {
      console.log('Max results:', argv.maxResults);
    }
  }

  console.log(`🔍 Searching for "${argv.search}" on ${argv.url}...`);

  const results = await scrape(argv.url, argv.search);

  if (argv.verbose) {
    console.log(`Found ${results.length} repositories`);
  }

  if (results.length === 0) {
    console.log('❌ No repositories found matching your search criteria.');
    return;
  }

  // Limit results if max-results is specified
  const repositoriesToClone = argv.maxResults
    ? results.slice(0, argv.maxResults)
    : results;

  console.log(`📁 Found ${repositoriesToClone.length} repository(ies) to clone`);

  if (argv.dryRun) {
    console.log('\n🔍 DRY RUN - Would clone the following repositories:');
    repositoriesToClone.forEach((result, index) => {
      const repoName = result.split('/').pop();
      console.log(`${index + 1}. ${repoName} (${result})`);
    });
    return;
  }

  // Ensure clone directory exists
  if (!existsSync(config.clonePath)) {
    console.log(`📂 Creating clone directory: ${config.clonePath}`);
    mkdirSync(config.clonePath, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [index, result] of repositoriesToClone.entries()) {
    const repoName = result.split('/').pop();
    console.log(`\n[${index + 1}/${repositoriesToClone.length}] 🚀 Cloning ${repoName}...`);

    if (existsSync(`${config.clonePath}/${repoName}`)) {
      console.log(`❌ ${repoName} already exists`);
      continue;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`git clone ${result} ${config.clonePath}/${repoName}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Failed to clone ${repoName}:`, error.message);
            errorCount++;
            reject(error);
          } else {
            console.log(`✅ Successfully cloned ${repoName}`);
            successCount++;
            resolve();
          }
        });
      });
    } catch (error) {
      // Error already logged above
    }
  }

  console.log(`\n🎉 Cloning complete!`);
  console.log(`✅ Successfully cloned: ${successCount} repository(ies)`);
  if (errorCount > 0) {
    console.log(`❌ Failed to clone: ${errorCount} repository(ies)`);
  }
  console.log(`📂 Repositories saved to: ${config.clonePath}`);
}

main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
