<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLogModel;

final class AuditLogService
{
    private AuditLogModel $auditLogModel;

    public function __construct(?AuditLogModel $auditLogModel = null)
    {
        $this->auditLogModel = $auditLogModel ?? new AuditLogModel();
    }

    /**
     * Record an administrative or security action into audit_logs.
     *
     * SECURITY RULE:
     * Never log passwords, tokens, NISN, or birth dates.
     */
    public function log(?int $userId, string $action, ?string $ipAddress = null): void
    {
        $ip = $ipAddress ?? service('request')->getIPAddress();

        $this->auditLogModel->insert([
            'user_id'    => $userId,
            'action'     => $action,
            'ip_address' => $ip,
        ]);
    }
}
