param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AuthToken = "",
    [string]$TestEmployeeId = "",
    [int]$Duration = 80,
    [switch]$WithMonitoring
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResultsDir = "$ScriptDir\results"
$ReportFile = "$ResultsDir\load-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Ensure results directory exists
New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ENTERPRISE HRMS - BASELINE LOAD TEST SUITE       ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Target URL:       $($BaseUrl.PadRight(40))║" -ForegroundColor White
Write-Host "║  Virtual Users:    100                              ║" -ForegroundColor White  
Write-Host "║  Test Duration:    80s (includes ramp-up/down)      ║" -ForegroundColor White
Write-Host "║  Auth Token:       $(if ($AuthToken) { 'Provided'.PadRight(40) } else { 'NOT PROVIDED'.PadRight(40) })║" -ForegroundColor $(if ($AuthToken) { 'Green' } else { 'Yellow' })
Write-Host "║  Monitoring:       $(if ($WithMonitoring) { 'Enabled'.PadRight(40) } else { 'Disabled'.PadRight(40) })║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check k6 binary
$K6Path = "$ScriptDir\k6.exe"
if (-not (Test-Path $K6Path)) {
    Write-Host "ERROR: k6 binary not found at $K6Path" -ForegroundColor Red
    Write-Host "Download from: https://github.com/grafana/k6/releases" -ForegroundColor Yellow
    exit 1
}

# Start CPU/Memory monitoring if enabled
$MonitorJob = $null
if ($WithMonitoring) {
    $MonitorScript = {
        param($ScriptDir, $ReportFile, $TotalSeconds)
        $MonitorFile = "$ReportFile-monitor.csv"
        "Timestamp,CPU(%) ,Memory(MB),ProcessCPU(%),ProcessMemory(MB)" | Out-File -FilePath $MonitorFile -Encoding UTF8
        $EndTime = (Get-Date).AddSeconds($TotalSeconds + 15)
        while ((Get-Date) -lt $EndTime) {
            try {
                $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
                $os = Get-CimInstance Win32_OperatingSystem
                $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1024, 1)
                $freeMem = [math]::Round($os.FreePhysicalMemory / 1024, 1)
                $usedMem = $totalMem - $freeMem

                $nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
                if ($nodeProcs) {
                    foreach ($p in $nodeProcs) {
                        "$(Get-Date -Format 'HH:mm:ss'),$cpu,$usedMem,$($p.CPU),$([math]::Round($p.WorkingSet / 1MB, 1))" | Out-File -FilePath $MonitorFile -Encoding UTF8 -Append
                    }
                } else {
                    "$(Get-Date -Format 'HH:mm:ss'),$cpu,$usedMem,0,0" | Out-File -FilePath $MonitorFile -Encoding UTF8 -Append
                }
            } catch { 
                # Silently continue on monitoring errors
            }
            Start-Sleep -Seconds 2
        }
    }
    $MonitorJob = Start-Job -ScriptBlock $MonitorScript -ArgumentList $ScriptDir, $ReportFile, $Duration
    Write-Host "→ CPU/Memory monitoring started (PID tracking enabled)" -ForegroundColor Green
}

Write-Host "→ Starting load test..." -ForegroundColor Green
Write-Host "  ${Duration}s duration, 100 VUs, targeting $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Build k6 command
$K6Args = @(
    "run",
    "$ScriptDir\load-test.js",
    "--env", "BASE_URL=$BaseUrl",
    "--env", "AUTH_TOKEN=$AuthToken",
    "--env", "TEST_EMPLOYEE_ID=$TestEmployeeId",
    "--duration", "${Duration}s",
    "--vus", "100",
    "--summary-export", "$ReportFile-summary.json",
    "--out", "json=$ReportFile-raw.json",
    "--http-debug", ""  # Set to "full" for verbose output
)

# Run k6
$K6Process = Start-Process -FilePath $K6Path -ArgumentList $K6Args -NoNewWindow -PassThru -RedirectStandardOutput "$ReportFile-output.txt" -RedirectStandardError "$ReportFile-error.txt"

