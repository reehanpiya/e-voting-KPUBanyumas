<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PersonalAccessTokenModel;
use App\Models\UserModel;
use RuntimeException;

final class AuthService
{
    private const TOKEN_LIFETIME_SECONDS = 86400; // 24 Hours

    private UserModel $userModel;
    private PersonalAccessTokenModel $tokenModel;
    private AuditLogService $auditLogService;

    public function __construct(
        ?UserModel $userModel = null,
        ?PersonalAccessTokenModel $tokenModel = null,
        ?AuditLogService $auditLogService = null,
    ) {
        $this->userModel       = $userModel ?? new UserModel();
        $this->tokenModel      = $tokenModel ?? new PersonalAccessTokenModel();
        $this->auditLogService = $auditLogService ?? new AuditLogService();
    }

    /**
     * Authenticate an admin user and issue a Bearer token.
     *
     * @return array{token: string, expires_at: string, user: array<string, mixed>}
     */
    public function login(string $identifier, string $password, ?string $ipAddress = null): array
    {
        $user = $this->userModel->findByUsernameOrEmail($identifier);

        if ($user === null || ! password_verify($password, (string) $user['password_hash'])) {
            throw new RuntimeException('Kredensial login tidak valid. Periksa username dan password.');
        }

        // Generate cryptographically secure 64-character token
        $plainToken = bin2hex(random_bytes(32));
        $tokenHash  = hash('sha256', $plainToken);
        $expiresAt  = date('Y-m-d H:i:s', time() + self::TOKEN_LIFETIME_SECONDS);

        // Store hash in personal_access_tokens
        $this->tokenModel->insert([
            'user_id'      => $user['id'],
            'token_hash'   => $tokenHash,
            'expires_at'   => $expiresAt,
            'last_used_at' => date('Y-m-d H:i:s'),
        ]);

        // Audit log (without logging sensitive credentials)
        $this->auditLogService->log(
            (int) $user['id'],
            sprintf('USER_LOGIN: %s (%s)', $user['username'], $user['role']),
            $ipAddress
        );

        // Remove password_hash from return array
        unset($user['password_hash']);

        return [
            'token'      => $plainToken,
            'expires_at' => $expiresAt,
            'user'       => $user,
        ];
    }

    /**
     * Revoke Bearer token upon logout.
     */
    public function logout(string $plainToken, ?int $userId = null, ?string $ipAddress = null): void
    {
        $tokenHash = hash('sha256', $plainToken);
        $this->tokenModel->where('token_hash', $tokenHash)->delete();

        $this->auditLogService->log($userId, 'USER_LOGOUT', $ipAddress);
    }

    /**
     * Verify token and return associated active user.
     *
     * @return array<string, mixed>|null
     */
    public function getAuthenticatedUser(string $plainToken): ?array
    {
        $tokenHash = hash('sha256', $plainToken);
        $record    = $this->tokenModel->findValidToken($tokenHash);

        if ($record === null) {
            return null;
        }

        /** @var array<string, mixed>|null $user */
        $user = $this->userModel->find($record['user_id']);

        if ($user === null) {
            return null;
        }

        // Update last_used_at timestamp
        $this->tokenModel->update($record['id'], [
            'last_used_at' => date('Y-m-d H:i:s'),
        ]);

        unset($user['password_hash']);

        return $user;
    }
}
