# Claude Code Skills Library

Comprehensive catalog of 22 specialized skills for enhanced Claude Code capabilities across design, development, testing, and MyDetailArea dealership management.

## 📚 Quick Navigation

- [Design & Visualization Skills](#design--visualization-skills) (5 skills)
- [Development & Architecture Skills](#development--architecture-skills) (3 skills)
- [Testing & QA Skills](#testing--qa-skills) (1 skill)
- [Communication Skills](#communication-skills) (1 skill)
- [MyDetailArea Domain Skills](#mydetailarea-domain-skills) (9 skills)
- [Template & Utilities](#template--utilities) (3 skills)

---

## 🎨 Design & Visualization Skills

### algorithmic-art
**Purpose**: Create generative art using p5.js with seeded randomness and interactive parameters.

**Use When**:
- Creating algorithmic/generative art
- Building flow fields or particle systems
- Developing code-based artwork

**Key Features**: p5.js integration, seeded randomness, parameter exploration

**Location**: `.claude/skills/algorithmic-art/`

---

### artifacts-builder
**Purpose**: Build elaborate, multi-component claude.ai HTML artifacts using modern frontend technologies.

**Use When**:
- Creating complex React artifacts
- Building state-managed applications
- Implementing routing and shadcn/ui components

**Key Features**: React, Tailwind CSS, shadcn/ui, state management, routing

**Location**: `.claude/skills/artifacts-builder/`

---

### brand-guidelines
**Purpose**: Apply Anthropic's official brand colors and typography to artifacts.

**Use When**:
- Creating branded content
- Applying company design standards
- Enforcing visual consistency

**Key Features**: Official brand colors, typography system, style guidelines

**Location**: `.claude/skills/brand-guidelines/`

---

### canvas-design
**Purpose**: Create beautiful visual art in PNG/PDF formats using design principles.

**Use When**:
- Designing posters or marketing materials
- Creating static visual artwork
- Generating print-ready designs

**Key Features**: PNG/PDF output, design philosophy, visual composition

**Location**: `.claude/skills/canvas-design/`

---

### theme-factory
**Purpose**: Style artifacts with themes (10 pre-set themes + custom generation).

**Use When**:
- Theming slides, docs, or HTML pages
- Applying color schemes to artifacts
- Creating consistent visual styles

**Key Features**: 10 pre-set themes, on-the-fly theme generation, multi-format support

**Location**: `.claude/skills/theme-factory/`

---

## 🔧 Development & Architecture Skills

### mcp-builder
**Purpose**: Create high-quality MCP servers for LLM external service integration.

**Use When**:
- Building MCP servers (Python FastMCP or Node/TypeScript)
- Integrating external APIs with Claude
- Creating well-designed MCP tools

**Key Features**: FastMCP (Python), MCP SDK (Node/TypeScript), tool design patterns

**Location**: `.claude/skills/mcp-builder/`

---

### skill-creator
**Purpose**: Guide for creating effective skills that extend Claude's capabilities.

**Use When**:
- Creating new custom skills
- Updating existing skills
- Extending Claude with specialized knowledge

**Key Features**: Skill design patterns, workflow guidance, integration tools

**Location**: `.claude/skills/skill-creator/`

---

### template-skill
**Purpose**: Base template for creating new skills.

**Use When**:
- Starting a new skill from scratch
- Following skill structure standards
- Ensuring consistent skill format

**Key Features**: Standard structure, boilerplate content, best practices

**Location**: `.claude/skills/template-skill/`

---

## ✅ Testing & QA Skills

### webapp-testing
**Purpose**: Test local web applications using Playwright for UI verification and debugging.

**Use When**:
- Testing frontend functionality
- Debugging UI behavior
- Capturing browser screenshots
- Viewing browser logs

**Key Features**: Playwright integration, screenshot capture, console log access, debugging

**Location**: `.claude/skills/webapp-testing/`

---

## 📝 Communication Skills

### internal-comms
**Purpose**: Write internal communications using company-preferred formats.

**Use When**:
- Writing status reports
- Creating company newsletters
- Drafting FAQs or incident reports
- Preparing project updates

**Key Features**: Multiple communication formats, company templates, best practices

**Location**: `.claude/skills/internal-comms/`

---

### slack-gif-creator
**Purpose**: Create animated GIFs optimized for Slack with size validation.

**Use When**:
- Creating Slack-compatible GIFs
- Building emoji animations
- Generating custom Slack reactions

**Key Features**: Size constraint validation, composable animations, Slack optimization

**Location**: `.claude/skills/slack-gif-creator/`

---

## 🚗 MyDetailArea Domain Skills

Enterprise dealership management system skills for the MyDetailArea platform.

### mydetailarea-components
**Purpose**: Professional React component library with shadcn/ui, Tailwind, and Notion design system.

**Use When**:
- Building new MyDetailArea features
- Creating reusable UI components
- Implementing Notion-style interfaces

**Key Features**: shadcn/ui primitives, Tailwind CSS, Notion design enforcement, TypeScript, accessibility

**Tech Stack**: React 18, TypeScript, Vite, shadcn/ui, Radix UI, Tailwind CSS

**Location**: `.claude/skills/mydetailarea-components/`

---

### mydetailarea-analytics
**Purpose**: Business intelligence and predictive analytics with KPI tracking and forecasting.

**Use When**:
- Building analytics dashboards
- Implementing KPI tracking
- Creating forecasting models
- Generating business insights

**Key Features**: Recharts integration, revenue forecasting, anomaly detection, trend analysis

**Tech Stack**: Recharts, TanStack Query, statistical models

**Location**: `.claude/skills/mydetailarea-analytics/`

---

### mydetailarea-data-pipeline
**Purpose**: Data import/export and validation pipeline for bulk operations.

**Use When**:
- Implementing bulk data operations
- Processing CSV/Excel files
- Migrating from legacy systems
- Creating scheduled exports

**Key Features**: CSV/Excel processing, validation rules, error handling, audit trails

**Tech Stack**: Supabase, TypeScript, data validation libraries

**Location**: `.claude/skills/mydetailarea-data-pipeline/`

---

### mydetailarea-database
**Purpose**: Database optimization, security audit, and performance analysis for Supabase/PostgreSQL.

**Use When**:
- Optimizing database performance
- Auditing security (RLS policies)
- Creating safe migrations
- Analyzing query performance

**Key Features**: Query optimization, RLS policy review, index recommendations, migration strategies

**⚠️ CRITICAL**: All recommendations require validation and testing before production. Use with extreme caution.

**Tech Stack**: Supabase, PostgreSQL, RLS policies

**Location**: `.claude/skills/mydetailarea-database/`

---

### mydetailarea-integrations
**Purpose**: Third-party integration connectors with OAuth flows and API authentication.

**Use When**:
- Connecting external systems (QuickBooks, Xero, CRM)
- Implementing OAuth flows
- Building webhooks
- Synchronizing data with external APIs

**Key Features**: OAuth 2.0, API authentication, rate limiting, error handling, data sync

**Tech Stack**: REST APIs, OAuth 2.0, webhooks, Supabase Edge Functions

**Location**: `.claude/skills/mydetailarea-integrations/`

---

### mydetailarea-invoices
**Purpose**: Professional invoice and payment system with multi-format output.

**Use When**:
- Creating invoices with itemization
- Tracking payments
- Generating financial documents
- Managing billing workflows

**Key Features**: Itemization, tax calculations, payment tracking, HTML/PDF/Excel export, email delivery

**Tech Stack**: React, jsPDF, ExcelJS, email services

**Location**: `.claude/skills/mydetailarea-invoices/`

---

### mydetailarea-notifications
**Purpose**: Internal team notification system for staff collaboration (NOT customer-facing).

**Use When**:
- Implementing activity feeds
- Creating follower notifications
- Building @mention functionality
- Managing task assignments alerts

**⚠️ NOTE**: Exclusively for **internal staff** notifications. Not for external customer communication.

**Key Features**: Real-time alerts, order updates, task assignments, @mentions, follower system

**Tech Stack**: Supabase Real-time, WebSockets

**Location**: `.claude/skills/mydetailarea-notifications/`

---

### mydetailarea-reports
**Purpose**: Professional report generation with data visualization and multi-format export.

**Use When**:
- Generating business reports
- Creating analytics dashboards
- Exporting data (HTML/PDF/Excel/CSV)
- Building financial analytics

**Key Features**: Data visualization, multi-format export, Notion-style design, business intelligence

**Tech Stack**: Recharts, jsPDF, ExcelJS, React

**Location**: `.claude/skills/mydetailarea-reports/`

---

### mydetailarea-testing
**Purpose**: Comprehensive E2E testing suite for dealership workflows using Playwright.

**Use When**:
- Testing critical user journeys
- Implementing role-based testing
- Running performance benchmarks
- Creating visual regression tests

**Key Features**: Playwright scenarios, order workflows, invoice generation, payment processing, VIN scanning

**Tech Stack**: Playwright, TypeScript, Testing Library

**Location**: `.claude/skills/mydetailarea-testing/`

---

### mydetailarea-workflows
**Purpose**: Workflow automation and orchestration with state machines.

**Use When**:
- Building automated workflows
- Implementing state machines
- Creating escalation rules
- Monitoring SLAs

**Key Features**: State machines, automated transitions, task assignments, escalation rules, event-driven automation

**Tech Stack**: XState, Supabase, TypeScript

**Location**: `.claude/skills/mydetailarea-workflows/`

---

## 📊 Skill Categories Summary

| Category | Count | Purpose |
|----------|-------|---------|
| **Design & Visualization** | 5 | Art, artifacts, branding, themes |
| **Development & Architecture** | 3 | MCP servers, skill creation, templates |
| **Testing & QA** | 1 | Web application testing |
| **Communication** | 2 | Internal comms, Slack GIFs |
| **MyDetailArea Domain** | 9 | Dealership management features |
| **Template & Utilities** | 3 | Skill creation, templates |
| **Total Skills** | 22 | Complete library |

---

## 🎯 Quick Skill Selection Guide

### I want to...

**...build UI components** → `mydetailarea-components`

**...implement analytics** → `mydetailarea-analytics`

**...create reports** → `mydetailarea-reports`

**...handle invoices** → `mydetailarea-invoices`

**...process bulk data** → `mydetailarea-data-pipeline`

**...integrate external APIs** → `mydetailarea-integrations`

**...optimize database** → `mydetailarea-database` ⚠️

**...automate workflows** → `mydetailarea-workflows`

**...test the application** → `mydetailarea-testing`

**...send team notifications** → `mydetailarea-notifications`

**...create visual art** → `algorithmic-art` or `canvas-design`

**...build React artifacts** → `artifacts-builder`

**...apply branding** → `brand-guidelines`

**...theme content** → `theme-factory`

**...create MCP server** → `mcp-builder`

**...write internal docs** → `internal-comms`

**...test web apps** → `webapp-testing`

**...make Slack GIFs** → `slack-gif-creator`

**...create a new skill** → `skill-creator` + `template-skill`

---

## 📁 File Structure

Each skill follows this standard structure:

```
skill-name/
├── SKILL.md              # Main documentation
├── LICENSE.txt           # MIT License
├── assets/               # Images, resources (optional)
├── examples/             # Code examples (optional)
├── references/           # Reference docs (optional)
├── scripts/              # Helper scripts (optional)
└── templates/            # Templates (optional)
```

---

## 🔗 Integration with Agents

Skills work seamlessly with the 16 specialized agents:

- **Frontend Agents** → Use `mydetailarea-components`, `artifacts-builder`
- **Backend Agents** → Use `mydetailarea-database`, `mydetailarea-integrations`
- **Quality Agents** → Use `mydetailarea-testing`, `webapp-testing`
- **Domain Agents** → Use all 9 MyDetailArea skills
- **Analytics Agents** → Use `mydetailarea-analytics`, `mydetailarea-reports`

---

## 📝 Creating New Skills

To create a new skill:

1. Use the `skill-creator` skill for guidance
2. Copy `template-skill` as a starting point
3. Follow the standard structure
4. Document thoroughly in SKILL.md
5. Add examples and references
6. Test integration with agents

---

## 🆘 Support & Documentation

- **Skill Documentation**: Each skill's `SKILL.md` file
- **Agent Documentation**: `.claude/README-AGENTS.md`
- **Workflow Documentation**: `.claude/workflows/`
- **Memory Context**: `.claude/memory/mydetailarea-context.md`

---

## 📊 Skill Maintenance

**Last Updated**: 2025-10-27

**Total Skills**: 22

**Active Projects**: MyDetailArea (9 domain skills)

**License**: MIT (all skills)

---

**Note**: For detailed documentation on any skill, refer to its `SKILL.md` file in the respective directory.
