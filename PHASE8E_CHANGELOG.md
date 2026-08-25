# Phase 8E — Workflow Automation & SLA Engine

## Added
- `/admin/tasks` unified operational task and SLA queue.
- `/admin/automation` admin-only workflow rule configuration and run history.
- Case-level Tasks & SLA panel inside `/admin/cases/case?id=...`.
- My Tasks panel on the CareAtlas admin overview.
- Deterministic, idempotent automation engine with configurable rule enable/disable, priority and SLA hours.
- Automatic source-signal resolution for automation tasks when a blocker disappears on the next sync.
- Live due-soon, overdue and escalation-level calculation.
- Manual task creation, take ownership, start, block, complete, dismiss and reopen controls.
- Firestore collections `workflowTasks`, `workflowAutomationConfig`, and `workflowAutomationRuns`.
- Immutable audit events for config updates, sync runs, manual task creation and task updates.

## Initial automation rules
- Assign an active case coordinator.
- Request records in Records Review when none are recorded.
- Review hospital matching when no hospital is assigned.
- Follow up when Treatment Plans has no active plan.
- Coordinate a consultation when none exists.
- Start travel readiness when no travel request exists.
- Recover an awaiting-patient case after 3+ inactive days.
- Follow up with a provider after 2+ waiting days.
- Start post-treatment follow-up.

## Safety / architecture boundaries
- Workflow automation does not diagnose, recommend treatment, choose a hospital, alter case stage/status, or send a patient communication.
- Hospital commercials and affiliate economics are not inputs to task creation or SLA priority.
- The current static GitHub Pages + Firebase implementation has no true background scheduler. Workflow sync is run from an authenticated CareAtlas staff browser session. This is displayed explicitly in the UI.
- A later production scheduler can call the same deterministic rule logic from a secure server environment without changing the task model.