# Show progress
$StartTime = Get-Date
$ProgressLines = @()
while (-not $K6Process.HasExited) {
    Start-Sleep -Seconds 3
    $Elapsed = [math]::Round(((Get-Date) - $StartTime).TotalSeconds)
    $ProgressLines = Get-Content "$ReportFile-output.txt" -Tail 3 2>$null
    $LastLine = $ProgressLines | Select-Object -Last 1
    if ($LastLine -match 'http_req_duration|RATE|sending|receiving|http_reqs|Iteration Duration|data_received|data_sent') {
        Write-Host "  [${Elapsed}s] $LastLine" -ForegroundColor Gray
    }
}

$K6ExitCode = $K6Process.ExitCode

# Stop monitoring
if ($MonitorJob) {
    $MonitorJob | Stop-Job -PassThru | Remove-Job
}

Write-Host ""
Write-Host "→ Test completed (exit code: $K6ExitCode)" -ForegroundColor $(if ($K6ExitCode -eq 0) { 'Green' } else { 'Red' })

# Generate summary
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST RESULTS                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$reportFile = Get-ChildItem -Path $ResultsDir -Filter "load-test-report-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($reportFile) {
    try {
        $report = Get-Content $reportFile.FullName -Raw | ConvertFrom-Json
        $summary = $report.summary

        Write-Host "  Total Requests:     $($summary.totalRequests)" -ForegroundColor White
        Write-Host "  RPS:                $($summary.rps) req/s" -ForegroundColor Yellow
        Write-Host "  Avg Response:       $($summary.avgResponseTime) ms" -ForegroundColor $(if ([double]$summary.avgResponseTime -lt 500) { 'Green' } elseif ([double]$summary.avgResponseTime -lt 1500) { 'Yellow' } else { 'Red' })
        Write-Host "  P95 Response:       $($summary.p95ResponseTime) ms" -ForegroundColor $(if ([double]$summary.p95ResponseTime -lt 2000) { 'Green' } elseif ([double]$summary.p95ResponseTime -lt 4000) { 'Yellow' } else { 'Red' })
        Write-Host "  P99 Response:       $($summary.p99ResponseTime) ms" -ForegroundColor White
        Write-Host "  Min Response:       $($summary.minResponseTime) ms" -ForegroundColor Green
        Write-Host "  Max Response:       $($summary.maxResponseTime) ms" -ForegroundColor Red
        Write-Host "  Error Rate:         $($summary.errorRate)" -ForegroundColor $(if ([double]($summary.errorRate -replace '%','') ) -lt 1) { 'Green' } else { 'Red' })
        Write-Host "  Failed Requests:    $($summary.failedRequests)" -ForegroundColor $(if ($summary.failedRequests -eq 0) { 'Green' } else { 'Red' })

        Write-Host ""
        Write-Host "  Endpoint Breakdown:" -ForegroundColor Cyan
        foreach ($metric in ($report.metrics | Get-Member -MemberType NoteProperty)) {
            $m = $report.metrics.$metric
            Write-Host "    $metric → avg: $($m.avg)ms | p95: $($m.p95)ms | count: $($m.count)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Could not parse report: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  No report file found" -ForegroundColor Yellow
    # Fallback: show the raw output
    $output = Get-Content "$ReportFile-output.txt" -Tail 30
    $output | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "  Reports saved to: $ResultsDir" -ForegroundColor Cyan
Write-Host "  HTML Report:      $ReportFile.html (if generated)" -ForegroundColor Gray
Write-Host "  Raw Data:         $ReportFile-raw.json" -ForegroundColor Gray
Write-Host "  Summary JSON:     $ReportFile-summary.json" -ForegroundColor Gray
Write-Host ""

# Check thresholds
if ($K6ExitCode -eq 0) {
    Write-Host "✓ ALL THRESHOLDS PASSED - Application is stable under load" -ForegroundColor Green
} elseif ($K6ExitCode -eq 99) {
    Write-Host "⚠ SOME THRESHOLDS FAILED - Check the detailed report for bottlenecks" -ForegroundColor Yellow
} else {
    Write-Host "✗ TEST FAILED WITH EXIT CODE $K6ExitCode" -ForegroundColor Red
}

Write-Host ""
Write-Host "For detailed analysis, open the HTML report in a browser." -ForegroundColor Gray
