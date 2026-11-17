<?php

declare(strict_types=1);

namespace App\Controllers\Api\Voter;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\VoterVerificationService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class VoterVerificationController extends BaseController
{
    protected VoterVerificationService $verificationService;

    public function __construct()
    {
        $this->verificationService = new VoterVerificationService();
    }

    /**
     * POST /api/voter/verify
     * Verifikasi mandiri siswa dari smartphone & perolehan token/QR
     */
    public function verify(): ResponseInterface
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

            $result = $this->verificationService->verifyAndGenerateToken($nisn, $birthDate);

            return ApiResponse::success($result['message'], $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
