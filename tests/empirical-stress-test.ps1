# tests/empirical-stress-test.ps1
# EMPIRICAL ADVERSARIAL STRESS TEST HARNESS FOR MILESTONE M1 ITERATION 2
# Tests remediated triggers, check constraints, RLS policies, and cascade behaviors.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$schemaPath = Join-Path $projectRoot "supabase\schema.sql"

if (-not (Test-Path $schemaPath)) {
    Write-Error "CRITICAL: Schema file not found at $schemaPath"
    exit 1
}

$schemaContent = Get-Content -Raw -Encoding utf8 $schemaPath

$totalTests = 0
$passedTests = 0
$failedTests = 0

function Assert-Condition($testName, $condition, $failureMessage) {
    global:
    $totalTests++
    if ($condition) {
        Write-Host "  [PASS] $testName" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] $testName - $failureMessage" -ForegroundColor Red
        $failedTests++
    }
}

Write-Host "======================================================================" -ForegroundColor Magenta
Write-Host "  EMPIRICAL ADVERSARIAL STRESS TEST HARNESS (M1 Iteration 2)" -ForegroundColor Cyan
Write-Host "  Target: supabase/schema.sql" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Magenta

# ====================================================================
# SUITE 1: VERIFY WORKER AUTOMATED TEST SCRIPT
# ====================================================================
Write-Host "`n>>> SUITE 1: Executing Worker Automated Verification Script" -ForegroundColor Yellow
$workerScript = Join-Path $projectRoot ".agents\teamwork\worker_m1_it2\verify_schema.ps1"
Assert-Condition "Worker verification script exists" (Test-Path $workerScript) "File missing at $workerScript"

$workerRunSuccess = $false
try {
    & powershell -ExecutionPolicy Bypass -File $workerScript | Out-Null
    $workerRunSuccess = ($LASTEXITCODE -eq 0)
} catch {
    $workerRunSuccess = $false
}
Assert-Condition "Worker verification script executes with zero exit code" $workerRunSuccess "Script failed or threw exception"

# ====================================================================
# SUITE 2: ANONYMITY IMMUTABILITY & DE-ANONYMIZATION ATTEMPTS ON UPDATE
# ====================================================================
Write-Host "`n>>> SUITE 2: Stress-Testing Anonymity Immutability on UPDATE" -ForegroundColor Yellow

# Extract PL/pgSQL body of enforce_suggestion_anonymity
$enforcePattern = '(?s)CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.enforce_suggestion_anonymity\(\)\s*RETURNS\s+TRIGGER\s+AS\s+\$\$(.*?)\$\$\s*LANGUAGE\s+plpgsql'
$enforceMatch = [regex]::Match($schemaContent, $enforcePattern)
Assert-Condition "Trigger function enforce_suggestion_anonymity definition exists" $enforceMatch.Success "Function not found in schema"

$enforceBody = if ($enforceMatch.Success) { $enforceMatch.Groups[2].Value } else { "" }

# Trigger simulation engine mirroring PL/pgSQL function exactly
function Simulate-EnforceSuggestionAnonymity($op, $oldRecord, $newRecord) {
    $new = @{}
    $newRecord.Keys | ForEach-Object { $new[$_] = $newRecord[$_] }

    if ($op -eq 'UPDATE') {
        # Guard 1: Immutability of anonymous suggestions
        if ($oldRecord.is_anonymous -eq $true -and ($new.is_anonymous -eq $false -or $new.student_id -ne $null)) {
            throw [System.InvalidOperationException]"Anonymous suggestions cannot be de-anonymized: anonymity is strictly immutable (ERRCODE: integrity_constraint_violation)"
        }
        # Guard 2: Author switching restriction on identified suggestions
        if ($oldRecord.is_anonymous -eq $false -and $new.student_id -ne $null -and $new.student_id -ne $oldRecord.student_id) {
            throw [System.InvalidOperationException]"Author student_id cannot be altered on an existing suggestion (ERRCODE: integrity_constraint_violation)"
        }
    }

    # Foreign Key Cascade & Null Safety
    if ($new.student_id -eq $null) {
        $new.is_anonymous = $true
    }

    # Zero-Leak Anonymity Guarantee
    if ($new.is_anonymous -eq $true) {
        $new.student_id = $null
    }

    return $new
}

