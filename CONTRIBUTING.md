# Contributing to Open Agent Engine

Thank you for your interest in contributing to **Open Agent Engine**! We are building the open-source standard for AI coding agent orchestration, cross-platform adapters, and progressive disclosure skills.

---

## 1. Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with respect and professionalism.

---

## 2. Monorepo Architecture

Open Agent Engine is organized as a pnpm workspace monorepo:

```text
open-agent-engine/
├── packages/
│   ├── core/       # @agent-engine/core: Zod schemas, AST parser, validators, worktree engine
│   └── cli/        # @agent-engine/cli: CLI scaffolding wizard, skill package manager, adapters
├── .agents/        # Dogfooded canonical agent configuration
└── agent_docs/     # Architecture notes and sprint tracking
```

---

## 3. Development Setup

### Prerequisites
- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Git**: >= 2.30.0

### Getting Started
```bash
# 1. Fork and clone the repository
git clone https://github.com/jedmamosto/open-agent-engine.git
cd open-agent-engine

# 2. Install workspace dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run test suite across monorepo
pnpm test
```

---

## 4. Quality Invariants & Standards

Every contribution must pass our automated quality gates:

1. **Test-Driven Rigor**: All new features, bug fixes, and adapters must include comprehensive Vitest test coverage (`pnpm test`).
2. **Strict Typing**: No `any` type assertions or implicit any leaks. Run `pnpm typecheck` (`tsc -b`) to verify.
3. **Context Budget (<150 Lines)**: All generated root rule files (e.g. `000-base.md`) must strictly remain under **150 lines** to preserve LLM prompt cache efficiency.
4. **Vendor-Neutral Core**: Core schemas in `@agent-engine/core` must remain 100% agnostic of specific IDEs or LLM vendors.

---

## 5. Development Workflow & Pull Requests

1. **Branch Naming**:
   - `feat/<feature-name>` for new capabilities
   - `fix/<bug-name>` for bug fixes
   - `docs/<doc-name>` for documentation updates
2. **Commit Convention**:
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(cli): add interactive skill search`
   - `fix(core): resolve Windows index lock retry in worktree manager`
   - `test(adapters): add snapshot test for Roo Code mode parser`
3. **Submitting a Pull Request**:
   - Ensure `pnpm test` and `pnpm build` pass with exit code 0.
   - Describe the motivation, architectural trade-offs, and verification steps in the PR description.

---

## 6. License

By contributing to Open Agent Engine, you agree that your contributions will be licensed under the [MIT License](LICENSE).
