# GreenLog — Project Instructions

**Stack:** Next.js 15, TypeScript, Tailwind v4, Supabase (Postgres + RLS), Vercel  
**CLI:** `npm run dev | build | lint` | `supabase db push` | `vercel --prod`

## First — load the brain

```
.agent/  ← memory, skills, protocols (agentic-stack)
```

Read in order: `.agent/AGENTS.md` → `.agent/memory/personal/PREFERENCES.md` → `.agent/memory/semantic/LESSONS.md` → `.agent/protocols/permissions.md`

## Before non-trivial tasks

```bash
python3 .agent/tools/recall.py "<task intent>"
```

Show matching lessons; adjust plan to respect them.

## While working

- Skills: `.agent/skills/_index.md` → load matching SKILL.md
- Workspace: update `.agent/memory/working/WORKSPACE.md`
- Log actions: `.agent/tools/memory_reflect.py`
- Brain state: `python3 .agent/tools/show.py`
- Teach rule: `python3 .agent/tools/learn.py "<rule>" --rationale "<why>"`

## Override rules

- Never force-push to main/production/staging
- Never delete episodic/semantic memory — archive only
- Never modify `.agent/protocols/permissions.md`
