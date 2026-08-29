# BAS-154 — Polish: validación integral + perf + security + changelog + graphify

- **Estado real**: ⏳ Pending
- **Labels**: chore · **Estimate**: 2 · **Priority**: Medium
- **Blocked by**: 147, 148, 149, 150, 151, 152, 153

## Acceptance criteria (T047–T050)
- [ ] T047 Validación manual completa de `quickstart.md` (7 escenarios) con evidencia registrada
- [ ] T048 Perf sanity: batch 100 filas <5 min local (SC-002) — script `scripts/perf-batch.mjs`
- [ ] T049 Security pass: sin secretos en logs/código, `data/` gitignored, clave IA ausente de responses
- [ ] T050 CHANGELOG `[Unreleased]` M1–M3 + `graphify update .`

**Gate**: `verification-before-completion` antes de `/speckit.converge`.
