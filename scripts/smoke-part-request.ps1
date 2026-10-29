# =============================================================================
# Smoke test del part-request-service
# =============================================================================
# USO:
#   1. Levantar infra:   docker compose up -d db-part-request rabbitmq
#   2. Arrancar servicio: cd apps/part-request-service && npm run dev
#   3. Ejecutar:         powershell -File scripts/smoke-part-request.ps1
#
# Requiere: .env.example en la raiz (usa JWT_SECRET y puertos de ahi).
# Prueba: auth (401/403), DTO (400), creacion (201), ownership (403),
#         transicion invalida (422), transicion valida (200), 404.
# =============================================================================
$ErrorActionPreference = "Continue"
$base = "http://localhost:4001"

# --- Cargar variables del .env.example en el proceso -------------------------
$repoRoot = Split-Path $PSScriptRoot -Parent
Get-Content (Join-Path $repoRoot ".env.example") | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

# --- Generar JWTs de prueba (claims iguales a los del Identity) --------------
$svc = Join-Path $repoRoot "apps\part-request-service"
Push-Location $svc
$code = @'
const jwt = require("jsonwebtoken");
const s = process.env.JWT_SECRET;
console.log(JSON.stringify({
  dueno:      jwt.sign({ user_id: 12, email: "juan@taller.com",   rol: "COMPRADOR" },   s, { expiresIn: "1h" }),
  proveedor:  jwt.sign({ user_id: 99, email: "prove@taller.com",  rol: "PROVEEDOR" },   s, { expiresIn: "1h" }),
  otro:       jwt.sign({ user_id: 55, email: "otro@taller.com",   rol: "COMPRADOR" },   s, { expiresIn: "1h" }),
}));
'@
$tok = ($code | node) | ConvertFrom-Json
Pop-Location

$pass = 0; $fail = 0
function Check($name, $expected, $actual) {
    if ("$actual" -eq "$expected") { Write-Host "  PASS $name" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "  FAIL $name  (esperado $expected, llegó $actual)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n--- Autenticacion ---"
try { Invoke-RestMethod "$base/api/v1/part-requests" -Method Post | Out-Null; Check "POST sin token" 401 "?" }
catch { Check "POST sin token" 401 $_.Exception.Response.StatusCode.value__ }

try { Invoke-RestMethod "$base/api/v1/part-requests" -Method Post -Headers @{ Authorization = "Bearer $($tok.proveedor)" } | Out-Null; Check "POST rol PROVEEDOR" 403 "?" }
catch { Check "POST rol PROVEEDOR" 403 $_.Exception.Response.StatusCode.value__ }

Write-Host "`n--- Validacion de DTO ---"
try {
  Invoke-RestMethod "$base/api/v1/part-requests" -Method Post -Headers @{ Authorization = "Bearer $($tok.dueno)" } `
    -Body @{ vehicle_brand="Toyota"; vehicle_model="Hilux"; vehicle_year=2019; description="Filtro"; city="La Paz"; urgency="HIGH" } | Out-Null
  Check "urgency=HIGH rechazada" 400 "?"
} catch { Check "urgency=HIGH rechazada" 400 $_.Exception.Response.StatusCode.value__ }

Write-Host "`n--- Flujo feliz ---"
$created = Invoke-RestMethod "$base/api/v1/part-requests" -Method Post -Headers @{ Authorization = "Bearer $($tok.dueno)" } `
  -Body @{ vehicle_brand="Toyota"; vehicle_model="Hilux"; vehicle_year=2019; description="Filtro de aceite"; city="La Paz"; urgency="ALTA" }
Check "POST valido -> 201" 201 $created.status
Check "nace en PUBLISHED" "PUBLISHED" $created.data.status
Check "user_id viene del JWT" 12 $created.data.user_id
$id = $created.data.id

Write-Host "`n--- Ownership ---"
try {
  Invoke-RestMethod "$base/api/v1/part-requests/$id/status" -Method Patch -Headers @{ Authorization = "Bearer $($tok.otro)" } `
    -ContentType "application/json" -Body '{"status":"CANCELLED"}' | Out-Null
  Check "PATCH de no dueno" 403 "?"
} catch { Check "PATCH de no dueno" 403 $_.Exception.Response.StatusCode.value__ }

Write-Host "`n--- Maquina de transiciones ---"
try {
  Invoke-RestMethod "$base/api/v1/part-requests/$id/status" -Method Patch -Headers @{ Authorization = "Bearer $($tok.dueno)" } `
    -ContentType "application/json" -Body '{"status":"COMPLETED"}' | Out-Null
  Check "PUBLISHED->COMPLETED (422)" 422 "?"
} catch { Check "PUBLISHED->COMPLETED (422)" 422 $_.Exception.Response.StatusCode.value__ }

$ordered = Invoke-RestMethod "$base/api/v1/part-requests/$id/status" -Method Patch -Headers @{ Authorization = "Bearer $($tok.dueno)" } `
  -ContentType "application/json" -Body '{"status":"ORDERED"}'
Check "PUBLISHED->ORDERED (200)" 200 $ordered.status
Check "estado ahora ORDERED" "ORDERED" $ordered.data.status

try {
  Invoke-RestMethod "$base/api/v1/part-requests/$id/status" -Method Patch -Headers @{ Authorization = "Bearer $($tok.dueno)" } `
    -ContentType "application/json" -Body '{"status":"PUBLISHED"}' | Out-Null
  Check "ORDERED->PUBLISHED (422)" 422 "?"
} catch { Check "ORDERED->PUBLISHED (422)" 422 $_.Exception.Response.StatusCode.value__ }

Write-Host "`n--- Lecturas ---"
$light = Invoke-RestMethod "$base/api/v1/part-requests/$id/check-status"
Check "check-status liviano" "ORDERED" $light.data.status

try { Invoke-RestMethod "$base/api/v1/part-requests/9999" | Out-Null; Check "GET inexistente" 404 "?" }
catch { Check "GET inexistente" 404 $_.Exception.Response.StatusCode.value__ }

$list = Invoke-RestMethod "$base/api/v1/part-requests?city=La Paz&urgency=ALTA"
# Con datos previos en la BD pueden ser varias; se valida que el filtro no devuelve vacío
# y que todo lo devuelto coincide con el filtro.
$allOk = ($list.data.Count -ge 1) -and (($list.data | Where-Object { $_.city -ne "La Paz" -or $_.urgency -ne "ALTA" }).Count -eq 0)
Check "filtro city+urgency" "True" $allOk

Write-Host "`n==================================="
Write-Host "  PASS: $pass   FAIL: $fail"
Write-Host "==================================="
if ($fail -gt 0) { exit 1 }
