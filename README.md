# Deployment Playbook example

A reference GitHub Actions pipeline gated by [Deployment Playbook](https://deployment-playbook.com).
The app is deliberately tiny (a Node.js HTTP server with one `node:test` unit test); the interesting part is
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) and the reusable composite action
[`.github/actions/wait-for-playbook`](.github/actions/wait-for-playbook/action.yml).

## Flow

```mermaid
flowchart LR
  test[test<br/>npm test] --> before[before<br/>gate: phase=during<br/>= Before steps done]
  before --> deploy[deploy<br/>dummy deploy]
  before --> during[during<br/>gate: phase=after<br/>= During steps done]
  deploy --> after[after-deployment<br/>gate: planStatus=done<br/>= After steps done]
  during --> after
```

1. **test** – runs `npm test`.
2. **before** – waits until every *Before deployment* step is approved or skipped (`?phase=during` returns
   `allow: true`). Nothing is deployed before that.
3. **deploy** and **during** run in parallel. `deploy` is a placeholder (`echo`); `during` waits until every
   *During deployment* step is approved or skipped (`?phase=after` returns `allow: true`).
4. **after-deployment** (needs `deploy` and `during`) waits until the **whole plan is complete**: `?phase=after`
   returns `allow: true` **and** `planStatus` is `done`. The run only turns green once the *After deployment* steps are
   approved/skipped in Deployment Playbook.

### Why each job asks for the *next* phase

The gate answers "may work in this phase **start**?": `?phase=after` becomes `allow: true` as soon as all *Before* and
*During* steps are resolved, before any *After* step is done. Deployment Playbook marks a plan `DONE` (reported as
`planStatus: "done"`) the moment its last step is approved or skipped, so the final job polls `?phase=after` and
additionally requires `planStatus == "done"` (`require-done: "true"` on the action). The same logic is why the
`before` job polls `?phase=during` (Before complete) and the `during` job polls `?phase=after` (During complete):
`?phase=before` would be allowed immediately, before anything is approved.

### Polling behaviour

- `curl` every 15 s with `Authorization: Bearer <token>` (plus `x-vercel-protection-bypass` only when that secret is set).
- Each poll prints `allow`, `planStatus`, `reason` and `planUrl` (parsed with `jq`). The token is masked and never printed.
- **Fails closed**: a non-200 response, network error or invalid JSON counts as "not allowed" and polling continues.
- Fails when the timeout is reached (default 60 min, `timeout_minutes` input on manual runs) or when the plan is rolled back.

## Setup

1. In Deployment Playbook, an **Admin** creates a workspace API token on `/w/<your-workspace>/connections`.
2. In this repo (or your copy), **Settings → Secrets and variables → Actions**:
   | Kind | Name | Value |
   | --- | --- | --- |
   | Secret | `PLAYBOOK_API_TOKEN` | the workspace API token |
   | Variable | `PLAYBOOK_URL` | e.g. `https://deployment-playbook.com` |
   | Variable | `PLAYBOOK_PLAN_ID` | default plan id (can be overridden per manual run with `plan_id`) |
   | Secret (optional) | `VERCEL_AUTOMATION_BYPASS` | only if you self-host Deployment Playbook behind Vercel Deployment Protection |
3. Create a plan (from a template) with steps in the three phases, e.g.
   - **Before deployment**: "Change approved by product owner", "DB backup taken"
   - **During deployment**: "Monitor dashboards during rollout"
   - **After deployment**: "Smoke test production", "Close the change"
   Propose the plan, get it approved, and copy its id into `PLAYBOOK_PLAN_ID` (or pass it as `plan_id` on *Run workflow*).
4. Push to `main` or run the workflow manually. Approve steps in Deployment Playbook and watch the jobs unblock.

## Gate API

`GET {PLAYBOOK_URL}/api/gate/{planId}?phase=before|during|after[&step={planStepId}]`
with `Authorization: Bearer <workspace API token>`. Missing `phase` defaults to `during`. A phase is allowed once the plan
is approved (in progress) and all steps of the earlier phases are approved or skipped.

Example response:

```json
{
  "allow": false,
  "reason": "1 step in \"Before deployment\" still open",
  "gatePhase": "DURING",
  "planStatus": "in_progress",
  "currentPhase": "BEFORE",
  "steps": { "approved": 1, "skipped": 0, "total": 5 },
  "planUrl": "https://deployment-playbook.com/w/acme/plans/abc123"
}
```

## Run locally

```bash
npm test
npm start   # http://localhost:3000/?name=you
```

## License

MIT © Generation Y B.V.
