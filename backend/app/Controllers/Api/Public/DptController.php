<?php

declare(strict_types=1);

namespace App\Controllers\Api\Public;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\VoterVerificationService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class DptController extends BaseController
{
    protected VoterVerificationService $verificationService;

    public function __construct()
    {
        $this->verificationService = new VoterVerificationService();
    }

    /**
     * POST /api/public/check-dpt
     * Cek status terdaftar DPT publik
     */
    public function check(): ResponseInterface
    {
        try {
            $rules = [
                'nisn'       => 'required',
                'birth_date' => 'required',
            ];

            if (! $this->validate($rules)) {
                return ApiResponse::fail('NISN dan Tanggal Lahir wajib diisi.', $this->validator->getErrors());
            }

            $nisn      = (string) $this->request->getVar('nisn');
            $birthDate = (string) $this->request->getVar('birth_date');

            $result = $this->verificationService->checkDpt($nisn, $birthDate);

            return ApiResponse::success('Data DPT ditemukan.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
