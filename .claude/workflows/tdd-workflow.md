# Test-Driven Development (TDD) Workflow

## Steps
1. **Understand Requirements**
   - Clarify the feature or bug to be addressed
   - Identify edge cases and constraints
   - Define success criteria

2. **Write Failing Tests**
   - Create test file if it doesn't exist
   - Write comprehensive test cases
   - Include edge cases and error scenarios
   - Run tests to ensure they fail

3. **Implement Minimal Code**
   - Write just enough code to make tests pass
   - Focus on functionality, not optimization
   - Avoid over-engineering

4. **Refactor**
   - Improve code quality
   - Remove duplication
   - Enhance readability
   - Ensure tests still pass

5. **Add Integration Tests**
   - Test component interactions
   - Verify system behavior
   - Check performance requirements

## Example Commands
```bash
# JavaScript/TypeScript
npm test -- --watch
npm run test:coverage

# Python
pytest -xvs
pytest --cov=src

# Go
go test -v ./...
go test -cover

# Rust
cargo test
cargo test -- --nocapture
```

## Benefits
- Catch bugs early
- Better code design
- Living documentation
- Confidence in refactoring
- Faster debugging