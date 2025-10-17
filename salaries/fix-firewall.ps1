# ============================================================
# Automatic Windows Firewall Fix for XAMPP Apache
# Allows Apache to accept connections from other devices
# Run as Administrator
# ============================================================

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "XAMPP Apache Firewall Fix" -ForegroundColor Cyan
Write-Host "East Boundary Systems" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to this folder and run the script again" -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Get XAMPP Apache path
$apachePath = "C:\xampp\apache\bin\httpd.exe"

if (-not (Test-Path $apachePath)) {
    Write-Host "⚠️ Apache not found at: $apachePath" -ForegroundColor Yellow
    $apachePath = Read-Host "Enter the full path to httpd.exe"
    
    if (-not (Test-Path $apachePath)) {
        Write-Host "❌ Apache still not found. Exiting." -ForegroundColor Red
        Pause
        exit
    }
}

Write-Host "✅ Apache found at: $apachePath" -ForegroundColor Green
Write-Host ""

# Check if firewall rules already exist
Write-Host "Checking existing firewall rules..." -ForegroundColor Cyan
$existingRules = Get-NetFirewallRule -DisplayName "*Apache*" -ErrorAction SilentlyContinue

if ($existingRules) {
    Write-Host "⚠️ Found existing Apache firewall rules:" -ForegroundColor Yellow
    foreach ($rule in $existingRules) {
        Write-Host "   - $($rule.DisplayName)" -ForegroundColor Yellow
    }
    Write-Host ""
    $remove = Read-Host "Remove existing rules and create new ones? (Y/N)"
    
    if ($remove -eq 'Y' -or $remove -eq 'y') {
        Write-Host "Removing old rules..." -ForegroundColor Cyan
        Remove-NetFirewallRule -DisplayName "*Apache*" -ErrorAction SilentlyContinue
        Write-Host "✅ Old rules removed" -ForegroundColor Green
        Write-Host ""
    }
}

# Create Inbound Rule (Allow incoming connections)
Write-Host "Creating firewall rules..." -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "📥 Creating Inbound Rule (TCP Port 80)..." -ForegroundColor Cyan
    New-NetFirewallRule -DisplayName "XAMPP Apache HTTP (Port 80)" `
                        -Direction Inbound `
                        -Action Allow `
                        -Protocol TCP `
                        -LocalPort 80 `
                        -Profile Any `
                        -ErrorAction Stop | Out-Null
    Write-Host "✅ Inbound rule created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create inbound rule: $_" -ForegroundColor Red
}

Write-Host ""

try {
    Write-Host "📤 Creating Outbound Rule (TCP Port 80)..." -ForegroundColor Cyan
    New-NetFirewallRule -DisplayName "XAMPP Apache HTTP Out (Port 80)" `
                        -Direction Outbound `
                        -Action Allow `
                        -Protocol TCP `
                        -LocalPort 80 `
                        -Profile Any `
                        -ErrorAction Stop | Out-Null
    Write-Host "✅ Outbound rule created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create outbound rule: $_" -ForegroundColor Red
}

Write-Host ""

try {
    Write-Host "🔥 Creating Program Rule (httpd.exe)..." -ForegroundColor Cyan
    New-NetFirewallRule -DisplayName "XAMPP Apache Web Server" `
                        -Direction Inbound `
                        -Action Allow `
                        -Program $apachePath `
                        -Profile Any `
                        -ErrorAction Stop | Out-Null
    Write-Host "✅ Program rule created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create program rule: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "✅ FIREWALL CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"}).IPAddress

Write-Host "📱 Your Network Information:" -ForegroundColor Cyan
Write-Host "   Computer IP: $ipAddress" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   From this computer: http://localhost/eastboundarysystems/salaries/auth.html" -ForegroundColor Yellow
Write-Host "   From other devices: http://$ipAddress/eastboundarysystems/salaries/auth.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "🧪 Test Connection:" -ForegroundColor Cyan
Write-Host "   From other devices: http://$ipAddress/eastboundarysystems/salaries/test-connection.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Other devices on the same WiFi can now access the system!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure Apache is running in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Test from your phone using the URLs above" -ForegroundColor White
Write-Host "   3. If still not working, check your WiFi network" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
