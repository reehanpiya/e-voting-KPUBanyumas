<?php

declare(strict_types=1);

namespace App\Services;

use CodeIgniter\HTTP\ResponseInterface;

final class ApiResponse
{
    /**
     * Success response untuk Track 1 dan Track 2.
     */
    public static function success(
        string $message,
        mixed $data = [],
        int $statusCode = 200,
    ): ResponseInterface {
        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'status'  => 'success',
                'success' => true,
                'message' => $message,
                'data'    => $data,
            ]);
    }

    /**
     * Validation failure response untuk Track 2.
     */
    public static function fail(
        string $message,
        array $errors = [],
        int $statusCode = 422,
    ): ResponseInterface {
        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'status'  => 'fail',
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ]);
    }

    /**
     * Error response yang kompatibel dengan kedua pola pemanggilan:
     *
     * Track 2: error($message, 400)
     * Track 1: error($message, $errors, 401)
     */
    public static function error(
        string $message,
        array|int $errors = [],
        ?int $statusCode = null,
    ): ResponseInterface {
        if (is_int($errors)) {
            $statusCode = $errors;
            $errors = [];
        }

        $statusCode ??= 400;

        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'status'  => 'error',
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ]);
    }

    /**
     * 401 Unauthorized.
     */
    public static function unauthorized(
        string $message = 'Autentikasi gagal atau token tidak valid.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 401);
    }

    /**
     * 403 Forbidden.
     */
    public static function forbidden(
        string $message = 'Anda tidak memiliki hak akses untuk aksi ini.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 403);
    }

    /**
     * 404 Not Found.
     */
    public static function notFound(
        string $message = 'Data tidak ditemukan.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 404);
    }

    /**
     * 422 Validation error.
     */
    public static function validation(
        string $message = 'Validasi input gagal.',
        array $errors = [],
    ): ResponseInterface {
        return self::error($message, $errors, 422);
    }
}
