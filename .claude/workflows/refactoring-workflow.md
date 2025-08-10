# Refactoring Workflow

## Pre-Refactoring Checklist
- [ ] All tests passing
- [ ] Code committed/backed up
- [ ] Performance baseline established
- [ ] Refactoring goals defined

## Step 1: Analysis
1. **Identify Code Smells**
   - Long methods/functions
   - Duplicate code
   - Large classes
   - Long parameter lists
   - Feature envy
   - Data clumps
   - Primitive obsession

2. **Measure Current State**
   - Code coverage
   - Cyclomatic complexity
   - Performance metrics
   - Bundle size

## Step 2: Planning
1. **Prioritize Changes**
   - High impact, low risk first
   - Focus on hot paths
   - Consider dependencies

2. **Choose Refactoring Patterns**
   - Extract Method/Function
   - Extract Variable
   - Inline Method/Variable
   - Move Method/Field
   - Extract Class/Interface
   - Replace Conditional with Polymorphism

## Step 3: Implementation

### Safe Refactoring Steps
1. **Run Tests** - Ensure green baseline
2. **Make Change** - One refactoring at a time
3. **Run Tests** - Verify still green
4. **Commit** - Save working state
5. **Repeat** - Continue with next change

### Common Refactorings

#### Extract Method
```javascript
// Before
function processOrder(order) {
  // validation logic
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customer) {
    throw new Error('Order must have customer');
  }
  // processing logic
  // ...
}

// After
function processOrder(order) {
  validateOrder(order);
  // processing logic
  // ...
}

function validateOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customer) {
    throw new Error('Order must have customer');
  }
}
```

#### Replace Magic Numbers
```javascript
// Before
if (user.age >= 18) {
  // ...
}

// After
const MINIMUM_AGE = 18;
if (user.age >= MINIMUM_AGE) {
  // ...
}
```

#### Extract Variable
```javascript
// Before
if (user.role === 'admin' || user.role === 'moderator') {
  // ...
}

// After
const hasElevatedPrivileges = user.role === 'admin' || user.role === 'moderator';
if (hasElevatedPrivileges) {
  // ...
}
```

## Step 4: Validation
1. **Run Full Test Suite**
   ```bash
   npm test
   npm run test:e2e
   ```

2. **Check Performance**
   - Compare with baseline
   - Profile critical paths
   - Check memory usage

3. **Code Review**
   - Self-review changes
   - Check for regressions
   - Verify improvements

## Step 5: Documentation
1. **Update Comments**
   - Remove outdated comments
   - Add clarifying comments
   - Update JSDoc/docstrings

2. **Update Documentation**
   - API documentation
   - Architecture diagrams
   - README updates

## Refactoring Principles
1. **Don't Mix Refactoring with Features**
   - Separate commits
   - Separate PRs if possible

2. **Maintain Behavior**
   - No functional changes
   - Same inputs → same outputs

3. **Small Steps**
   - Incremental changes
   - Frequent commits
   - Easy to revert

4. **Test Coverage**
   - Never refactor without tests
   - Add tests if missing
   - Keep tests green

## Tools

### Static Analysis
```bash
# JavaScript/TypeScript
npx eslint . --fix
npx prettier --write .

# Python
black .
isort .
pylint src/

# Go
go fmt ./...
golint ./...
```

### Complexity Analysis
```bash
# JavaScript
npx complexity-report src/

# Python
radon cc src/ -s

# General
scc . # Source code counter
```

## When NOT to Refactor
- Close to deadline
- Code rarely changes
- Working on prototype
- No test coverage
- Team disagreement

## Benefits of Refactoring
- Improved readability
- Easier maintenance
- Better performance
- Reduced bugs
- Faster development
- Better testability