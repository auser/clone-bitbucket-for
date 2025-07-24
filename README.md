# jQuery Upgrade Toolkit

This toolkit provides automated scripts to upgrade jQuery to version 3.7.1 across multiple repositories. It handles various jQuery usage patterns including embedded files, dependency management, and plugin compatibility.

## Overview

The toolkit consists of three main scripts:

1. **`scripts/jquery-upgrade-analyzer.sh`** - Analyzes all repositories to identify jQuery usage patterns and compatibility issues
2. **`scripts/jquery-upgrade-script.sh`** - Performs the actual jQuery upgrade across all repositories
3. **`scripts/jquery-rollback.sh`** - Restores jQuery files from backups if needed

## Prerequisites

- Bash shell (tested on macOS and Linux)
- `curl` for downloading jQuery files
- `find`, `grep`, `sed` for file operations
- Write permissions to the repositories directory

## Quick Start

### Step 1: Analyze Current jQuery Usage

First, run the analyzer to understand what needs to be upgraded:

```bash
./scripts/jquery-upgrade-analyzer.sh
```

This will:
- Scan all repositories in the `repos/` directory
- Identify jQuery files and their versions
- Check for deprecated jQuery methods
- Generate a detailed report at `jquery-analysis-report.txt`

### Step 2: Review the Analysis Report

Check the generated report for:
- Which repositories contain jQuery
- Current jQuery versions in use
- Deprecated methods that need attention
- jQuery plugins that may need updates

### Step 3: Perform the Upgrade

Run the upgrade script:

```bash
./scripts/jquery-upgrade-script.sh
```

This will:
- Download jQuery 3.7.1 and related files
- Create backups of all jQuery files
- Replace embedded jQuery files with the new version
- Update dependency files where possible
- Check for compatibility issues

### Step 4: Test and Verify

After the upgrade:
1. Test each application thoroughly
2. Check for any JavaScript errors in browser consoles
3. Verify that all jQuery functionality still works
4. Address any deprecated method warnings

### Step 5: Rollback if Needed

If issues are found, you can rollback to the previous versions:

```bash
# Rollback all repositories
./scripts/jquery-rollback.sh

# Rollback specific repository
./scripts/jquery-rollback.sh --repo repository-name

# List available backups
./scripts/jquery-rollback.sh --list
```

## Supported jQuery Usage Patterns

The toolkit handles the following patterns:

### Embedded jQuery Files
- `jquery-1.4.1.min.js` → `jquery-3.7.1.min.js`
- `jquery-ui-1.7.1.custom.min.js` → `jquery-ui-1.13.2.custom.min.js`
- jQuery plugins (validate, form, maskedinput, etc.)

### Dependency Management
- `package.json` files (Node.js projects)
- `pom.xml` files (Maven projects)
- `build.gradle` files (Gradle projects)
- `ivy.xml` files (Ivy projects)
- `*.gemspec` files (Ruby projects)

### Project Types Supported
- Java web applications (JSP, WAR files)
- Grails applications
- Node.js applications
- Ruby applications
- Any project with embedded jQuery files

## Files and Directories

```
scraper/
├── scripts/
│   ├── jquery-upgrade-analyzer.sh    # Analysis script
│   ├── jquery-upgrade-script.sh      # Main upgrade script
│   └── jquery-rollback.sh           # Rollback script
├── jquery-analysis-report.txt   # Generated analysis report
├── upgrade.log                  # Upgrade execution log
├── rollback.log                 # Rollback execution log
├── temp/                        # Temporary files (auto-created)
└── repos/                       # Repository directory
    ├── repository-1/
    │   └── .jquery-backup-YYYYMMDD-HHMMSS/  # Backup directory
    └── repository-2/
        └── .jquery-backup-YYYYMMDD-HHMMSS/  # Backup directory
```

## jQuery 3.7.1 Compatibility Notes

### Breaking Changes from Older Versions

1. **Deprecated Methods Removed:**
   - `.live()` → Use `.on()` instead
   - `.die()` → Use `.off()` instead
   - `.bind()` → Use `.on()` instead
   - `.unbind()` → Use `.off()` instead
   - `.delegate()` → Use `.on()` instead
   - `.undelegate()` → Use `.off()` instead
   - `.size()` → Use `.length` instead
   - `.andSelf()` → Use `.addBack()` instead

2. **Removed Properties:**
   - `jQuery.browser` → Use feature detection instead
   - `jQuery.support` → Use feature detection instead

3. **jQuery UI Changes:**
   - Updated to version 1.13.2
   - Some widget APIs may have changed

### Common Migration Patterns

```javascript
// Old (deprecated)
$('.element').live('click', handler);
$('.element').die('click');

// New (jQuery 3.7.1)
$(document).on('click', '.element', handler);
$(document).off('click', '.element');

// Old (deprecated)
$('.element').bind('click', handler);
$('.element').unbind('click');

// New (jQuery 3.7.1)
$('.element').on('click', handler);
$('.element').off('click');
```

## Troubleshooting

### Common Issues

1. **Script Permission Denied:**
   ```bash
   chmod +x *.sh
   ```

2. **Network Issues Downloading jQuery:**
   - Check internet connection
   - Verify proxy settings if behind corporate firewall
   - Manual download may be required

3. **Backup Directory Not Found:**
   - Ensure the upgrade script ran successfully
   - Check for `.jquery-backup-*` directories in repositories

4. **jQuery Plugins Not Working:**
   - Some plugins may need updates for jQuery 3.7.1
   - Check plugin documentation for compatibility
   - Consider alternative plugins if needed

### Manual Steps for Complex Cases

For repositories with complex jQuery usage:

1. **Custom jQuery Builds:**
   - Manually review and update custom jQuery configurations
   - Test thoroughly after changes

2. **Heavy Plugin Usage:**
   - Update plugins to versions compatible with jQuery 3.7.1
   - Test each plugin individually

3. **Deprecated Method Usage:**
   - Manually update code to use new jQuery APIs
   - Use the analysis report to identify all instances

## Safety Features

- **Automatic Backups:** All original files are backed up before modification
- **Logging:** All operations are logged for audit purposes
- **Rollback Capability:** Easy restoration of previous versions
- **Dry-run Analysis:** Understand impact before making changes

## Contributing

To extend the toolkit:

1. Add support for new project types in the scripts
2. Update plugin compatibility lists
3. Add new deprecated method patterns
4. Improve error handling and reporting

## License

This toolkit is provided as-is for internal use. Please ensure compliance with jQuery's license terms when using the upgraded files.