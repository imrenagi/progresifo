# First Run Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show first-time users a dismissible onboarding guide that points to MIDI, interaction mode, and sound controls.

**Architecture:** `App` owns the localStorage-backed visibility state and renders a dedicated `OnboardingGuide` overlay above the existing app shell. `StatusBar` exposes stable onboarding target attributes on the real controls so the guide can describe and visually point to the actual UI.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 global CSS, Vitest, Testing Library.

---

### Task 1: First-Run Visibility and Dismissal

**Files:**
- Modify: `src/components/__tests__/App.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/OnboardingGuide.tsx`

- [x] **Step 1: Write the failing first-run test**

Add App tests that render `<App />`, assert the onboarding dialog appears when `localStorage` does not contain `progresifo.onboardingDismissed`, click the dismiss button, assert the dialog disappears, and assert the key is stored as `"true"`.

- [x] **Step 2: Run the focused test**

Run: `npm test -- src/components/__tests__/App.test.tsx -t "onboarding"`

Expected: fail because the onboarding dialog does not exist yet.

- [x] **Step 3: Add minimal component and state**

Create `OnboardingGuide.tsx` with a dialog-style overlay, three guide steps, and a dismiss button. Add `App` state initialized from `localStorage`, write the dismissal flag when dismissed, and render the overlay when visible.

- [x] **Step 4: Run the focused test again**

Run: `npm test -- src/components/__tests__/App.test.tsx -t "onboarding"`

Expected: pass.

### Task 2: Target Markers and Presentation

**Files:**
- Modify: `src/components/__tests__/App.test.tsx`
- Modify: `src/components/StatusBar.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write target marker assertions**

Extend the onboarding test to assert the existing status bar controls have `data-onboarding-target="interaction-mode"`, `data-onboarding-target="midi-status"`, and `data-onboarding-target="sound-toggle"`.

- [x] **Step 2: Run the focused test**

Run: `npm test -- src/components/__tests__/App.test.tsx -t "onboarding"`

Expected: fail because the data attributes are missing.

- [x] **Step 3: Add attributes and CSS**

Add the three data attributes to `StatusBar` controls. Style `.onboarding-guide`, `.onboarding-guide__panel`, `.onboarding-guide__steps`, `.onboarding-guide__target`, and the dismiss button so the overlay is readable on mobile and desktop without moving the underlying controls.

- [x] **Step 4: Run focused and full verification**

Run: `npm test -- src/components/__tests__/App.test.tsx -t "onboarding"`

Expected: pass.

Run: `make verify`

Expected: all tests, typechecking, and production build pass.