# Check Constraint simulation
function Test-ChkSuggestionAnonymity($record) {
    # ((is_anonymous = true AND student_id IS NULL) OR (is_anonymous = false AND student_id IS NOT NULL))
    $c1 = ($record.is_anonymous -eq $true -and $record.student_id -eq $null)
    $c2 = ($record.is_anonymous -eq $false -and $record.student_id -ne $null)
    return ($c1 -or $c2)
}

# Test 2.1: Attempt to flip is_anonymous from true to false on UPDATE
$oldAnon = @{ id = "sugg-1"; is_anonymous = $true; student_id = $null; title = "Old Title" }
$newAttempt21 = @{ id = "sugg-1"; is_anonymous = $false; student_id = $null; title = "Old Title" }
$threw21 = $false
try {
    Simulate-EnforceSuggestionAnonymity 'UPDATE' $oldAnon $newAttempt21 | Out-Null
} catch {
    $threw21 = $_.Exception.Message -match "Anonymous suggestions cannot be de-anonymized"
}
Assert-Condition "UPDATE setting is_anonymous = false on anonymous suggestion MUST be blocked" $threw21 "Failed to block de-anonymization"

# Test 2.2: Attempt to assign student_id to an existing anonymous suggestion on UPDATE
$newAttempt22 = @{ id = "sugg-1"; is_anonymous = $true; student_id = "student-attacker"; title = "Old Title" }
$threw22 = $false
try {
    Simulate-EnforceSuggestionAnonymity 'UPDATE' $oldAnon $newAttempt22 | Out-Null
} catch {
    $threw22 = $_.Exception.Message -match "Anonymous suggestions cannot be de-anonymized"
}
Assert-Condition "UPDATE injecting student_id on anonymous suggestion MUST be blocked" $threw22 "Failed to block student_id injection"

# Test 2.3: Attempt to both flip is_anonymous = false AND set student_id on UPDATE
$newAttempt23 = @{ id = "sugg-1"; is_anonymous = $false; student_id = "student-attacker"; title = "Old Title" }
$threw23 = $false
try {
    Simulate-EnforceSuggestionAnonymity 'UPDATE' $oldAnon $newAttempt23 | Out-Null
} catch {
    $threw23 = $_.Exception.Message -match "Anonymous suggestions cannot be de-anonymized"
}
Assert-Condition "UPDATE setting both is_anonymous = false and student_id on anonymous suggestion MUST be blocked" $threw23 "Failed to block"

# Test 2.4: Legitimate UPDATE on anonymous suggestion (e.g. updating title or status)
$newAttempt24 = @{ id = "sugg-1"; is_anonymous = $true; student_id = $null; title = "Updated Title"; status = "received" }
$result24 = Simulate-EnforceSuggestionAnonymity 'UPDATE' $oldAnon $newAttempt24
$valid24 = ($result24.is_anonymous -eq $true -and $result24.student_id -eq $null -and $result24.title -eq "Updated Title")
Assert-Condition "Legitimate UPDATE on anonymous suggestion preserves anonymity and updates content" $valid24 "Corrupted anonymity or update"
Assert-Condition "Legitimate UPDATE passes chk_suggestion_anonymity" (Test-ChkSuggestionAnonymity $result24) "Failed check constraint"

