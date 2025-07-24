# Bitbucket Code Scraper

A TypeScript-based web scraper that searches for specific code files across Bitbucket repositories and automatically clones matching repositories.

## Overview

This tool automates the process of finding repositories containing specific files (like `jquery-2.1.0.min.js`) on Bitbucket and cloning them to your local machine. It uses Playwright for web automation and integrates with 1Password for secure credential management.

## Features

- 🔍 **Code Search**: Searches for specific files across all accessible Bitbucket repositories
- 🔐 **Secure Authentication**: Uses 1Password integration for secure credential storage
- 🔄 **2FA Support**: Handles both Bitbucket and Atlassian two-factor authentication
- 📁 **Auto-cloning**: Automatically clones matching repositories to a specified directory
- 🚀 **Pagination Support**: Handles multiple pages of search results
- 🛡️ **Error Handling**: Robust error handling for network issues and authentication failures

## Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- 1Password CLI (`op`) installed and authenticated
- Bitbucket account with access to repositories you want to search

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd scraper
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. (Optional) Install globally for easier access:
```bash
pnpm install -g .
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# 1Password configuration
ONEPASSWORD_PREFIX="op://vault/item"

# Optional: Custom clone directory (defaults to ./code)
CLONE_PATH="./repositories"

# Optional: Custom Bitbucket URL (defaults to https://bitbucket.org)
BITBUCKET_BASE_URL="https://bitbucket.org"
```

### 1Password Setup

1. Create a secure note in 1Password with the following fields:
   - `username`: Your Bitbucket username
   - `password`: Your Bitbucket password
   - `otp`: Your Bitbucket 2FA secret (TOTP)
   - `one-time password`: Your Atlassian 2FA secret (TOTP)

2. Update the `ONEPASSWORD_PREFIX` in your `.env` file to point to your 1Password item:
   ```env
   ONEPASSWORD_PREFIX="op://your-vault/your-item"
   ```

## Usage

### Command Line Interface

The scraper now provides a flexible command-line interface with various options:

#### Basic Usage

Search for a specific file and clone repositories:

```bash
# Using pnpm script
pnpm scraper --search "jquery-2.1.0.min.js"

# Using pnpm cli (alternative)
pnpm cli --search "jquery-2.1.0.min.js"

# Direct execution
./index.ts --search "jquery-2.1.0.min.js"
```

#### Available Options

```bash
# Get help for all options
pnpm scraper --help
# or
./index.ts --help
```

**Required Options:**
- `--search, -s`: Search term (file name to search for)

**Optional Options:**
- `--url, -u`: Bitbucket URL to search (default: https://bitbucket.org)
- `--clone-path, -c`: Directory to clone repositories to (overrides CLONE_PATH env var)
- `--dry-run, -d`: Show what would be cloned without actually cloning
- `--verbose, -v`: Enable verbose output
- `--max-results, -m`: Maximum number of repositories to clone
- `--help, -h`: Show help
- `--version, -V`: Show version number

#### Examples

**Search for jQuery files:**
```bash
pnpm scraper --search "jquery-2.1.0.min.js"
```

**Dry run to see what would be cloned:**
```bash
pnpm scraper --search "package.json" --dry-run
```

**Limit to 5 repositories:**
```bash
pnpm scraper --search "webpack.config.js" --max-results 5
```

**Custom clone directory:**
```bash
pnpm scraper --search "docker-compose.yml" --clone-path "./my-repos"
```

**Verbose output:**
```bash
pnpm scraper --search "README.md" --verbose
```

**Search on a different Bitbucket instance:**
```bash
pnpm scraper --url "https://bitbucket.company.com" --search "config.yml"
```

### Global Installation Usage

If you installed the tool globally, you can use it directly:

```bash
# Search for files
bitbucket-scraper --search "package.json"

# With all the same options
bitbucket-scraper --search "webpack.config.js" --dry-run --verbose
```

### Direct Execution

You can also run the script directly:

```bash
# Make executable (if not already done)
chmod +x index.ts

# Run directly
./index.ts --search "package.json"
```

### Legacy Usage

For backward compatibility, you can still use the old method:

```bash
pnpm dev
```

This will use the hardcoded search term from the code.

### Build and Run Production

```bash
# Build the project
pnpm build

# Run the built version
pnpm start
```

## How It Works

1. **Authentication**: The scraper authenticates with Bitbucket using credentials from 1Password
2. **Search**: Navigates to Bitbucket and searches for the specified file across all accessible repositories
3. **Result Processing**: Extracts repository URLs from search results, handling pagination
4. **Repository Cloning**: For each matching repository, extracts the git clone URL and clones it locally

## Project Structure

```
scraper/
├── index.ts              # Main entry point
├── lib/
│   ├── config.ts         # Configuration and authentication logic
│   └── scraper.ts        # Core scraping functionality
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Dependencies

- **Playwright**: Web automation and browser control
- **1Password CLI**: Secure credential management
- **otpauth**: TOTP code generation for 2FA
- **dotenv**: Environment variable management

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure your 1Password CLI is authenticated: `op signin`
   - Verify your 1Password item contains all required fields
   - Check that your 2FA secrets are correctly formatted

2. **No Search Results**
   - Verify the search term exists in accessible repositories
   - Check your Bitbucket permissions
   - Ensure the search term is specific enough

3. **Clone Failures**
   - Verify you have access to the repositories
   - Check your git configuration
   - Ensure the clone directory is writable

### Debug Mode

For debugging, you can modify the browser launch options in `lib/scraper.ts`:

```typescript
const browser: Browser = await chromium.launch({ 
  headless: false, // Set to false to see the browser
  slowMo: 1000     // Add delays to see what's happening
});
```

## Security Notes

- Credentials are stored securely in 1Password
- No sensitive data is logged or stored locally
- TOTP codes are generated on-demand and not cached
- The scraper runs in headless mode by default

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open an issue on the repository.