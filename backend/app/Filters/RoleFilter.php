<?php

declare(strict_types=1);

namespace App\Filters;

use App\Services\ApiResponse;
use App\Services\AuthContext;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class RoleFilter implements FilterInterface
{
    /**
     * @param array<string>|null $arguments Allowed roles (e.g., ['super_admin'] or ['admin_sekolah'])
     * @return ResponseInterface|RequestInterface|void
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        $currentRole = AuthContext::getRole();

        if ($currentRole === null) {
            return ApiResponse::unauthorized('Pengguna belum terautentikasi.');
        }

        if (! empty($arguments) && ! in_array($currentRole, $arguments, true)) {
            return ApiResponse::forbidden(
                sprintf('Akses ditolak: role "%s" tidak memiliki izin untuk rute ini.', $currentRole)
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