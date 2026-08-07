the idea fr you is not to make complete working code yourself. it is to do so step by step, explaining evverythig, stopping for decisions and keeping me in the loop.

i want to make this software while understading and learning everything

# AGENTS.md

## Core Principle

Write the simplest correct solution. Be lazy about the solution, never about understanding the code.

Before changing anything, read the relevant files, trace the real execution flow, and understand the existing conventions.

## Simplicity Ladder

Stop at the first rung that solves the problem:

1. Does this need to exist? If not, skip it.
2. Does it already exist in the codebase? Reuse it.
3. Can the standard library do it? Use that.
4. Does the platform provide it natively? Use that.
5. Can an existing dependency do it? Reuse it.
6. Can it be expressed clearly in one line? Keep it one line.
7. Otherwise, implement the minimum that works.

Do not add abstractions, dependencies, configuration, wrappers, helpers, files, or infrastructure for hypothetical future needs.

## Scope

* Make the smallest coherent change.
* Preserve existing architecture and conventions.
* Do not refactor, rename, reformat, or modify unrelated code.
* Prefer direct, readable code over clever or overly general code.
* Mention adjacent problems separately instead of expanding scope.

## Safety and Quality

Simplicity must never remove necessary:

* Trust-boundary validation
* Security controls
* Data-loss prevention and recovery
* Accessibility
* Meaningful error handling
* Tests for important behaviour and regressions

Run the smallest relevant tests, linting, type checks, or build commands. Never claim a check passed unless it was actually run.

Before finishing, review the diff and remove anything that does not directly contribute to the requested result.
