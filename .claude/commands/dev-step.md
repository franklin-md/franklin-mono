---
description: Execute the next step of the development plan using TDD
allowed-tools: all
---

# Dev Step: Execute with TDD

Execute the next step in the current plan. The plan lives in the conversation—just pick up where we left off.

## Workflow

### 1. Understand the Step

- Review what needs to be implemented from the current conversation/plan
- Identify affected files and components
- Briefly state what you're about to do

### 2. Prepare the Ground (Refactor First)

- Read the code you're about to change
- Clean up before adding new code:
  - Extract unclear logic into well-named functions
  - Remove dead code
  - Fix obvious issues (naming, structure)
- **Keep tests green throughout**—refactoring only, no behavior changes
- Commit cleanup separately if substantial

### 3. Determine Test Strategy

**You must figure out what testing approach fits this project.** Look for existing patterns:

- `package.json` scripts, `vitest.config.*` → Vitest (this project uses Vitest)
- Existing test files in `__tests__/*.test.ts` → follow their patterns

**Choose test granularity based on the change:**

| Change Scope            | Test Approach                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Small/isolated change   | Unit test(s) covering the specific behavior                                                            |
| Bug fix                 | Test that reproduces the bug first                                                                     |
| New utility/function    | Unit tests with edge cases                                                                             |
| New API endpoint        | Integration test hitting the endpoint                                                                  |
| Component in a workflow | **Check existing integration tests**—add coverage for new properties/behaviors rather than duplicating |
| Cross-component change  | Extend existing integration tests where possible                                                       |

**Key insight:** For components that participate in larger workflows, don't just write isolated unit tests—find the existing integration tests and see if there's a new property or behavior that should be verified there.

### 4. RED: Write Failing Tests

- Write tests describing expected behavior
- One behavior per test, clear names
- Use real code over mocks when possible
- **Run the tests and verify they fail correctly:**
  - ✓ Fails because feature is missing
  - ✗ Fails due to typo/syntax error → fix and re-run
  - ✗ Passes immediately → test is wrong, rewrite it

```bash
# Run a single test file
npx vitest run packages/<pkg>/src/__tests__/<file>.test.ts

# Run tests for a specific workspace
npm run test -w @franklin/<pkg>
```

**Identifying impacted tests:**

- Tests in the same module/directory as changed code
- Tests that import the changed files
- Integration tests for features using the changed component
- Do NOT run the full suite—it's expensive and slow

### 5. GREEN: Implement Minimal Code

- Write the simplest code that makes tests pass
- No extra features, no "while I'm here" improvements
- **Run tests and verify they pass**
- **Run impacted tests only**—identify tests that touch changed code/modules, don't run the full suite

### 6. REFACTOR (if needed)

- Only refactor when tests are green
- Keep tests passing throughout
- Don't add new behavior during refactor

### 7. User Checkpoints

**Stop and wait for user input before:**

- Breaking API changes
- Deleting files or significant code removal
- Schema changes that affect other packages
- Any irreversible or high-impact operations

Do not proceed with these automatically—ask first.

### 8. Verify & Format

- Run impacted tests (files/modules touched by your changes)
- Run project checks:
  ```bash
  npm run build       # tsc -b (TypeScript project references)
  npm run lint        # eslint, zero warnings allowed
  npm run format      # prettier
  ```
- Fix all issues before proceeding

### 9. Present Changes

- Show `git diff` summary
- Explain key decisions and trade-offs
- **Get explicit user approval before commit**

### 10. Commit

- Descriptive message with issue reference if applicable
- Only after user approval and all checks pass

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

If you write implementation code before the test, delete it and start over.

## When Stuck

| Problem                      | Solution                                                            |
| ---------------------------- | ------------------------------------------------------------------- |
| Can't figure out how to test | Describe the desired API first, write the assertion, work backwards |
| Test too complicated         | The design is too complicated—simplify the interface                |
| Need to mock everything      | Code is too coupled—consider dependency injection                   |
| Existing code has no tests   | Add tests for the existing behavior before changing it              |
