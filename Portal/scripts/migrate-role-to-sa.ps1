# Migration script: Update PocketBase users collection
# 1. Add 'sa' to allowed role values
# 2. Migrate existing 'employee' users to 'sa'

$PB_URL = "http://localhost:8092"

# Step 1: Authenticate as superuser
Write-Host "=== Authenticating... ===" -ForegroundColor Cyan
$authBody = @{ identity = "admin@bcas.com"; password = "adminpassword123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "$PB_URL/api/collections/_superusers/auth-with-password" -Method POST -ContentType "application/json" -Body $authBody
$token = $auth.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Authenticated OK" -ForegroundColor Green

# Step 2: Get current users collection schema
Write-Host "`n=== Fetching users collection schema... ===" -ForegroundColor Cyan
$collection = Invoke-RestMethod -Uri "$PB_URL/api/collections/users" -Headers $headers
$schema = $collection.fields

# Find the role field and show current values
$roleField = $schema | Where-Object { $_.name -eq "role" }
Write-Host "Current role field values: $($roleField.values -join ', ')"

# Step 3: Update role field to include 'sa' and remove 'employee'
Write-Host "`n=== Updating role field... ===" -ForegroundColor Cyan
$newValues = @($roleField.values | Where-Object { $_ -ne "employee" })
if ($newValues -notcontains "sa") { $newValues += "sa" }
if ($newValues -notcontains "mechanic") { $newValues += "mechanic" }
$roleField.values = $newValues
Write-Host "New role field values: $($newValues -join ', ')"

# Build the update payload - keep all fields, just update the role one
$updateBody = @{ fields = $schema } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "$PB_URL/api/collections/users" -Method PATCH -ContentType "application/json" -Headers $headers -Body $updateBody | Out-Null
Write-Host "Schema updated!" -ForegroundColor Green

# Step 4: Migrate existing employee users to sa
Write-Host "`n=== Migrating users... ===" -ForegroundColor Cyan
$users = Invoke-RestMethod -Uri "$PB_URL/api/collections/users/records?filter=(role='employee')&perPage=500" -Headers $headers
Write-Host "Found $($users.totalItems) users with role=employee"

foreach ($u in $users.items) {
    $updateData = @{ role = "sa" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$PB_URL/api/collections/users/records/$($u.id)" -Method PATCH -ContentType "application/json" -Headers $headers -Body $updateData | Out-Null
    Write-Host "  Updated: $($u.name) -> sa" -ForegroundColor Yellow
}

Write-Host "`n=== Migration complete! ===" -ForegroundColor Green
