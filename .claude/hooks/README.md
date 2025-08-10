# Claude Code Hooks

This directory contains hook configurations that automate actions during development.

## Hook Types

### PreToolUse Hooks
Execute before tools are used:
- Validate file paths and permissions
- Block access to sensitive files
- Log all tool usage for audit

### PostToolUse Hooks
Execute after tools complete:
- Auto-format code (Prettier, Black, gofmt)
- Run linters and type checkers
- Trigger relevant agents for review

## Configuration

Hooks are configured in JSON files in this directory. Each hook specifies:
- Trigger conditions
- Actions to perform
- Success/failure handling

## Protected Paths

By default, hooks protect:
- `.env` files
- `.git/` directory
- `node_modules/`
- Any file containing secrets/tokens

## Customization

Add your own hooks by creating new JSON configuration files following the existing patterns.