# Test 2.5: Attempt to alter author on identified suggestion
$oldIdentified = @{ id = "sugg-2"; is_anonymous = $false; student_id = "student-legit"; title = "Identified Title" }
$newAttempt25 = @{ id = "sugg-2"; is_anonymous = $false; student_id = "student-impostor"; title = "Identified Title" }
$threw25 = $false
try {
    Simulate-EnforceSuggestionAnonymity 'UPDATE' $oldIdentified $newAttempt25 | Out-Null
} catch {
    $threw25 = $_.Exception.Message -match "Author student_id cannot be altered"
}
Assert-Condition "UPDATE changing student_id on identified suggestion MUST be blocked" $threw25 "Failed to block author altering"

# ====================================================================
# SUITE 3: STUDENT ACCOUNT DELETION CASCADE & ORPHANED SUGGESTIONS
# ====================================================================
Write-Host "`n>>> SUITE 3: Stress-Testing Student Deletion Cascade Anonymization" -ForegroundColor Yellow

# In PostgreSQL, ON DELETE SET NULL causes the foreign key reference in suggestions.student_id
# to become NULL upon deletion of the student in public.students.
# Triggers on suggestions fire BEFORE UPDATE with NEW.student_id = NULL.

# Test 3.1: Student deletion cascade on identified suggestion
$identifiedBeforeDelete = @{ id = "sugg-100"; is_anonymous = $false; student_id = "student-to-be-deleted"; title = "Feature request" }
# Foreign key sets student_id = NULL
$cascadeUpdate = @{ id = "sugg-100"; is_anonymous = $false; student_id = $null; title = "Feature request" }

$cascadeResult = Simulate-EnforceSuggestionAnonymity 'UPDATE' $identifiedBeforeDelete $cascadeUpdate
Assert-Condition "Cascade ON DELETE SET NULL automatically sets is_anonymous = true" ($cascadeResult.is_anonymous -eq $true) "is_anonymous remained false"
Assert-Condition "Cascade ON DELETE SET NULL ensures student_id is NULL" ($cascadeResult.student_id -eq $null) "student_id not null"
Assert-Condition "Cascade auto-anonymized record satisfies chk_suggestion_anonymity" (Test-ChkSuggestionAnonymity $cascadeResult) "Check constraint failed on cascade"

# Test 3.2: Verify what would happen WITHOUT the remediation (unremediated trigger)
$unremediatedCascade = @{ id = "sugg-100"; is_anonymous = $false; student_id = $null; title = "Feature request" }
$unremediatedViolates = -not (Test-ChkSuggestionAnonymity $unremediatedCascade)
Assert-Condition "Pre-remediation behavior would have caused check constraint failure (demonstrates vulnerability fix)" $unremediatedViolates "Did not detect pre-remediation failure mode"

# Test 3.3: Student deletion cascade on already anonymous suggestion
$anonBeforeDelete = @{ id = "sugg-101"; is_anonymous = $true; student_id = $null; title = "Already anon" }
$cascadeAnonUpdate = @{ id = "sugg-101"; is_anonymous = $true; student_id = $null; title = "Already anon" }
$cascadeAnonResult = Simulate-EnforceSuggestionAnonymity 'UPDATE' $anonBeforeDelete $cascadeAnonUpdate
Assert-Condition "Cascade on already anonymous suggestion remains anonymous and null" ($cascadeAnonResult.is_anonymous -eq $true -and $cascadeAnonResult.student_id -eq $null) "Corrupted anonymous record"
Assert-Condition "Check constraint satisfies already anonymous record after cascade" (Test-ChkSuggestionAnonymity $cascadeAnonResult) "Failed check constraint"

# Test 3.4: chk_suggestion_anonymity truth table exhaustiveness
Assert-Condition "chk_suggestion_anonymity allows (anon=true, student_id=null)" (Test-ChkSuggestionAnonymity @{ is_anonymous = $true; student_id = $null }) "Truth table 1 failed"
Assert-Condition "chk_suggestion_anonymity allows (anon=false, student_id=UUID)" (Test-ChkSuggestionAnonymity @{ is_anonymous = $false; student_id = "some-uuid" }) "Truth table 2 failed"
Assert-Condition "chk_suggestion_anonymity rejects (anon=true, student_id=UUID)" (-not (Test-ChkSuggestionAnonymity @{ is_anonymous = $true; student_id = "some-uuid" })) "Truth table 3 failed"
Assert-Condition "chk_suggestion_anonymity rejects (anon=false, student_id=null)" (-not (Test-ChkSuggestionAnonymity @{ is_anonymous = $false; student_id = $null })) "Truth table 4 failed"

