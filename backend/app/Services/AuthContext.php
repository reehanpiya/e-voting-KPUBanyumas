<?php

declare(strict_types=1);

namespace App\Services;

final class AuthContext
{
    /** @var array<string, mixed>|null */
    private static ?array $user = null;

    private static ?string $token = null;

    /**
     * @param array<string, mixed> $user
     */
    public static function setUser(array $user, string $token): void
    {
        self::$user  = $user;
        self::$token = $token;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getUser(): ?array
    {
        return self::$user;
    }

    public static function getToken(): ?string
    {
        return self::$token;
    }

    public static function getUserId(): ?int
    {
        return isset(self::$user['id']) ? (int) self::$user['id'] : null;
    }

    public static function getRole(): ?string
    {
        return isset(self::$user['role']) ? (string) self::$user['role'] : null;
    }

    public static function isPrimary(): bool
    {
        return ! empty(self::$user['is_primary']);
    }

    public static function clear(): void
    {
        self::$user  = null;
        self::$token = null;
    }
}
