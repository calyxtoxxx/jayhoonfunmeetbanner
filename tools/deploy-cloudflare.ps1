<#
  Deploy this banner to Cloudflare Pages as a DIRECT UPLOAD.

  Direct upload avoids the Git integration entirely (no Cloudflare GitHub App permissions,
  no build command / output-dir settings, nothing to misconfigure) - so it always produces
  a deployment, which is the quickest fix for "No deployment available".

    .\tools\deploy-cloudflare.ps1
    .\tools\deploy-cloudflare.ps1 -Project jayhoonbanner -Branch main

  Authentication - either:
    * interactive:  npx wrangler login        (then just run this script), or
    * headless:     $env:CLOUDFLARE_API_TOKEN = "<token with Cloudflare Pages:Edit>"
                    $env:CLOUDFLARE_ACCOUNT_ID = "<account id>"

  The site is uploaded from a clean staging copy: .git, node_modules and any local junk
  never leave the machine.
#>
param(
  [string]$Project = 'jayhoonfunmeetbanner',
  [string]$Branch  = 'main'
)

$ErrorActionPreference = 'Stop'
$repo  = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $env:TEMP ('cf-deploy-' + $Project)

Write-Host "staging $repo" -ForegroundColor Cyan
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
robocopy $repo $stage /E /XD .git node_modules .certs /NFL /NDL /NJH /NJS /NP | Out-Null
$files = Get-ChildItem $stage -Recurse -File
$mb = [math]::Round((($files | Measure-Object Length -Sum).Sum) / 1MB, 1)
Write-Host ("  {0} files, {1} MB" -f $files.Count, $mb) -ForegroundColor DarkGray

Write-Host "deploying to Cloudflare Pages project '$Project' ($Branch)" -ForegroundColor Cyan
Push-Location $repo
try {
  npx --yes wrangler@4 pages deploy $stage --project-name=$Project --branch=$Branch --commit-dirty=true
} finally {
  Pop-Location
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}
