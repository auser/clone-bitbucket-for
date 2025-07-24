# Bitbucket Scraper Examples

This document provides practical examples of how to use the Bitbucket scraper CLI tool for various scenarios.

## Basic Examples

### 1. Find jQuery Files
```bash
# Search for jQuery files
pnpm scraper --search "jquery-2.1.0.min.js"

# Search for any jQuery file
pnpm scraper --search "jquery"
```

### 2. Find Configuration Files
```bash
# Find webpack configurations
pnpm scraper --search "webpack.config.js"

# Find package.json files
pnpm scraper --search "package.json"

# Find Docker configurations
pnpm scraper --search "docker-compose.yml"
```

### 3. Find Documentation
```bash
# Find README files
pnpm scraper --search "README.md"

# Find API documentation
pnpm scraper --search "api.md"
```

## Advanced Examples

### 4. Limited Results
```bash
# Only clone the first 3 repositories found
pnpm scraper --search "package.json" --max-results 3
```

### 5. Dry Run Mode
```bash
# See what would be cloned without actually cloning
pnpm scraper --search "webpack.config.js" --dry-run

# Dry run with verbose output
pnpm scraper --search "docker-compose.yml" --dry-run --verbose
```

### 6. Custom Clone Directory
```bash
# Clone to a specific directory
pnpm scraper --search "package.json" --clone-path "./my-projects"

# Use absolute path
pnpm scraper --search "webpack.config.js" --clone-path "/Users/username/projects"
```

### 7. Enterprise Bitbucket
```bash
# Search on company Bitbucket instance
pnpm scraper --url "https://bitbucket.company.com" --search "config.yml"
```

### 8. Verbose Output
```bash
# Get detailed information about the process
pnpm scraper --search "package.json" --verbose
```

## Real-World Scenarios

### Scenario 1: Security Audit
Find all repositories containing potentially vulnerable dependencies:
```bash
# Find old jQuery versions
pnpm scraper --search "jquery-1.12.4.min.js" --dry-run

# Find old Bootstrap versions
pnpm scraper --search "bootstrap-3.4.1.min.css" --dry-run
```

### Scenario 2: Code Migration
Find all repositories using a specific framework:
```bash
# Find Angular applications
pnpm scraper --search "angular.json"

# Find React applications
pnpm scraper --search "package.json" --dry-run | grep -i react
```

### Scenario 3: Documentation Discovery
Find all repositories with specific documentation:
```bash
# Find API documentation
pnpm scraper --search "swagger.json"

# Find deployment guides
pnpm scraper --search "deploy.md"
```

### Scenario 4: Configuration Management
Find repositories with specific configurations:
```bash
# Find TypeScript projects
pnpm scraper --search "tsconfig.json"

# Find ESLint configurations
pnpm scraper --search ".eslintrc.js"
```

## Tips and Best Practices

1. **Always use dry-run first** to see what would be cloned
2. **Use specific search terms** to avoid too many results
3. **Limit results** when searching for common files like `package.json`
4. **Use verbose mode** for debugging and understanding the process
5. **Organize clone directories** by project type or purpose

## Common Search Patterns

| File Type     | Search Term         | Use Case                 |
| ------------- | ------------------- | ------------------------ |
| Dependencies  | `package.json`      | Find Node.js projects    |
| Build Tools   | `webpack.config.js` | Find webpack projects    |
| Containers    | `Dockerfile`        | Find containerized apps  |
| Documentation | `README.md`         | Find documented projects |
| Configuration | `.env.example`      | Find environment configs |
| Testing       | `jest.config.js`    | Find Jest test suites    |
| Linting       | `.eslintrc.js`      | Find ESLint projects     |
| TypeScript    | `tsconfig.json`     | Find TypeScript projects |