---
name: commit
description: Stage git changes and create a well-structured semantic commit. Use this skill whenever the user asks to commit, save changes, create a commit, or uses /commit. Also trigger when the user says things like "commit this", "save my work", "stage and commit", or asks you to write a commit message.
---

# Commit

Create clean, informative git commits using conventional semantic commit format, with a body that captures context from the current conversation.

## Workflow

### 1. Gather context

Run these in parallel:

- `git status` — see what's changed (never use `-uall`, it can be slow on large repos)
- `git diff` and `git diff --staged` — understand the actual changes
- `git log --oneline -10` — match the repo's existing commit style

### 2. Analyze and draft the commit message

Read through the diff carefully. Then look back at your earlier responses in this conversation — the work you did, the decisions you made, the problems you solved. The commit message should connect the code changes to that context.

**Subject line format:** `<type>(<optional scope>): <short description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `ci`, `build`

The subject line should be:

- Lowercase after the colon
- Under 72 characters
- A concise 1-2 sentence description of _what_ changed and _why_
- Written in imperative mood ("add feature" not "added feature")

**Body:** Summarize the meaningful changes with context from the conversation. This is where you explain the "story" — what you did and why, drawn from your earlier responses. Use bullet points for multiple changes. Wrap lines at 72 characters.

The body should help a future developer (or the user themselves in 6 months) understand not just what changed, but the reasoning and decisions behind it. Skip trivial details — focus on things that would be non-obvious from reading the diff alone.

### 3. Stage files

Stage specific files by name. Avoid `git add -A` or `git add .` — these can accidentally include secrets (`.env`, credentials) or large binaries. If you spot files that look sensitive, warn the user instead of staging them.

### 4. Create the commit

Use a HEREDOC for the commit message to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

EOF
)"
```

### 5. Verify

Run `git status` after committing to confirm it succeeded. If a pre-commit hook fails, fix the issue and create a new commit (don't amend — the failed commit never happened, so amending would modify the wrong commit).

## Example

For a conversation where agent helped add WebRTC signaling:

```
feat(webrtc): add SDP offer/answer signaling via WebSocket

Implement the signaling server that brokers WebRTC connections between
browser clients and the media worker. The handler upgrades HTTP to
WebSocket, authenticates via session token, then relays SDP offers and
ICE candidates between peers.

- Add WebSocket upgrade handler with session token auth
- Implement SDP offer/answer exchange with JSON message framing
- Add ICE candidate trickle relay with per-session routing
- Include connection timeout and cleanup on peer disconnect
```

## What NOT to do

- Don't push to remote unless the user explicitly asks
- Don't amend existing commits unless asked — always create new ones
- Don't commit if there are no changes (no empty commits)
- Don't skip hooks (`--no-verify`) unless the user asks
- Don't include files that look like secrets or credentials
