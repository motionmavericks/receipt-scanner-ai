# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Commands

### Development Commands
```bash
# No project-specific commands yet - this appears to be a new project
# When you add a project framework, update this section with appropriate commands
```

## System Architecture

### Claude Code Configuration Structure
This repository contains a comprehensive Claude Code setup with:

- **Subagents** (`.claude/agents/`): 7 specialized AI agents for different tasks
  - code-reviewer: Code quality and security analysis
  - test-writer: Comprehensive test generation  
  - bug-finder: Debugging and root cause analysis
  - security-scanner: Vulnerability detection
  - performance-optimizer: Speed and efficiency improvements
  - refactoring-expert: Code quality improvements
  - documentation-expert: Technical documentation

- **Hooks** (`.claude/hooks.json`): Automated actions that trigger on events
  - PreToolUse: Validates actions, logs commands, blocks sensitive files
  - PostToolUse: Auto-formats code (Prettier/Black/gofmt), triggers subagents
  - Logging: All activities logged to `.claude/logs/`

- **System Orchestration** (`.claude/`): Intelligent coordination
  - Memory management with 3-tier hierarchy
  - Context optimization at 200k tokens
  - Workflow automation for common tasks
  - Self-deployment based on project detection

## Subagent Usage

Subagents are available via `/agents` command. To use:
- Automatic: Describe task naturally, appropriate agent activates
- Explicit: "Use the code-reviewer subagent to check my changes"

## Hook Integration

Hooks provide deterministic automation:
- Auto-formatting on file save (JS/TS/Python/Go)
- Security scanning prevents hardcoded secrets
- Protected files: `.env`, `.git/`, `node_modules/`
- Command logging for audit trail

## Key Workflows

### Code Changes
1. Edit triggers validation hook
2. Auto-format applies
3. code-reviewer subagent activates if needed
4. test-writer creates tests if missing

### Error Handling
1. Error detected
2. bug-finder subagent triggered
3. Fix implemented
4. test-writer adds regression test

## Tool Usage Patterns

### File Search
- Use `Glob` for file patterns
- Use `Grep` for content search
- Never use bash grep/find commands

### File Editing
- Always `Read` before `Edit`
- Use `MultiEdit` for multiple changes
- Preserve exact indentation

### Command Execution
- Quote paths with spaces
- Use absolute paths
- Avoid `cd` unless requested

## Context Management
- `/clear` - Start fresh for new tasks
- `/compact` - Reduce context at milestones
- `/agents` - View available subagents
- `/hooks` - Configure automation

## Security Constraints
- No hardcoded secrets in code
- No modification of protected files
- All commands logged for audit
- Security scanner runs before deployments

## GitHub Actions Integration

### Available Workflows
- **@claude mentions**: Respond to mentions in issues and PRs
- **Automated PR reviews**: Review all pull requests automatically
- **Issue to PR**: Convert issues labeled 'claude-implement' to PRs
- **Test fixing**: Automatically fix failing tests

### PR Guidelines
When creating PRs via GitHub Actions:
1. Create descriptive branch names: `feature/issue-{number}` or `fix/{description}`
2. Link PRs to related issues using "Fixes #123" in PR body
3. Include test coverage for all new features
4. Update documentation when adding/changing functionality
5. Follow conventional commit format for commit messages

### Code Review Standards
When reviewing PRs:
1. Check for security vulnerabilities (no hardcoded secrets, SQL injection, XSS)
2. Verify test coverage (aim for 80%+ coverage)
3. Ensure code follows existing patterns and style
4. Check for performance implications
5. Verify documentation is updated

### GitHub Actions Secrets Required
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- GitHub App installation: https://github.com/apps/claude

## Project-Specific Notes
- **Working Directory**: C:\projects\test
- **Platform**: Windows (win32)
- **Project Status**: New/Empty project with Claude Code infrastructure ready
- **Configuration**: Full Claude Code setup with subagents, hooks, orchestration, and GitHub Actions

### Next Steps for New Projects
When initializing a new project in this directory:
1. Choose your framework/language and initialize it
2. Update the "Development Commands" section above with build/test/lint commands
3. The Claude Code infrastructure will automatically adapt to your project type