import { chromium, Browser, Page } from 'playwright';
import { BitbucketAuth, BitbucketConfig, getBitbucketAuth } from './config.js';
import { Logger } from './logger.js';



export async function scrape(uri: string, searchTerm: string, logger?: Logger): Promise<string[]> {
  if (logger) {
    logger.debug(`Scraping: ${uri}`);
  } else {
    console.log(`Scraping: ${uri}`);
  }

  const config = await getBitbucketAuth();
  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  try {
    // First, authenticate with Bitbucket
    await authenticateWithBitbucket(page, config, logger);

    // Now navigate to the target URL
    await page.goto(uri);
    await searchForCodeInBitbucket(page, searchTerm, logger);
    const searchResults = await scrapeForEachResult(page, logger);
    const searchResultSet = new Set(searchResults);

    const results: string[] = [];
    for (const href of searchResultSet) {
      const gitCloneUrl = await getGitCloneUrl(page, href, logger);
      results.push(gitCloneUrl);
    }
    return results;
  } catch (error) {
    if (logger) {
      logger.error('Error scraping:', { error: (error as Error).message, stack: (error as Error).stack });
    } else {
      console.error('Error scraping:', error);
    }
    return [];
  } finally {
    await browser.close();
  }
}



export async function getGitCloneUrl(page: Page, href: string, logger?: Logger): Promise<string> {
  try {
    await page.goto(href);
    await waitForResultsToLoad(page);
  } catch (error) {
    // Just continue on because bitbucket sucks
  }
  const cloneButton = await page.getByRole('button', { name: 'Clone' }).first();
  await cloneButton.click();
  await waitForResultsToLoad(page);
  const inputLink = await page.locator('input[aria-label="Copyable input"]').first();
  const inputLinkHref = await inputLink.getAttribute('value');
  if (!inputLinkHref) {
    throw new Error('Git clone URL not found');
  }
  const repoUrl = inputLinkHref.replace('git clone ', '');
  return repoUrl;
}

async function scrapeForEachResult(page: Page, logger?: Logger): Promise<string[]> {
  const results: string[] = [];

  // Wait for search results to load
  // await page.waitForLoadState('networkidle');
  // await page.waitForTimeout(30000);

  // Check if there are any search results
  const noResults = await page.getByText('Try searching with a different account or team, or use another search term.').isVisible();
  if (noResults) {
    console.log('No search results found');
    return results;
  }

  let hasNextPage = true;
  let currentPage = 1;

  while (hasNextPage) {
    console.log(`Scraping page ${currentPage}...`);

    // Wait for results to load on current page

    // Find all search result containers
    // Wait for results to load

    await waitForResultsToLoad(page);

    const rows = await page.locator('header').all();
    for (const row of rows) {
      const headerLink = await row.locator('a').first();
      const href = await headerLink.getAttribute('href');
      if (href) {
        results.push(href.toString().trim());
      }
    }


    // Check for next page
    const nextButton = await page.locator('button[aria-label="Next"]').first();
    const isDisabled = await nextButton.getAttribute('disabled');
    if (await nextButton.isVisible() && isDisabled === null) {
      await nextButton.click();
      await waitForResultsToLoad(page);
      currentPage++;
    } else {
      hasNextPage = false;
    }
  }

  return results;
}

async function waitForResultsToLoad(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 2000 });
  } catch (error) {
    // Just continue on
  }
  return;
}

async function searchForCodeInBitbucket(page: Page, searchTerm: string, logger?: Logger): Promise<void> {
  // Find the global search input using the data-test-id from the image
  // const searchInput = await page.locator('[data-test-id="search-dialog-input"]');
  const searchInput = await page.getByPlaceholder('Search');
  await searchInput.fill(searchTerm);

  // Wait for the dropdown to appear (it only shows when there's text in the search box)
  await page.waitForTimeout(1000); // Give time for dropdown to render

  // Look for the primary search suggestion in the dropdown
  // This targets "Search for code in" option
  let searchSuggestion = null;
  const links = await page.getByRole('link').all();
  for (const link of links) {
    const text = await link.textContent();
    if (text?.includes('Search for code in')) {
      searchSuggestion = link;
      break;
    }
  }
  if (!searchSuggestion) {
    console.log('No search suggestion found');
    return;
  }


  if (await searchSuggestion.isVisible()) {
    console.log('Search suggestion found');
    await searchSuggestion.click();
  } else {
    // Fallback: if the specific text isn't found, try to click the first search suggestion
    const firstSuggestion = await page.locator('[role="option"]').first();
    if (await firstSuggestion.isVisible()) {
      console.log('First suggestion found');
      await firstSuggestion.click();
    }
  }
}


async function authenticateWithBitbucket(page: Page, config: BitbucketAuth, logger?: Logger): Promise<void> {
  console.log('Authenticating with Bitbucket...');

  // Go to Bitbucket login page
  await page.goto(`${config.baseUrl}/account/signin/`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if we're redirected to Atlassian login
  const currentUrl = page.url();

  if (currentUrl.includes('id.atlassian.com')) {
    await handleAtlassianLogin(page, config);
  }
}


async function handleAtlassianLogin(page: Page, config: BitbucketAuth): Promise<void> {

  // Wait for the login form to load
  await page.waitForLoadState('networkidle');

  let usernameField = await page.waitForSelector('#username-uid1', { timeout: 5000 });

  // Fill in username
  await usernameField.fill(config.username);

  // Click continue
  const continueBtn = await page.getByRole('button', { name: 'Continue' });
  await continueBtn.click();
  await page.waitForLoadState('networkidle');

  // Wait for the password field to load
  let passwordField = await page.getByRole('textbox', { name: 'Password' });

  // Fill in password
  await passwordField.fill(config.password);

  const loginBtn1 = await page.getByRole('button', { name: 'Log In' });
  await loginBtn1.click();
  // Wait for authentication to complete
  await page.waitForLoadState('networkidle');

  // Check if we're on the Atlassian 2FA page or Bitbucket 2FA page
  const currentUrl = page.url();

  if (currentUrl.includes('id.atlassian.com')) {
    // Handle Atlassian 2FA
    const otpInput = await page.getByRole('textbox', { name: '6-digit verification code' });
    await otpInput.fill(config.atlassianOtp);

    const loginBtn2 = await page.getByRole('button', { name: 'Log In' });
    const otpInput2 = await page.locator('input[name="token"]');
    await otpInput2.fill(config.bitbucketOtp);

    const verifyBtn = await page.getByRole('button', { name: 'Verify' });
    await verifyBtn.click();
    await page.waitForLoadState('networkidle');
    console.log('Bitbucket 2FA completed');
  }
}


