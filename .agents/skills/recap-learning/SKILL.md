---
name: recap-learning
description: >
  Create RCA-style learning documents in docs/learning/ that capture what was learned during
  the current session. Use this skill whenever the user asks to recap learnings, write a
  post-mortem, document what was learned, create an RCA, or uses /recap-learning. Also trigger
  when the user says things like "write down what we learned", "document this for future reference",
  "capture these lessons", or "add this to our learning docs".
---

# Recap Learning

Create RCA-style learning documents in `docs/learning/` that capture insights, fixes, and decisions made during the current session. Each distinct topic gets its own file.

## Workflow

### 1. Identify learning topics

Review the conversation for distinct things that were learned, fixed, or decided. A single session might produce multiple learnings — for example, "HLS freezing fix" and "GPU encoding setup" are separate topics even if they happened in the same session.

For each topic, identify:
- What was the problem or question?
- What was impacted?
- What was the root cause or key insight?
- What was done to resolve it?
- What went well, what went wrong, what was improved?

### 2. Determine file numbering

Check existing files in `docs/learning/` to find the next available number:

```bash
ls docs/learning/
```

Files follow the pattern `NNNNNNN-slug.md` with a **7-digit zero-padded** sequence number (e.g., `0000016-webrtc-signaling-protocol-mismatch.md`). Pick the next number in sequence. If creating multiple files, number them consecutively.

### 3. Write the document(s)

Read the template from `references/template.md` in this skill's directory. Use that template exactly as the structure for each learning document.

Each file must use the template structure with YAML frontmatter containing `title`, `date`, `description`, and `tags`, followed by the document sections.

### 4. Content guidelines

The content should be:

- **Specific**: Include file paths, line numbers, config values, code snippets
- **Honest**: Document what went wrong, not just what went right
- **Actionable**: Lessons should be things someone can actually apply
- **Self-contained**: A reader unfamiliar with the session should understand the full story

### 5. Choosing tags

Tags should be lowercase, hyphenated, and drawn from the actual technologies and concepts involved. Examples: `ffmpeg`, `hls`, `webrtc`, `nginx-rtmp`, `performance`, `security`, `configuration`, `audio`, `video-quality`, `gpu`, `debugging`.

## Guidelines

- One topic per file. If a session covered "auth security" and "video quality", those are two separate files.
- Draw from the actual conversation — the problems encountered, the debugging steps taken, the fixes applied. Don't invent or generalize beyond what happened.
- The tone should be direct and technical, like an internal engineering post-mortem. Not formal, not casual.
- Code examples should be real snippets from the codebase, not pseudocode.
- If a commit was made for the fix, mention it in the Resolution section.
