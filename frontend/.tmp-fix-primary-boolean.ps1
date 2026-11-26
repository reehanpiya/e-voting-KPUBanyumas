$ErrorActionPreference = 'Stop'

$authServicePath = '..\backend\app\Services\AuthService.php'
$authService = Get-Content $authServicePath -Raw
$authService = $authService.Replace("        // Generate cryptographically secure 64-character token", "        `$user['is_primary'] = `$this->normalizeBoolean(`$user['is_primary'] ?? false);`r`n`r`n        // Generate cryptographically secure 64-character token")
$authService = $authService.Replace("        // Update last_used_at timestamp", "        `$user['is_primary'] = `$this->normalizeBoolean(`$user['is_primary'] ?? false);`r`n`r`n        // Update last_used_at timestamp")
$authService = $authService.Replace("    /**`r`n     * Verify token and return associated active user.", @'
    private function normalizeBoolean(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        return in_array(strtolower(trim((string) $value)), ['1', 't', 'true', 'yes', 'on'], true);
    }

    /**
     * Verify token and return associated active user.
'@.TrimEnd("`r", "`n"))
Set-Content -Path $authServicePath -Value $authService -NoNewline

$authContextPath = '..\backend\app\Services\AuthContext.php'
$authContext = Get-Content $authContextPath -Raw
$authContext = $authContext.Replace('        self::$user  = $user;', "        `$user['is_primary'] = self::normalizeBoolean(`$user['is_primary'] ?? false);`r`n        self::`$user  = `$user;")
$authContext = $authContext.Replace('        return ! empty(self::$user[''is_primary'']);', '        return self::normalizeBoolean(self::$user[''is_primary''] ?? false);')
$authContext = $authContext.Replace("    public static function clear(): void", @'
    private static function normalizeBoolean(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        return in_array(strtolower(trim((string) $value)), ['1', 't', 'true', 'yes', 'on'], true);
    }

    public static function clear(): void
'@.TrimEnd("`r", "`n"))
Set-Content -Path $authContextPath -Value $authContext -NoNewline

$superAdminPath = '..\backend\app\Services\SuperAdminService.php'
$superAdmin = Get-Content $superAdminPath -Raw
$superAdmin = $superAdmin.Replace("'is_primary'     => ! empty(`$user['is_primary']),", "'is_primary'     => in_array(strtolower(trim((string) (`$user['is_primary'] ?? ''))), ['1', 't', 'true', 'yes', 'on'], true),")
Set-Content -Path $superAdminPath -Value $superAdmin -NoNewline
