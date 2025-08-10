# GitHub Actions with Claude Code - Setup Guide

## ✅ Setup Complete

Your repository now has GitHub Actions configured to work with Claude Code! This integration enables AI-powered automation for your development workflow.

## 🚀 Quick Start

### 1. Install GitHub App
Visit https://github.com/apps/claude and install the app to your repository.

### 2. Add API Key
Add your Anthropic API key as a repository secret:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your API key from https://console.anthropic.com

### 3. Push to GitHub
```bash
git add .
git commit -m "feat: Add Claude Code GitHub Actions integration"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

## 📋 Available Workflows

### 1. **Claude Assistant** (`claude.yml`)
- **Trigger**: Mention `@claude` in any issue or PR comment
- **Actions**: Claude will respond and can create PRs, implement features, or fix bugs
- **Example**: `@claude implement user authentication with JWT`

### 2. **Automated PR Review**
- **Trigger**: Automatically on all pull requests
- **Actions**: Reviews code for quality, security, and best practices
- **Output**: Detailed review comments on the PR

### 3. **Issue to PR** (`claude-issue-to-pr.yml`)
- **Trigger**: Add label `claude-implement` to an issue
- **Actions**: Automatically implements the feature and creates a PR
- **Output**: New PR linked to the issue

### 4. **Fix Failing Tests** (`claude-fix-tests.yml`)
- **Trigger**: When CI tests fail on main/develop branches
- **Actions**: Analyzes failures and creates fixes
- **Output**: PR with test fixes

## 💡 Usage Examples

### Create a Feature from an Issue
1. Create an issue describing the feature
2. Add `@claude` in the issue body or comment
3. Claude will implement and create a PR

### Get Code Review
1. Create a pull request
2. Claude automatically reviews it
3. Or mention `@claude review this` for detailed feedback

### Fix a Bug
Comment on an issue:
```
@claude fix the TypeError in the user dashboard component
```

### Implement a Feature
Comment on an issue:
```
@claude implement the search functionality as described above
```

## 🔧 Customization

### Modify Workflows
Edit files in `.github/workflows/` to customize:
- Trigger conditions
- Model selection (claude-3-5-sonnet-latest, etc.)
- Max turns and timeout
- Custom prompts

### Add Project-Specific Rules
Update `CLAUDE.md` with your:
- Coding standards
- Architecture patterns
- Review criteria
- Testing requirements

## 🛡️ Security Best Practices

1. **Never commit API keys** - Always use GitHub Secrets
2. **Review Claude's PRs** before merging
3. **Limit permissions** to what's necessary
4. **Use branch protection** rules
5. **Enable required reviews** for production branches

## 📊 Cost Management

### API Costs
- Each Claude interaction uses API tokens
- Complex tasks use more tokens
- Monitor usage at https://console.anthropic.com

### GitHub Actions Minutes
- Workflows consume GitHub Actions minutes
- Free tier: 2,000 minutes/month
- See usage in Settings → Billing

### Optimization Tips
- Use specific prompts to reduce iterations
- Set appropriate `max_turns` limits
- Configure `timeout_minutes` to prevent runaway workflows

## 🔍 Troubleshooting

### Claude Not Responding
- ✓ Check GitHub App is installed
- ✓ Verify `ANTHROPIC_API_KEY` secret exists
- ✓ Ensure you're using `@claude` (not `/claude`)
- ✓ Check Actions tab for workflow runs

### Workflow Failures
- Check Actions tab for error logs
- Verify API key is valid
- Ensure repository permissions are correct
- Check if API rate limits are hit

### PR Creation Issues
- Ensure GitHub App has write permissions
- Check branch protection rules
- Verify Claude has necessary context in CLAUDE.md

## 📚 Advanced Features

### Custom GitHub App
For organizations needing custom branding:
1. Create your own GitHub App
2. Use `APP_ID` and `APP_PRIVATE_KEY` secrets
3. Update workflows to use custom app

### Cloud Provider Integration
Support for:
- **AWS Bedrock**: Use IAM roles
- **Google Vertex AI**: Use Workload Identity
- See workflow examples for configuration

## 🎯 Best Practices

1. **Use CLAUDE.md** to define project standards
2. **Be specific** in your prompts to Claude
3. **Review all PRs** before merging
4. **Test locally** when possible
5. **Monitor costs** regularly
6. **Use labels** to organize Claude's work
7. **Document decisions** in PR descriptions

## 📈 Benefits

- ✅ **Faster development** - Automate repetitive tasks
- ✅ **Consistent quality** - Automated reviews
- ✅ **Quick bug fixes** - Claude debugs issues
- ✅ **Better documentation** - Auto-generated docs
- ✅ **Learning tool** - See how Claude approaches problems

## 🔗 Resources

- [Claude Code Action Repository](https://github.com/anthropics/claude-code-action)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Anthropic Console](https://console.anthropic.com)
- [Claude API Documentation](https://docs.anthropic.com)

---

Your GitHub Actions integration is ready! Start by mentioning `@claude` in an issue or PR comment.