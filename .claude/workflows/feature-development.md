# Feature Development Workflow

## Phase 1: Research & Planning
1. **Analyze Requirements**
   - Review user stories/tickets
   - Identify acceptance criteria
   - Note dependencies and blockers

2. **Research Codebase**
   - Find similar implementations
   - Identify reusable components
   - Check coding standards
   - Review relevant documentation

3. **Design Solution**
   - Create high-level architecture
   - Define interfaces/contracts
   - Plan data flow
   - Consider error handling

## Phase 2: Implementation
1. **Setup Development Branch**
   ```bash
   git checkout -b feature/description
   ```

2. **Write Tests First (TDD)**
   - Unit tests for core logic
   - Integration tests for workflows
   - E2E tests for critical paths

3. **Implement Feature**
   - Follow existing patterns
   - Write clean, readable code
   - Add appropriate logging
   - Handle errors gracefully

4. **Documentation**
   - Update API documentation
   - Add inline comments where needed
   - Update README if required
   - Create usage examples

## Phase 3: Quality Assurance
1. **Run Quality Checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

2. **Code Review Prep**
   - Self-review changes
   - Ensure no debug code
   - Check for secrets/credentials
   - Verify test coverage

3. **Performance Testing**
   - Profile critical paths
   - Check memory usage
   - Verify response times
   - Test with realistic data

## Phase 4: Deployment
1. **Create Pull Request**
   ```bash
   gh pr create --fill
   ```

2. **Address Review Feedback**
   - Respond to comments
   - Make requested changes
   - Re-test after changes

3. **Merge & Deploy**
   - Squash commits if needed
   - Update ticket status
   - Monitor deployment
   - Verify in production

## Checklist
- [ ] Requirements understood
- [ ] Tests written and passing
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Security checked
- [ ] Performance validated
- [ ] PR approved
- [ ] Deployed successfully