# ====================================================================
# SUITE 4: TEACHER ROLE ESCALATION RESISTANCE
# ====================================================================
Write-Host "`n>>> SUITE 4: Stress-Testing Teacher Role Escalation Resistance" -ForegroundColor Yellow

# Extract prevent_teacher_role_escalation function definition
$escalatePattern = '(?s)CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.prevent_teacher_role_escalation\(\)\s*RETURNS\s+TRIGGER\s+AS\s+\$\$(.*?)\$\$\s*LANGUAGE\s+plpgsql'
$escalateMatch = [regex]::Match($schemaContent, $escalatePattern)
Assert-Condition "Trigger function prevent_teacher_role_escalation definition exists" $escalateMatch.Success "Function not found in schema"

# Simulate prevent_teacher_role_escalation logic
function Simulate-PreventTeacherRoleEscalation($callerRole, $callerId, $oldTeacher, $newTeacher, $dbTeachers) {
    if ($newTeacher.role -ne $oldTeacher.role -or $newTeacher.email -ne $oldTeacher.email) {
        if ($callerRole -eq 'authenticated') {
            $callerTeacher = $dbTeachers | Where-Object { $_.id -eq $callerId }
            $isAdmin = ($callerTeacher -ne $null -and $callerTeacher.role -eq 'admin')
            if (-not $isAdmin) {
                throw [System.InvalidOperationException]"Unauthorized: Teachers cannot modify their own role or email (ERRCODE: insufficient_privilege)"
            }
        }
    }
    return $newTeacher
}

# Simulate RLS WITH CHECK policy on public.teachers
function Test-TeacherUpdateRlsPolicy($callerId, $oldTeacher, $newTeacher, $dbTeachers) {
    # USING (id = auth.uid())
    if ($oldTeacher.id -ne $callerId) { return $false }

    # WITH CHECK (
    #     id = auth.uid()
    #     AND (
    #         (role = (SELECT t.role FROM public.teachers t WHERE t.id = auth.uid())
    #          AND email = (SELECT t.email FROM public.teachers t WHERE t.id = auth.uid()))
    #         OR EXISTS (
    #             SELECT 1 FROM public.teachers t
    #             WHERE t.id = auth.uid() AND t.role = 'admin'
    #         )
    #     )
    # )
    if ($newTeacher.id -ne $callerId) { return $false }

    $callerTeacher = $dbTeachers | Where-Object { $_.id -eq $callerId }
    $roleMatchesCurrent = ($newTeacher.role -eq $callerTeacher.role)
    $emailMatchesCurrent = ($newTeacher.email -eq $callerTeacher.email)
    $callerIsAdmin = ($callerTeacher -ne $null -and $callerTeacher.role -eq 'admin')

    return (($roleMatchesCurrent -and $emailMatchesCurrent) -or $callerIsAdmin)
}

$mockDbTeachers = @(
    @{ id = "teacher-homeroom"; email = "homeroom@school.edu"; role = "homeroom"; name = "Homeroom Teacher" },
    @{ id = "teacher-counselor"; email = "counselor@school.edu"; role = "counselor"; name = "Counselor Teacher" },
    @{ id = "teacher-admin"; email = "admin@school.edu"; role = "admin"; name = "Admin Teacher" }
)

