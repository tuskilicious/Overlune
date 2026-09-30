---
description: Do the next task from docs/TASKS.md (plan, build, test, commit, then stop)
argument-hint: "[optional task id, e.g. T0.8]"
---

Work on exactly ONE task from `docs/TASKS.md`, following every rule in `CLAUDE.md`.

## 1. Pick the task
- If a task id was given, use it: $ARGUMENTS
- Otherwise use the first unticked `- [ ]` task, top to bottom.
- If the task (or part of it) is marked *Owner does this*, or needs something only I can provide (a secret, an account setting, a decision), tell me exactly what to do and stop. Never ask me to paste secrets into the chat. They go in `.env.local`.

## 2. Check the ground
- Run `git status`. If there are uncommitted changes, stop and ask me what to do with them.
- Re-read the parts of `docs/PRD.md`, `docs/STACK.md` and `docs/DESIGN.md` that this task touches.

## 3. Plan, then wait
- Present a short plan: the files you'll change, how you'll test it, and anything that conflicts with CLAUDE.md or the "Out of scope" list.
- **Do not edit any files until I approve the plan.**

## 4. Build and verify
- Implement only this task. Don't add dependencies that aren't in `docs/STACK.md` without asking.
- Run every script that exists: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix any failures.
- If the task touches an overlay: give me the exact `docs/OBS-TESTING.md` steps with the link and size to paste into OBS, then **wait for my result** before continuing.
- If the task needs a manual check (for example Sentry receiving an event), walk me through it and wait for my confirmation.

## 5. Finish
- Tick the task in `docs/TASKS.md` (add a short note if something was left for later).
- Commit with a clear message (one logical change per commit). Don't push unless I say so.
- Report: what changed, test results, anything I should know, and the next task's name.
- Then stop. If this finished a phase, remind me to run `/clear`.
