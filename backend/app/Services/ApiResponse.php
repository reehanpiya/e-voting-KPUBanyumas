<?php

declare(strict_types=1);

namespace App\Services;

use CodeIgniter\HTTP\ResponseInterface;

final class ApiResponse
{
    /**
     * Standard success JSON response (HTTP 200/201).
     *
     * @param array<string, mixed> $data
     */
    public static function success(
        string $message,
        array $data = [],
        int $statusCode = 200,
    ): ResponseInterface {
        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'success' => true,
                'message' => $message,
                'data'    => $data,
            ]);
    }

    /**
     * Standard error JSON response (HTTP 400/401/403/404/422/500).
     *
     * @param array<string, mixed> $errors
     */
    public static function error(
        string $message,
        array $errors = [],
        int $statusCode = 400,
    ): ResponseInterface {
        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ]);
    }

    /**
     * 401 Unauthorized response helper.
     *
     * @param array<string, mixed> $errors
     */
    public static function unauthorized(
        string $message = 'Autentikasi gagal atau token tidak valid.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 401);
    }

    /**
     * 403 Forbidden response helper.
     *
     * @param array<string, mixed> $errors
     */
    public static function forbidden(
        string $message = 'Anda tidak memiliki hak akses untuk aksi ini.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 403);
    }

    /**
     * 404 Not Found response helper.
     *
     * @param array<string, mixed> $errors
     */
    public static function notFound(
        string $message = 'Data tidak ditemukan.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 404);
    }

    /**
     * 422 Unprocessable Entity / Validation error response helper.
     *
     * @param array<string, mixed> $errors
     */
    public static function validation(
        string $message = 'Validasi input gagal.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 422);
    }
}
