# Debugging Workflow

## Step 1: Reproduce the Issue
1. **Gather Information**
   - Error messages and stack traces
   - Steps to reproduce
   - Environment details
   - Recent changes

2. **Confirm Bug**
   - Reproduce locally
   - Document exact steps
   - Note intermittent vs consistent
   - Check different environments

## Step 2: Isolate the Problem
1. **Narrow Down Scope**
   - Use binary search in code
   - Comment out sections
   - Check recent commits
   - Review dependencies

2. **Add Logging**
   ```javascript
   console.log('Debug:', variable);
   console.trace('Stack trace');
   console.time('Performance');
   ```

3. **Use Debugger**
   ```javascript
   debugger; // Browser/Node
   ```
   ```python
   import pdb; pdb.set_trace()
   ```

## Step 3: Root Cause Analysis
1. **Common Issues to Check**
   - Off-by-one errors
   - Null/undefined references
   - Race conditions
   - Memory leaks
   - Type mismatches
   - Scope issues

2. **Tools**
   - Browser DevTools
   - IDE debuggers
   - Profilers
   - Network inspectors
   - Log analyzers

## Step 4: Fix Implementation
1. **Write Failing Test**
   - Reproduce bug in test
   - Cover edge cases
   - Verify test fails

2. **Implement Fix**
   - Minimal change required
   - Preserve existing behavior
   - Handle edge cases

3. **Verify Fix**
   - Run original test
   - Run full test suite
   - Manual testing
   - Check for regressions

## Step 5: Prevention
1. **Add Guards**
   ```javascript
   if (!data) {
     throw new Error('Data is required');
   }
   ```

2. **Improve Tests**
   - Add test for this scenario
   - Increase coverage
   - Add integration tests

3. **Documentation**
   - Document the issue
   - Update troubleshooting guide
   - Add to known issues

## Debugging Commands

### JavaScript/Node
```bash
node --inspect app.js
node --inspect-brk app.js
npm run debug
```

### Python
```bash
python -m pdb script.py
pytest --pdb
python -m trace --trace script.py
```

### System Tools
```bash
# Memory issues
top
htop
ps aux | grep process

# Network issues
netstat -an
tcpdump
curl -v

# File issues
lsof
strace
```

## Performance Debugging
1. **Profiling**
   ```javascript
   console.time('operation');
   // code
   console.timeEnd('operation');
   ```

2. **Memory Profiling**
   - Chrome DevTools Memory Profiler
   - Node --inspect with heap snapshots

3. **Network Analysis**
   - Chrome Network tab
   - Postman/Insomnia
   - Wireshark

## Tips
- Start with the simplest explanation
- Change one thing at a time
- Keep a debugging log
- Use version control to track changes
- Don't assume - verify
- Take breaks when stuck
- Ask for help when needed