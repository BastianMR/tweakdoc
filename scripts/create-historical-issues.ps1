$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\basma\Downloads\000_GOOGLE DRIVE\TweakDoc'

$issues = @(
  @{ n='BAS-143'; f='BAS-143-setup.md';              t='Setup: scaffold Next.js 15 + deps + Vitest + schema Drizzle (T001-T005)'; l='chore' },
  @{ n='BAS-144'; f='BAS-144-foundation.md';         t='Foundation: interpolacion/naming/formats/styleTokens/presets + shell + API docs (T006-T013)'; l='backend' },
  @{ n='BAS-145'; f='BAS-145-us1-editor.md';         t='US1: Editor con campos drag/notacion ligados por columnId (T014-T020)'; l='frontend' },
  @{ n='BAS-146'; f='BAS-146-us2-spreadsheet.md';    t='US2: Spreadsheet importable y editable con numeracion permanente (T021-T026)'; l='frontend' },
  @{ n='BAS-151'; f='BAS-151-us3-pdf-export.md';     t='US3: Generacion PDF individual/batch con politica estricta (T027-T030)'; l='backend' },
  @{ n='BAS-147'; f='BAS-147-us4-dashboard.md';      t='US4: Dashboard de salud + logs de exportacion navegables (T031-T033)'; l='frontend' },
  @{ n='BAS-148'; f='BAS-148-us5-library.md';        t='US5: Library multi-documento con busqueda/rename/delete cascade (T034-T035)'; l='frontend' },
  @{ n='BAS-149'; f='BAS-149-us6-api-injection.md';  t='US6: Inyeccion de datos via API con validacion estricta (T036-T037)'; l='backend' },
  @{ n='BAS-152'; f='BAS-152-us7-presets.md';        t='US7: Presets estructurales Letter/Oficio/Blank (T038-T039)'; l='frontend' },
  @{ n='BAS-150'; f='BAS-150-us8-styles.md';         t='US8: Tab Styles global consistente preview-PDF (T040-T042)'; l='frontend' },
  @{ n='BAS-153'; f='BAS-153-us9-quality.md';        t='US9: Spellcheck es/en offline + AI review BYO (T043-T046)'; l='ai' },
  @{ n='BAS-154'; f='BAS-154-polish.md';             t='Polish: quickstart validation + perf + security + changelog + graphify (T047-T050)'; l='chore' }
)

$created = @{}
$tmp = Join-Path $env:TEMP 'gh-body.md'
foreach ($i in $issues) {
  $body = "HISTORICAL ISSUE - implemented & verified in v1.0.0.`nFull project history: docs/PROJECT-HISTORY.md`n`n---`n`n" + (Get-Content "docs\issues\$($i.f)" -Raw)
  Set-Content -Path $tmp -Value $body -Encoding UTF8
  $url = gh issue create --title "$($i.n): $($i.t)" --body-file $tmp --label $i.l 2>$null
  if ($url -match '/issues/(\d+)') {
    $num = $Matches[1]
    $created[$i.n] = $num
    gh issue close $num --comment "Implemented and verified in v1.0.0. Evidence: 50/50 tasks in specs/001-variable-document-merge/tasks.md - 72+ Vitest tests - 12/12 E2E scenarios (scripts/e2e-validate.mjs) - typecheck/lint clean." 2>$null | Out-Null
    Write-Output "$($i.n) -> #$num (closed)"
  } else {
    Write-Output "$($i.n) -> FAILED: $url"
  }
}
$created | ConvertTo-Json | Set-Content docs\issues\github-mapping.json
Write-Output 'DONE historical issues'
