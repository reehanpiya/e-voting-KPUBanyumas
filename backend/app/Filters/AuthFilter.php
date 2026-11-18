<?php

declare(strict_types=1);

namespace App\Filters;

use App\Services\ApiResponse;
use App\Services\AuthContext;
use App\Services\AuthService;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class AuthFilter implements FilterInterface
{
    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|RequestInterface|void
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $request instanceof IncomingRequest) {
            return;
        }

        $header = $request->getHeaderLine('Authorization');

        if ($header === '' || ! preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return ApiResponse::unauthorized('Bearer token autentikasi tidak ditemukan.');
        }

        $plainToken = trim($matches[1]);
        $plainToken = trim($plainToken, "\"'");

        // Handle accidental double "Bearer" prefix (e.g. from Thunder Client Auth tab)
        if (str_starts_with(strtolower($plainToken), 'bearer ')) {
            $plainToken = trim(substr($plainToken, 7));
            $plainToken = trim($plainToken, "\"'");
        }

        // Handle unset template variable
        if ($plainToken === '' || $plainToken === '{{token}}') {
            return ApiResponse::unauthorized(
                'Nilai token belum diisi. Pastikan Anda telah mengeksekusi "Login Super Admin", lalu ganti {{token}} dengan string token dari respon login.'
            );
        }

        $authService = new AuthService();
        $user = $authService->getAuthenticatedUser($plainToken);

        if ($user === null) {
            return ApiResponse::unauthorized('Sesi login telah kedaluwarsa atau token tidak valid.');
        }

        AuthContext::setUser($user, $plainToken);
    }

    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|void
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        AuthContext::clear();
    }
}
