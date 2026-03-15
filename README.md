# Playwright + LangChain Agents

LLM-powered test automation agents that combine Playwright's browser control with LangChain's reasoning capabilities. Instead of replacing test scripts, these agents handle tasks that need interpretation — triaging failures, exploring pages, generating tests from plain English, and more.

## What's Inside

```
├── tests/                # Playwright test suites (smoke, intentional failures, generated)
├── agent/
│   └── src/
│       ├── tools/        # Playwright, CLI, and file-system tools wrapped for LangChain
│       ├── triage-agent.ts      # Pattern 1 – Classifies test failures by root cause
│       ├── explorer-agent.ts    # Pattern 2 – Autonomous exploratory testing
│       ├── testgen-agent.ts     # Pattern 3 – Generates Playwright tests from natural language
│       ├── drift-agent.ts       # Pattern 4 – Compares two environments for differences
│       ├── visual-agent.ts      # Pattern 5 – Screenshots + GPT vision for visual regression
│       └── a11y-agent.ts        # Pattern 6 – ARIA tree analysis for accessibility auditing
├── reports/              # Agent-generated reports and screenshots (git-ignored)
└── playwright.config.ts
```

## Prerequisites

- Node.js 22+
- An OpenAI API key

## Setup

```bash
# Install Playwright and root dependencies
npm install
npx playwright install

# Install agent dependencies
cd agent
npm install

# Add your API key
echo "OPENAI_API_KEY=sk-..." > .env
```

## Running Agents

All agent commands run from the `agent/` directory:

```bash
npm run agent:triage    # Analyze test failures and classify root causes
npm run agent:explore   # Autonomously explore a site and find bugs
npm run agent:testgen   # Generate Playwright tests from natural language
npm run agent:drift     # Compare two URLs for semantic differences
npm run agent:visual    # Screenshot-based visual regression with GPT vision
npm run agent:a11y      # Accessibility audit using ARIA tree analysis
```

## Running Tests

```bash
# From the project root
npx playwright test                    # Run all tests
npx playwright test tests/smoke.spec.ts  # Run smoke tests only
```

## Target Application

All agents and tests run against the [LambdaTest E-Commerce Playground](https://ecommerce-playground.lambdatest.io/).

## Tech Stack

- **Playwright 1.58** — Browser automation, test runner, tracing
- **LangChain.js 1.x** — Agent framework, tool abstractions, LangGraph
- **OpenAI GPT-4o-mini** — LLM for reasoning and vision
- **TypeScript + Node.js (ESM)** — All agent code