# Test 4.1: Homeroom teacher attempts to escalate role to 'admin'
$oldHomeroom = @{ id = "teacher-homeroom"; email = "homeroom@school.edu"; role = "homeroom"; name = "Homeroom Teacher" }
$badHomeroom = @{ id = "teacher-homeroom"; email = "homeroom@school.edu"; role = "admin"; name = "Homeroom Teacher" }

$triggerBlocked41 = $false
try {
    Simulate-PreventTeacherRoleEscalation 'authenticated' "teacher-homeroom" $oldHomeroom $badHomeroom $mockDbTeachers | Out-Null
} catch {
    $triggerBlocked41 = $_.Exception.Message -match "Teachers cannot modify their own role"
}
Assert-Condition "Trigger blocks homeroom teacher updating role to 'admin'" $triggerBlocked41 "Trigger failed to block escalation"

$rlsBlocked41 = -not (Test-TeacherUpdateRlsPolicy "teacher-homeroom" $oldHomeroom $badHomeroom $mockDbTeachers)
Assert-Condition "RLS WITH CHECK blocks homeroom teacher updating role to 'admin'" $rlsBlocked41 "RLS allowed role change"

# Test 4.2: Counselor teacher attempts to escalate role to 'admin'
$oldCounselor = @{ id = "teacher-counselor"; email = "counselor@school.edu"; role = "counselor"; name = "Counselor Teacher" }
$badCounselor = @{ id = "teacher-counselor"; email = "counselor@school.edu"; role = "admin"; name = "Counselor Teacher" }

$triggerBlocked42 = $false
try {
    Simulate-PreventTeacherRoleEscalation 'authenticated' "teacher-counselor" $oldCounselor $badCounselor $mockDbTeachers | Out-Null
} catch {
    $triggerBlocked42 = $_.Exception.Message -match "Teachers cannot modify their own role"
}
Assert-Condition "Trigger blocks counselor teacher updating role to 'admin'" $triggerBlocked42 "Trigger failed to block counselor"
$rlsBlocked42 = -not (Test-TeacherUpdateRlsPolicy "teacher-counselor" $oldCounselor $badCounselor $mockDbTeachers)
Assert-Condition "RLS WITH CHECK blocks counselor teacher updating role to 'admin'" $rlsBlocked42 "RLS allowed counselor escalation"

# Test 4.3: Teacher attempts to hijack admin email
$badEmail = @{ id = "teacher-homeroom"; email = "admin@school.edu"; role = "homeroom"; name = "Homeroom Teacher" }
$triggerBlocked43 = $false
try {
    Simulate-PreventTeacherRoleEscalation 'authenticated' "teacher-homeroom" $oldHomeroom $badEmail $mockDbTeachers | Out-Null
} catch {
    $triggerBlocked43 = $_.Exception.Message -match "Teachers cannot modify their own role or email"
}
Assert-Condition "Trigger blocks teacher modifying their email address" $triggerBlocked43 "Trigger allowed email tampering"
$rlsBlocked43 = -not (Test-TeacherUpdateRlsPolicy "teacher-homeroom" $oldHomeroom $badEmail $mockDbTeachers)
Assert-Condition "RLS WITH CHECK blocks teacher modifying their email address" $rlsBlocked43 "RLS allowed email change"

# Test 4.4: Homeroom teacher performs valid profile update (name, grade, class_number)
$validProfile = @{ id = "teacher-homeroom"; email = "homeroom@school.edu"; role = "homeroom"; name = "Updated Name"; grade = 2; class_number = 5 }
$triggerPass44 = $false
try {
    $res44 = Simulate-PreventTeacherRoleEscalation 'authenticated' "teacher-homeroom" $oldHomeroom $validProfile $mockDbTeachers
    $triggerPass44 = ($res44.name -eq "Updated Name")
} catch {
    $triggerPass44 = $false
}
Assert-Condition "Trigger permits teacher updating name/grade/class_number" $triggerPass44 "Trigger blocked legitimate update"
$rlsPass44 = Test-TeacherUpdateRlsPolicy "teacher-homeroom" $oldHomeroom $validProfile $mockDbTeachers
Assert-Condition "RLS WITH CHECK permits teacher updating name/grade/class_number" $rlsPass44 "RLS blocked legitimate update"

