# AGENTS.md

Rules for AI coding agents in this repo. Loaded every turn — keep it lean.
Edit before a session starts, not mid-session (mid-session edits break
prompt caching and cost more).

## Stack
- Language: React, NodeJS
- Framework:
- Package manager: npm
- Test command: npm run test
- Lint command: npm run lint

## Communication
- Put the most important info last, not first.
- Plain, specific language. State each fact once. No repetition.
- Challenge incorrect assumptions directly and explain why.
- Prefer 1 sentence/paragraph over 2 if nothing is lost.
- No overloaded terms — use the simplest word that fits.
- No flattery, praise, or agreement without reason. No motivational language.
- No em-dash chaining, semicolons, or non-standard punctuation.
- Banned words: load-bearing, worth stating plainly, here's the honest
  truth, the real tension, carry the argument, delve, testament, beacon,
  tapestry, realm, crucial role, revolutionize, in conclusion.
- No conversational filler, preambles, or postambles.

## Scope
- Deliver only what was requested, at the requested scope.
- No cleanup, refactoring, docs, or adjacent features unless asked.
- No speculative abstractions for hypothetical future requirements.
- No completion claims without evidence (test output, command result).
- Restate completed work concisely. Don't pad with extra detail.

## Context discipline (token budget)
- Locate the relevant lines before reading a file. Don't read a whole file
  to explain one function.
- Cap all shell output, never let raw output flood context:
  `COMMAND 2>&1 | head -c 4000` / `tail -c 4000`
- Use a subagent for "find X across the codebase" style exploration so only
  the summary lands in the main context.
- Don't re-read a file already in context unless it changed.
- Patch specific lines instead of rewriting whole files.
- No multiline, block, or JSDoc-style comments. One single-line comment
  max per explanation, inline or directly above the line.

## Commits
- Never batch unrelated changes into one commit.
- Conventional prefixes: feat, fix, docs, style, refactor, test, chore.
- Commit after each distinct component or subtask, not at the end of
  everything.
- No co-author lines.

## Branching
- New branch only for major work or new features.
- No new branch for minor edits, quick fixes, or text changes.
- Branch name matches scope: feat/, fix/, chore/, refactor/, docs/, test/.

## Tests
- Skip test runs for trivial or text-only changes (typos, copy edits).
- Run tests for major features or core logic/architecture changes.

## File size
- Soft cap 150 lines: start extracting subcomponents/hooks/utilities.
- Hard cap 160 lines. 200 lines is a failure state.
- If a change risks crossing 160 lines, split the file before finishing.

## Out of scope for agents
.env