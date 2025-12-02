# Full-Stack Implementation Workflow

This workflow coordinates all 16 specialized agents for comprehensive full-stack development.

## Workflow Phases

### Phase 1: Discovery & Planning
**Duration**: 15-30 minutes
**Agents**: Domain specialists

1. **Business Analysis** (`dealership-expert`)
   - Analyze business requirements
   - Define automotive-specific logic
   - Identify compliance requirements

2. **Internationalization Planning** (`i18n-specialist`)
   - Define language requirements (EN/ES/PT-BR)
   - Plan content structure
   - Set up translation workflows

3. **Analytics Strategy** (`analytics-implementer`)
   - Define tracking events
   - Plan KPI dashboards
   - Set up reporting structure

### Phase 2: Architecture & Design
**Duration**: 30-45 minutes
**Agents**: Technical architects

4. **Frontend Architecture** (`react-architect`)
   - Design component hierarchy
   - Define state management approach
   - Plan routing and navigation
   - **CRITICAL**: Enforce Notion design system

5. **Backend Architecture** (`api-architect`)
   - Design API endpoints
   - Define data flow patterns
   - Plan Supabase integration

6. **Database Design** (`database-expert`)
   - Design schema structure
   - Plan relationships and constraints
   - Define migration strategy

7. **Authentication Strategy** (`auth-security`)
   - Design auth flows
   - Plan security measures
   - Define user roles/permissions

### Phase 3: Implementation
**Duration**: 2-4 hours
**Agents**: Implementation specialists

8. **UI Implementation** (`ui-designer`)
   - Create components with Notion styling
   - Implement responsive layouts
   - **FORBIDDEN**: Gradients, strong blues
   - **REQUIRED**: Gray-based palette

9. **State Management** (`state-manager`)
   - Implement state stores
   - Set up data synchronization
   - Handle loading/error states

10. **API Development** (`edge-functions`)
    - Implement Supabase Edge Functions
    - Set up database operations
    - Handle business logic

### Phase 4: Quality Assurance
**Duration**: 1-2 hours
**Agents**: QA specialists

11. **Testing Implementation** (`test-engineer`)
    - Write unit tests (Jest/Vitest)
    - Create integration tests
    - Set up e2e tests (Playwright)

12. **Code Review** (`code-reviewer`)
    - Review code quality
    - Enforce design system rules
    - Check security practices

13. **Accessibility Audit** (`accessibility-auditor`)
    - Test WCAG compliance
    - Validate screen reader support
    - Check color contrast

14. **Performance Optimization** (`performance-optimizer`)
    - Analyze bundle size
    - Optimize Core Web Vitals
    - Implement caching strategies

### Phase 5: Deployment & Monitoring
**Duration**: 30-60 minutes
**Agents**: DevOps specialists

15. **Deployment Setup** (`deployment-engineer`)
    - Configure CI/CD pipelines
    - Set up Railway deployment
    - Configure environment variables

16. **Monitoring Implementation** (`monitoring-specialist`)
    - Set up error tracking
    - Configure performance monitoring
    - Create alerting rules

## Quality Gates

Each phase must pass these gates before proceeding:

### Phase 1 Gate: Requirements Clarity
- [ ] Business requirements documented
- [ ] Technical constraints identified
- [ ] Success metrics defined

### Phase 2 Gate: Architecture Approval
- [ ] System design reviewed
- [ ] Database schema validated
- [ ] API contracts defined
- [ ] Security model approved

### Phase 3 Gate: Implementation Complete
- [ ] All features implemented
- [ ] Design system compliance verified
- [ ] No TypeScript errors
- [ ] No ESLint violations

### Phase 4 Gate: Quality Assurance
- [ ] Test coverage > 80%
- [ ] All tests passing
- [ ] Accessibility score > 95%
- [ ] Performance score > 90%
- [ ] Security scan passed

### Phase 5 Gate: Production Ready
- [ ] Deployment successful
- [ ] Monitoring active
- [ ] Health checks passing
- [ ] Documentation complete

## Automated Hooks

### Pre-Implementation Hook
Runs before any code changes:
```bash
node C:\Users\rudyr\.claude\hooks\pre-implementation.js
```

**Checks**:
- Existing test suite status
- Linting configuration
- TypeScript setup
- Design system violations

### Post-Implementation Hook
Runs after code changes:
```bash
node C:\Users\rudyr\.claude\hooks\post-implementation.js
```

**Validations**:
- ✅ All tests pass
- ✅ Linting clean
- ✅ TypeScript compilation
- ✅ Build successful
- ✅ Design system compliance
- ✅ Security scan clean

## Agent Coordination Patterns

### Sequential Pattern
For dependent tasks:
```
dealership-expert → react-architect → ui-designer → test-engineer
```

### Parallel Pattern
For independent tasks:
```
api-architect + database-expert + auth-security (parallel)
↓
edge-functions (sequential)
```

### Review Pattern
For quality validation:
```
Implementation → code-reviewer + accessibility-auditor (parallel)
```

## Emergency Protocols

### Design System Violation
1. **Immediate**: Stop implementation
2. **Alert**: Notify `code-reviewer`
3. **Fix**: Use `ui-designer` to correct violations
4. **Validate**: Re-run design system checks

### Test Failures
1. **Analyze**: Use `test-engineer` to debug
2. **Fix**: Address root cause
3. **Verify**: Re-run full test suite
4. **Document**: Update test documentation

### Security Issues
1. **Isolate**: Stop deployment pipeline
2. **Assess**: Use `auth-security` for analysis
3. **Remediate**: Fix security vulnerabilities
4. **Validate**: Run security scan again

## Success Metrics

### Development Velocity
- Phase completion time
- Quality gate pass rate
- Rework percentage

### Code Quality
- Test coverage percentage
- Design system compliance
- Performance scores
- Accessibility scores

### Business Impact
- Feature adoption rate
- User satisfaction scores
- Performance improvements
- Error rate reduction