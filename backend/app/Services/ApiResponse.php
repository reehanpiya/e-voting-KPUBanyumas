<?php

declare(strict_types=1);

namespace App\Services;

use CodeIgniter\HTTP\ResponseInterface;

final class ApiResponse
{
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
}
