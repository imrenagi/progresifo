---
name: log-bug
description: >
  Record bugs found during a session that we don't want to fix immediately. Creates a
  markdown file in docs/improvements/ with context, reproduction steps, and impact. Use
  this skill when the user says "log this bug", "record this for later", "note this issue",
  "save this bug", or uses /log-bug. Also trigger when the user defers a fix with phrases
  like "let's fix this later" or "park this bug".
---

# Log Bug

Record bugs discovered during a session into `docs/improvements/` so they can be fixed later. Each bug gets its own numbered markdown file.

## Workflow

### 1. Gather bug context

Review the conversation to understand:
- What is the bug? What's the expected vs actual behavior?
- Where in the codebase does it live? (file paths, functions, line numbers)
- How was it discovered?
- What is the impact? (blocking, degraded experience, edge case)
- Is there a known fix or workaround?

### 2. Determine file numbering

Check existing files in `docs/improvements/` to find the next available number:

```bash
ls docs/improvements/
```

Files follow the pattern `NNN-slug.md` (e.g., `001-stream-quality-not-propagated.md`). Pick the next number in sequence.

### 3. Write the bug document

Read the template from `references/template.md` in this skill's directory. Use that template exactly as the structure for the bug document.

The file must use the template structure with YAML frontmatter containing `title`, `date`, `severity`, `component`, and `tags`, followed by the document sections.

### 4. Content guidelines

- **Be specific**: Include file paths, line numbers, config values, code snippets
- **Be reproducible**: Someone unfamiliar with the session should be able to understand and verify the bug
- **Be honest about impact**: Don't overstate or understate severity
- **Include the "why not now"**: Briefly note why this is deferred rather than fixed immediately
- **Suggest a fix direction**: If you have an idea of the fix, include it — saves time later

### 5. Choosing severity

- `critical`: System broken, data loss, security issue
- `high`: Major feature degraded, workaround exists but painful
- `medium`: Feature partially works, reasonable workaround exists
- `low`: Cosmetic, edge case, minor inconvenience

## Guidelines

- One bug per file. If multiple bugs are found, create multiple files.
- Draw from the actual conversation — the debugging steps, the evidence found, the analysis done.
- The tone should be direct and technical, like a bug report on a well-run project.
- Code examples should be real snippets from the codebase, not pseudocode.
- If the bug was found while working on something else, mention the original task for context.
