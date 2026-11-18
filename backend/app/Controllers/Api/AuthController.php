<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Requests\LoginRequest;
use App\Services\ApiResponse;
use App\Services\AuthContext;
use App\Services\AuthService;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Validation\Exceptions\ValidationException;
use RuntimeException;
use Throwable;

final class AuthController extends BaseController
{
    private AuthService $authService;

    public function __construct(?AuthService $authService = null)
    {
        $this->authService = $authService ?? new AuthService();
    }

    /**
     * POST /api/admin/login
     */
    public function login(): ResponseInterface
    {
        try {
            $request = new LoginRequest($this->request);
            $validated = $request->validate();

            $ip = $this->request->getIPAddress();
            $result = $this->authService->login(
                (string) $validated['username'],
                (string) $validated['password'],
                $ip
            );

            return ApiResponse::success('Login berhasil.', $result);
        } catch (ValidationException $e) {
            return ApiResponse::validation($e->getMessage(), $e->getErrors());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), [], 401);
        } catch (Throwable $e) {
            return ApiResponse::error('Terjadi kesalahan internal server saat autentikasi.', [], 500);
        }
    }

    /**
     * POST /api/admin/logout
     */
    public function logout(): ResponseInterface
    {
        try {
            $token = AuthContext::getToken();
            $userId = AuthContext::getUserId();
            $ip = $this->request->getIPAddress();

            if ($token !== null) {
                $this->authService->logout($token, $userId, $ip);
            }

            return ApiResponse::success('Logout berhasil, token akses telah dicabut.');
        } catch (Throwable $e) {
            return ApiResponse::error('Gagal memproses logout.', [], 500);
        }
    }

    /**
     * GET /api/admin/me
     */
    public function me(): ResponseInterface
    {
        $user = AuthContext::getUser();

        if ($user === null) {
            return ApiResponse::unauthorized('Sesi tidak aktif atau pengguna tidak ditemukan.');
        }

        return ApiResponse::success('Profil pengguna terautentikasi.', [
            'user' => $user,
        ]);
    }
}
