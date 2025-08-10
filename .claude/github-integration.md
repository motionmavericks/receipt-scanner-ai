# GitHub Integration Setup Guide

## Installation
To enable GitHub integration with Claude Code, run:
```bash
claude /install-github-app
```

This will:
1. Install the Claude Code GitHub App
2. Configure automatic PR reviews
3. Enable GitHub-specific commands

## Configuration

### GitHub Actions Workflow
Create `.github/workflows/claude-code.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]

jobs:
  claude-review:
    if: github.event_name == 'pull_request' || contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: Setup Claude Code
      run: |
        npm install -g @anthropic-ai/claude-code
        claude --version
    
    - name: Run Claude Review
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        claude review \
          --pr ${{ github.event.pull_request.number }} \
          --repo ${{ github.repository }} \
          --format markdown > review.md
    
    - name: Post Review Comment
      if: success()
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const review = fs.readFileSync('review.md', 'utf8');
          
          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body: review
          });
```

### GitHub CLI Commands
Common GitHub operations using the `gh` CLI through Claude:

```bash
# View PR details
gh pr view <pr-number>

# Create a new PR
gh pr create --title "Title" --body "Description"

# List open PRs
gh pr list --state open

# Check PR status
gh pr status

# View PR comments
gh api repos/{owner}/{repo}/pulls/{pr}/comments

# Create issue
gh issue create --title "Title" --body "Body"

# List issues
gh issue list
```

## PR Review Automation

### Automatic Review Triggers
Configure automatic reviews on:
- PR creation
- PR updates
- Specific labels (e.g., "needs-review")
- Manual trigger via comment "@claude review"

### Review Configuration
Create `.claude/pr-review-config.json`:

```json
{
  "review": {
    "enabled": true,
    "autoTrigger": true,
    "checkList": [
      "Code quality and best practices",
      "Security vulnerabilities",
      "Performance implications",
      "Test coverage",
      "Documentation updates"
    ],
    "severity": {
      "security": "blocker",
      "bugs": "critical",
      "performance": "major",
      "style": "minor"
    },
    "ignore": [
      "*.md",
      "package-lock.json",
      ".gitignore"
    ]
  }
}
```

## Branch Protection Rules

### Recommended Settings
1. **Require PR reviews** before merging
2. **Require status checks** to pass
3. **Require branches to be up to date**
4. **Include administrators** in restrictions
5. **Require conversation resolution**

### Claude Code Status Checks
Add these status checks:
- `claude-code/lint`
- `claude-code/test`
- `claude-code/security`
- `claude-code/review`

## Security Best Practices

### Secrets Management
Store these secrets in GitHub:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `CLAUDE_CODE_TOKEN` - Optional custom token
- Never commit secrets to the repository

### Permissions
Grant minimal necessary permissions:
- **Read**: Code, metadata, pull requests
- **Write**: Issues, pull requests (comments only)
- **Admin**: Not required

## Useful GitHub Commands in Claude

### PR Management
```bash
# Create PR from current branch
gh pr create --fill

# Review PR changes
gh pr diff <pr-number>

# Approve PR
gh pr review <pr-number> --approve

# Request changes
gh pr review <pr-number> --request-changes

# Merge PR
gh pr merge <pr-number> --squash
```

### Issue Management
```bash
# Create issue from template
gh issue create --template bug_report.md

# Assign issue
gh issue edit <issue-number> --add-assignee @username

# Add labels
gh issue edit <issue-number> --add-label "bug,priority"

# Close issue
gh issue close <issue-number>
```

### Repository Management
```bash
# Clone repository
gh repo clone owner/repo

# Fork repository
gh repo fork owner/repo

# View repository info
gh repo view owner/repo

# Create repository
gh repo create name --public
```

## Troubleshooting

### Common Issues
1. **Authentication Failed**: Re-run `claude /install-github-app`
2. **Permissions Denied**: Check GitHub App permissions
3. **API Rate Limit**: Use authentication token
4. **PR Review Not Triggering**: Check workflow configuration

### Debug Commands
```bash
# Check GitHub CLI status
gh auth status

# Test API access
gh api user

# Verify webhook delivery
gh api repos/{owner}/{repo}/hooks

# Check workflow runs
gh run list
```

## Advanced Features

### Custom Review Rules
Add project-specific review rules in CLAUDE.md:
```markdown
## GitHub PR Review Rules
- All database migrations must be reversible
- API changes require documentation updates
- Frontend changes need screenshot/video
- Performance-critical code needs benchmarks
```

### Integration with Other Tools
- **Jira**: Link issues in PR descriptions
- **Slack**: Send notifications on review completion
- **CircleCI/Jenkins**: Trigger builds on approval
- **SonarQube**: Include code quality metrics

## Best Practices
1. Review PRs incrementally as they grow
2. Use draft PRs for work in progress
3. Keep PRs focused and small
4. Write descriptive PR titles and descriptions
5. Always include test plans in PR descriptions
6. Use conventional commit messages
7. Squash commits when merging
8. Delete branches after merging