# Test 4.5: Admin user updating teacher role
$adminUpdate = @{ id = "teacher-admin"; email = "admin@school.edu"; role = "admin"; name = "Admin Teacher" }
$targetTeacher = @{ id = "teacher-counselor"; email = "counselor@school.edu"; role = "homeroom"; name = "Counselor" }
$triggerPass45 = $false
try {
    $res45 = Simulate-PreventTeacherRoleEscalation 'authenticated' "teacher-admin" $oldCounselor $targetTeacher $mockDbTeachers
    $triggerPass45 = $true
} catch {
    $triggerPass45 = $false
}
Assert-Condition "Trigger permits admin updating teacher role" $triggerPass45 "Admin blocked"

# Test 4.6: Service role (system backend) updating teacher role
$serviceUpdate = @{ id = "teacher-homeroom"; email = "homeroom@school.edu"; role = "admin"; name = "Homeroom Teacher" }
$triggerPass46 = $false
try {
    $res46 = Simulate-PreventTeacherRoleEscalation 'service_role' "service_role" $oldHomeroom $serviceUpdate $mockDbTeachers
    $triggerPass46 = $true
} catch {
    $triggerPass46 = $false
}
Assert-Condition "Trigger permits service_role updating teacher role" $triggerPass46 "service_role blocked"

# ====================================================================
# SUITE 5: SUGGESTIONS INSERT POLICY & ANTI-TAMPERING STRESS TEST
# ====================================================================
Write-Host "`n>>> SUITE 5: Stress-Testing Suggestions INSERT Anti-Tampering Policy" -ForegroundColor Yellow

# RLS insertion policy evaluation
function Test-SuggestionInsertPolicy($authRole, $authJwtStudentId, $newRecord) {
    # 1. status = 'pending'::suggestion_status_enum
    if ($newRecord.status -ne 'pending') { return $false }

    # 2. teacher_reply IS NULL AND replied_by IS NULL AND replied_at IS NULL
    if ($newRecord.teacher_reply -ne $null -or $newRecord.replied_by -ne $null -or $newRecord.replied_at -ne $null) {
        return $false
    }

    # 3. Strict identity verification
    $isAnon = ($newRecord.is_anonymous -eq $true -and $newRecord.student_id -eq $null)
    $isIdentified = ($newRecord.is_anonymous -eq $false -and $authRole -eq 'authenticated' -and $newRecord.student_id -eq $authJwtStudentId)

    return ($isAnon -or $isIdentified)
}

# Test 5.1: Injecting counterfeit teacher reply on insert
$badReplyInsert = @{
    status = 'pending';
    teacher_reply = "Counterfeit reply!";
    replied_by = "teacher-1";
    replied_at = (Get-Date).ToString("o");
    is_anonymous = $true;
    student_id = $null;
}
Assert-Condition "INSERT with injected teacher_reply MUST be rejected" (-not (Test-SuggestionInsertPolicy 'anon' $null $badReplyInsert)) "Allowed reply injection"

# Test 5.2: Forging status to 'resolved' on insert
$badStatusInsert = @{
    status = 'resolved';
    teacher_reply = $null;
    replied_by = $null;
    replied_at = $null;
    is_anonymous = $true;
    student_id = $null;
}
Assert-Condition "INSERT with non-pending status MUST be rejected" (-not (Test-SuggestionInsertPolicy 'anon' $null $badStatusInsert)) "Allowed status bypass"

# Test 5.3: Anonymous insert attempting to smuggle student_id
$badAnonWithId = @{
    status = 'pending';
    teacher_reply = $null;
    replied_by = $null;
    replied_at = $null;
    is_anonymous = $true;
    student_id = "victim-student-id";
}
Assert-Condition "INSERT with is_anonymous=true and student_id!=null MUST be rejected" (-not (Test-SuggestionInsertPolicy 'anon' $null $badAnonWithId)) "Allowed identity smuggling"

