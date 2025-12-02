# Claude Code Hooks

## Active Hooks

### git-pre-commit.js
**Purpose**: Design system validation + quality checks before commits
**Impact**: ~2-5 seconds per commit
**Checks**: Gradients, strong blues, linting, TypeScript

### pre-implementation.js
**Purpose**: Pre-implementation validation
**Impact**: ~5-10 seconds
**Checks**: Tests, linting, TypeScript, design violations

### post-implementation.js
**Purpose**: Post-implementation validation
**Impact**: ~10-30 seconds (includes build)
**Checks**: Tests, linting, TypeScript, build, design system, security

## Performance Impact

**Total overhead per commit**: ~17-45 seconds
**Recommended for**: Production code, design-critical projects
**Consider disabling for**: Rapid prototyping, personal experiments

## Disabling Hooks

To temporarily disable hooks:
```bash
# Move hooks directory
mv ~/.claude/hooks ~/.claude/hooks-disabled
```

To re-enable:
```bash
mv ~/.claude/hooks-disabled ~/.claude/hooks
```

## Project-Specific Hooks

For project-specific hooks, create `.claude/hooks/` in project root.
Project hooks override global hooks.
