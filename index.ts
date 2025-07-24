#!/usr/bin/env tsx

import { scrape } from './lib/scraper.js';
import { getConfig } from './lib/config.js';
import { exec } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initializeLogger, getLogger, getLogLevel, LogLevel } from './lib/logger.js';

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
    .option('branch', {
      alias: 'b',
      type: 'string',
      description: 'Branch to clone from (falls back to default if not found)',
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
      type: 'count',
      description: 'Increase verbosity (use multiple times: -v, -vv, -vvv)',
      default: 0
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

  // Determine log level based on verbose count
  let effectiveLogLevel = 'info';
  if (argv.verbose > 0) {
    const verboseLevels = ['info', 'debug', 'verbose'];
    const verboseIndex = Math.min(argv.verbose - 1, verboseLevels.length - 1);
    effectiveLogLevel = verboseLevels[verboseIndex] || 'info';
  }

  const config = getConfig();

  // Override clone path if specified via command line
  if (argv.clonePath) {
    config.clonePath = argv.clonePath;
  }

  // Initialize logger
  const logLevel = getLogLevel(effectiveLogLevel);
  const logger = initializeLogger({
    level: logLevel,
    logToFile: true,
    logDir: config.logDir || undefined,
    logFile: config.logFile || undefined,
    consoleOutput: true
  });

  // Log configuration
  logger.logConfiguration({
    clonePath: config.clonePath,
    searchUrl: argv.url,
    searchTerm: argv.search,
    branch: argv.branch || 'default',
    dryRun: argv.dryRun,
    maxResults: argv.maxResults,
    verboseCount: argv.verbose,
    effectiveLogLevel,
    logToFile: true,
    logDir: config.logDir,
    logFile: config.logFile,
    noConsole: false
  });

  // Log search start
  logger.search(argv.search, argv.url);

  const results = await scrape(argv.url, argv.search, logger);

  logger.debug(`Found ${results.length} repositories`);

  if (results.length === 0) {
    logger.noResults();
    return;
  }

  // Limit results if max-results is specified
  const repositoriesToClone = argv.maxResults
    ? results.slice(0, argv.maxResults)
    : results;

  logger.foundRepositories(repositoriesToClone.length);

  if (argv.dryRun) {
    logger.dryRun(repositoriesToClone);
    logger.info('🔍 DRY RUN - Would clone the following repositories:');
    repositoriesToClone.forEach((result, index) => {
      const repoName = result.split('/').pop();
      const branchInfo = argv.branch ? ` (branch: ${argv.branch})` : '';
      logger.info(`${index + 1}. ${repoName} (${result})${branchInfo}`);
    });
    return;
  }

  // Ensure clone directory exists
  if (!existsSync(config.clonePath)) {
    logger.info(`📂 Creating clone directory: ${config.clonePath}`);
    mkdirSync(config.clonePath, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [index, result] of repositoriesToClone.entries()) {
    const repoName = result.split('/').pop()?.split('.')[0];
    logger.cloningRepository(repoName!, index + 1, repositoriesToClone.length);

    if (existsSync(`${config.clonePath}/${repoName}`)) {
      logger.repositoryExists(repoName!);
      continue;
    }

    try {
      await cloneRepository(result, repoName!, config.clonePath, argv.branch as string | undefined, logger);
      successCount++;
    } catch (error) {
      logger.cloneError(repoName!, (error as Error).message);
      errorCount++;
    }
  }

  logger.cloningComplete(successCount, errorCount, config.clonePath);

  // Log summary to console
  console.log(`\n🎉 Cloning complete!`);
  console.log(`✅ Successfully cloned: ${successCount} repository(ies)`);
  if (errorCount > 0) {
    console.log(`❌ Failed to clone: ${errorCount} repository(ies)`);
  }
  console.log(`📂 Repositories saved to: ${config.clonePath}`);

  // Log file information
  const logFile = logger.getLogFilePath();
  const errorLogFile = logger.getErrorLogFilePath();
  console.log(`📝 Logs saved to: ${logFile}`);
  if (errorLogFile) {
    console.log(`❌ Error logs saved to: ${errorLogFile}`);
  }
}

async function cloneRepository(repoUrl: string, repoName: string, clonePath: string, branch: string | undefined, logger: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (branch) {
      // Try to clone from specific branch first
      logger.debug(`Attempting to clone from branch: ${branch}`, { repoName, branch });

      exec(`git clone -b ${branch} ${repoUrl} ${clonePath}/${repoName}`, (error, stdout, stderr) => {
        if (error) {
          logger.cloneFallback(repoName, branch);

          // Fall back to default branch
          exec(`git clone ${repoUrl} ${clonePath}/${repoName}`, (fallbackError, fallbackStdout, fallbackStderr) => {
            if (fallbackError) {
              reject(new Error(fallbackError.message));
            } else {
              logger.cloneSuccess(repoName);
              resolve();
            }
          });
        } else {
          logger.cloneSuccess(repoName, branch);
          resolve();
        }
      });
    } else {
      // Clone from default branch
      exec(`git clone ${repoUrl} ${clonePath}/${repoName}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.message));
        } else {
          logger.cloneSuccess(repoName);
          resolve();
        }
      });
    }
  });
}

main().catch(error => {
  const logger = getLogger();
  logger.error('💥 Fatal error:', { error: error.message, stack: error.stack });

  // Also log to console if not disabled
  if (logger) {
    console.error('💥 Fatal error:', error.message);
  }
  process.exit(1);
});
