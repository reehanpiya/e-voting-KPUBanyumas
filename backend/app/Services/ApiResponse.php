<?php

declare(strict_types=1);

namespace App\Services;

use CodeIgniter\HTTP\ResponseInterface;

final class ApiResponse
{
    /**
     * Respon Sukses (HTTP 200/201)
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
                'message' => $message,
                'data'    => $data,
            ]);
    }

    /**
     * Respon Gagal Validasi Input (HTTP 422)
     * Format sesuai TASKS.md
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
                'message' => $message,
                'errors'  => $errors,
            ]);
    }

    /**
     * Respon Error Sistem / Otorisasi / Bisnis (HTTP 400/401/403/404/500)
     * Format sesuai TASKS.md
     */
    public static function error(
        string $message,
        int $statusCode = 400,
    ): ResponseInterface {
        return service('response')
            ->setStatusCode($statusCode)
            ->setJSON([
                'status'  => 'error',
                'message' => $message,
            ]);
    }
}

