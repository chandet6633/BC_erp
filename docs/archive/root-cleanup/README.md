# Root Cleanup Archive

This folder keeps legacy root-level scripts and obsolete test config files for reference only.

These files were moved out of the repository root during Phase 0 cleanup so active work is easier to identify for developers and AI agents.

## Archived Items

- `auto_backup.bat`
- `backup.bat`
- `promote_to_production.bat`
- `seed_test_data.bat`
- `server_status.bat`
- `update.bat`
- `update_production.bat`
- `update_test.bat`
- `docker-compose.test.yml`

## Active Replacements

- Use the documented Docker/npm workflows in the root `README.md` for current development and testing.
- Keep `docker-compose.test.nocodb.yml` as the active local test stack.
- Keep `docker-compose.yml`, `nginx-portal.conf`, and `nginx-mungkhud.conf` as future production deployment inputs.
- Keep `nginx-test-portal.conf` and `nginx-test-mungkhud.conf` as active local test proxy configs.

Do not restore these archived files to the root unless a future task explicitly reactivates them.
