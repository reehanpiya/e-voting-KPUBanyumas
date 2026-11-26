<?php

declare(strict_types=1);

namespace App\Filters;

use App\Services\ApiResponse;
use App\Services\AuthContext;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class PrimaryAdminFilter implements FilterInterface
{
    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|RequestInterface|void
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! AuthContext::isPrimary()) {
            return ApiResponse::forbidden(
                'Akses ditolak: Hanya Admin Utama (is_primary = true) yang memiliki wewenang untuk aksi ini.'
            );
        }
    }

    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|void
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}