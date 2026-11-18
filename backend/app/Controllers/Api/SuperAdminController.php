<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Requests\CleanupRequest;
use App\Requests\RegistrationToggleRequest;
use App\Services\ApiResponse;
use App\Services\AuthContext;
use App\Services\SuperAdminService;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Validation\Exceptions\ValidationException;
use RuntimeException;
use Throwable;

final class SuperAdminController extends BaseController
{
    private SuperAdminService $superAdminService;

    public function __construct(?SuperAdminService $superAdminService = null)
    {
        $this->superAdminService = $superAdminService ?? new SuperAdminService();
    }

    /**
     * POST /api/super/registration-toggle
     */
    public function toggleRegistration(): ResponseInterface
    {
        try {
            $request = new RegistrationToggleRequest($this->request);
            $validated = $request->validate();

            $isOpen = filter_var($validated['is_open'], FILTER_VALIDATE_BOOLEAN);
            $userId = AuthContext::getUserId();
            $ip = $this->request->getIPAddress();

            $election = $this->superAdminService->toggleRegistration($isOpen, $userId, $ip);

            return ApiResponse::success(
                sprintf('Pendaftaran sekolah berhasil %s.', $isOpen ? 'dibuka' : 'ditutup'),
                [
                    'election_id'          => $election['id'],
                    'is_registration_open' => (bool) $election['is_registration_open'],
                    'status'               => $election['status'],
                ]
            );
        } catch (ValidationException $e) {
            return ApiResponse::validation($e->getMessage(), $e->getErrors());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        } catch (Throwable $e) {
            return ApiResponse::error('Terjadi kesalahan server saat memperbarui toggle pendaftaran.', [], 500);
        }
    }

    /**
     * GET /api/super/registrations
     */
    public function registrations(): ResponseInterface
    {
        try {
            $list = $this->superAdminService->getPendingRegistrations();

            return ApiResponse::success('Daftar permohonan pendaftaran sekolah (PENDING).', [
                'total'         => count($list),
                'registrations' => $list,
            ]);
        } catch (Throwable $e) {
            return ApiResponse::error('Gagal mengambil daftar permohonan sekolah.', [], 500);
        }
    }

    /**
     * POST /api/super/registrations/{id}/approve
     */
    public function approveRegistration(string $id): ResponseInterface
    {
        try {
            $electionId = (int) $id;

            if ($electionId <= 0) {
                return ApiResponse::error('ID permohonan tidak valid.', [], 400);
            }

            $userId = AuthContext::getUserId();
            $ip = $this->request->getIPAddress();

            $result = $this->superAdminService->approveRegistration($electionId, $userId, $ip);

            return ApiResponse::success(
                'Permohonan sekolah disetujui. 5 Akun Panitia Sekolah (1 Utama + 4 Pendukung) berhasil dibuat.',
                [
                    'election' => [
                        'id'          => $result['election']['id'],
                        'status'      => $result['election']['status'],
                        'school_name' => $result['election']['school_name'],
                        'npsn'        => $result['election']['npsn'],
                    ],
                    'accounts' => $result['accounts'],
                ],
                201
            );
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        } catch (Throwable $e) {
            return ApiResponse::error('Gagal menyetujui permohonan sekolah: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * GET /api/super/progress
     */
    public function progress(): ResponseInterface
    {
        try {
            $progress = $this->superAdminService->getProgress();

            return ApiResponse::success('Status progres global tahapan pemilu.', $progress);
        } catch (Throwable $e) {
            return ApiResponse::error('Gagal mengambil progres tahapan pemilu.', [], 500);
        }
    }

    /**
     * POST /api/super/cleanup
     */
    public function cleanup(): ResponseInterface
    {
        try {
            $request = new CleanupRequest($this->request);
            $validated = $request->validate();

            $userId = AuthContext::getUserId();
            $ip = $this->request->getIPAddress();

            $election = $this->superAdminService->cleanup(
                (string) $validated['confirmation_code'],
                $userId,
                $ip
            );

            return ApiResponse::success(
                'Seluruh data operasional pemilu berhasil dibersihkan. Sistem telah direset ke status READY.',
                [
                    'election_id' => $election['id'],
                    'status'      => $election['status'],
                ]
            );
        } catch (ValidationException $e) {
            return ApiResponse::validation($e->getMessage(), $e->getErrors());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        } catch (Throwable $e) {
            return ApiResponse::error('Gagal mengeksekusi data cleanup: ' . $e->getMessage(), [], 500);
        }
    }
}
