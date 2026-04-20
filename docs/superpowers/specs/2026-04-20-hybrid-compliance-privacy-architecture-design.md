# GreenLog Hybrid Compliance + Privacy Architecture Design

Date: 2026-04-20
Status: Approved in conversation, ready for implementation planning
Scope: Phase 1 architecture for member/patient core with fully active club/admin operations

## 1. Goal and Product Positioning

GreenLog Phase 1 is centered on member/patient value while keeping club/admin operationally complete. The architecture must satisfy both:

1. KCanG operational obligations for controlled dispensation and limit enforcement.
2. DSGVO privacy expectations for sensitive health and feedback data.

The result is a two-tier data architecture with strict technical boundaries and role-scoped access.

## 2. Operating Modes and Feature Flag Strategy

Application modes are capability-based and server-enforced:

1. patient
2. csc-member
3. club-admin
4. grow-beta
5. pharmacy-organization

Flags are not cosmetic UI toggles. They gate service methods and API routes, so disabled modules are inaccessible even if a client is manipulated.

## 3. Modular Monolith Boundaries

Single codebase, strict module boundaries:

1. identity-access
2. dispensation-compliance (Tier 1)
3. health-feedback (Tier 2)
4. prevention-cases
5. policy-hub
6. reporting-export
7. feature-flag-mode

Each module exposes explicit query/command interfaces. Cross-module raw table access is avoided in application code.

## 4. Data Tier Model (Legally Aligned)

### Tier 1: KCanG Compliance Data (person-level visibility required)

Data categories:

1. dispensation grams
2. THC percentage
3. dispensation timestamp
4. member age group / member identity reference

Access:

1. admin and dispensing staff can view required individual records.
2. visibility is limited to same organization.
3. all actions are auditable.

Enforcement requirement:

1. hard legal limits are database-enforced with BEFORE INSERT trigger logic in PostgreSQL.
2. service layer only captures and handles raised DB exceptions.

### Tier 2: Health, Feedback, and Personal Logging Data (privacy-default)

Primary existing sources:

1. ratings (extended for structured effects/side effects and organization context)
2. user_collection (extended for organization context and consent pointers)
3. consumption_logs and private notes remain owner-private by default

Access:

1. club dashboards receive only anonymized aggregates.
2. raw individual records are not readable by standard club/admin roles.
3. exception path exists only for prevention role with explicit consent.

## 5. Prevention Exception Model (Opt-in)

Role-specific exception:

1. only präventionsbeauftragter can request individual Tier 2 visibility.
2. member must give explicit consent with scope and validity constraints.
3. consent can be revoked; revoked or expired consent immediately blocks access.

Operational model:

1. prevention dashboard is inbox-oriented for active cases.
2. dashboard combines case operations with anonymized trend context.
3. every sensitive access is appended to immutable access logs.

## 6. RLS and Type Constraints

### ID typing contract

1. all user references are TEXT (`user_id`, `member_id`, `created_by`, `invited_by`).
2. system entities are UUID (`organization_id`, record IDs, strain IDs, batch-style IDs).

### RLS strategy

1. deny-by-default policies.
2. org-role helper functions for role-aware checks (not just membership presence).
3. Tier 1 policies allow only authorized org roles and self-view where needed.
4. Tier 2 raw tables remain owner-private except consent-validated prevention access.
5. aggregated views are the only input for club-level feedback analytics.

## 7. Aggregation and Anonymization Rules

Anonymized feedback dashboards must use aggregation tables/views with minimum cohort thresholds to prevent re-identification. Club-facing analytics never query raw Tier 2 rows directly.

Recommended baseline:

1. minimum cohort threshold (k-anonymity) enforced in aggregate view/materialization logic.
2. suppression behavior for undersized groups.
3. stable snapshot timestamps for reproducible reporting.

## 8. Policy Hub and Compliance Reporting

### Policy hub (phase 1 confirmed)

1. read-only policy distribution per club.
2. versioning and valid-from semantics.
3. mandatory read acknowledgment tracking.

### Compliance exports (phase 1 confirmed)

Required formats:

1. PDF
2. CSV

Both formats must be generated from one consistent snapshot state so legal/audit narratives stay aligned.

## 9. Primary Flows

1. Tier 1 dispensation flow: request -> DB trigger limit check -> commit or exception -> audit event.
2. Tier 2 feedback flow: member input -> private storage -> anonymized aggregation for club dashboards.
3. prevention flow: explicit consent -> scoped access check -> case interaction -> access log append.
4. policy flow: publish version -> member acknowledgment -> compliance status tracking.
5. export flow: snapshot lock -> PDF+CSV output from same snapshot -> export metadata record.

## 10. Deferred Decisions (intentionally out of this phase gate)

These items were explicitly skipped during brainstorming and are deferred to implementation planning:

1. exact risk trigger engine design (rule-only vs hybrid with manual flags).
2. final phase-1 dashboard pane prioritization beyond agreed inbox-centered direction.
3. consent UX granularity model details (global vs scoped vs timebox combinations).

These deferrals do not block architecture implementation, schema work, or security baseline.

## 11. Implementation Readiness

This design is ready for:

1. schema migration drafting with trigger-first Tier 1 enforcement.
2. RLS policy implementation and validation queries.
3. service contract implementation per module boundary.
4. compliance export pipeline with snapshot integrity.