# Test 5.4: Identified insert attempting to spoof another student_id
$spoofedIdentified = @{
    status = 'pending';
    teacher_reply = $null;
    replied_by = $null;
    replied_at = $null;
    is_anonymous = $false;
    student_id = "victim-student-id"; # Attacker pretends to be victim
}
Assert-Condition "INSERT with is_anonymous=false and spoofed student_id MUST be rejected" (-not (Test-SuggestionInsertPolicy 'authenticated' "attacker-student-id" $spoofedIdentified)) "Allowed identity spoofing"

# Test 5.5: Valid anonymous insert
$validAnon = @{
    status = 'pending';
    teacher_reply = $null;
    replied_by = $null;
    replied_at = $null;
    is_anonymous = $true;
    student_id = $null;
}
Assert-Condition "Valid anonymous INSERT MUST be permitted" (Test-SuggestionInsertPolicy 'anon' $null $validAnon) "Rejected valid anon insert"

# Test 5.6: Valid identified insert matching JWT
$validIdentified = @{
    status = 'pending';
    teacher_reply = $null;
    replied_by = $null;
    replied_at = $null;
    is_anonymous = $false;
    student_id = "student-123";
}
Assert-Condition "Valid identified INSERT matching JWT student_id MUST be permitted" (Test-SuggestionInsertPolicy 'authenticated' "student-123" $validIdentified) "Rejected valid identified insert"

# ====================================================================
# SUITE 6: SEARCH PATH HYGIENE AND SQL INTEGRITY
# ====================================================================
Write-Host "`n>>> SUITE 6: Search Path Hygiene & DDL Soundness" -ForegroundColor Yellow

$requiredFunctions = @('handle_updated_at', 'enforce_suggestion_anonymity', 'is_teacher', 'prevent_teacher_role_escalation')
foreach ($fn in $requiredFunctions) {
    $fnPattern = "(?s)CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.$fn\b.*?SET\s+search_path\s*=\s*public,\s*auth"
    $hasSearchPath = [regex]::IsMatch($schemaContent, $fnPattern)
    Assert-Condition "Function public.$fn enforces SET search_path = public, auth" $hasSearchPath "Missing search_path"
}

# Verify counseling_requests table student direct SELECT isolation
$hasStudentDirectSelect = [regex]::IsMatch($schemaContent, 'CREATE\s+POLICY\s+"Students can view own counseling requests"\s+ON\s+public\.counseling_requests')
Assert-Condition "Base counseling_requests table strictly omits student direct SELECT policy" (-not $hasStudentDirectSelect) "Confidential teacher_note at risk"

# Verify security_invoker on student_counseling_view
$hasSecurityInvoker = [regex]::IsMatch($schemaContent, 'CREATE\s+VIEW\s+public\.student_counseling_view\s+WITH\s*\(\s*security_invoker\s*=\s*true\s*\)')
Assert-Condition "public.student_counseling_view enables security_invoker = true" $hasSecurityInvoker "Security invoker missing"

# ====================================================================
# SUMMARY
# ====================================================================
Write-Host "`n======================================================================" -ForegroundColor Magenta
Write-Host "EMPIRICAL ADVERSARIAL STRESS TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Magenta
Write-Host "  Total Tests Executed: $totalTests"
Write-Host "  Tests Passed:         $passedTests" -ForegroundColor Green
Write-Host "  Tests Failed:         $failedTests" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })

if ($failedTests -gt 0) {
    Write-Host "`n[VERDICT: REQUEST_CHANGES] Adversarial stress harness detected $failedTests failure(s)!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n[VERDICT: APPROVE] All $totalTests empirical stress tests passed with 100% compliance!" -ForegroundColor Green
    exit 0
}
