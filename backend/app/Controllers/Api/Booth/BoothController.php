<?php

declare(strict_types=1);

namespace App\Controllers\Api\Booth;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\VotingEngineService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class BoothController extends BaseController
{
    protected VotingEngineService $votingEngine;

    public function __construct()
    {
        $this->votingEngine = new VotingEngineService();
    }

    /**
     * POST /api/booth/validate-token
     * Memvalidasi token di bilik suara (scan QR atau input kode manual 6 karakter)
     */
    public function validateToken(): ResponseInterface
    {
        try {
            $rules = [
                'token' => 'required|min_length[6]|max_length[32]',
            ];

            if (! $this->validate($rules)) {
                return ApiResponse::fail('Token wajib diisi.', $this->validator->getErrors());
            }

            $rawToken = (string) $this->request->getVar('token');
            $result   = $this->votingEngine->validateToken($rawToken);

            return ApiResponse::success('Token valid. Silakan tentukan pilihan Anda.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/booth/vote
     * Menyimpan pilihan surat suara pemilih secara rahasia & anti double-vote
     */
    public function vote(): ResponseInterface
    {
        try {
            $rules = [
                'token'        => 'required|min_length[6]|max_length[32]',
                'candidate_id' => 'required|is_natural_no_zero',
            ];

            if (! $this->validate($rules)) {
                return ApiResponse::fail('Data pencoblosan tidak lengkap.', $this->validator->getErrors());
            }

            $rawToken    = (string) $this->request->getVar('token');
            $candidateId = (int) $this->request->getVar('candidate_id');

            $result = $this->votingEngine->castVote($rawToken, $candidateId);

            return ApiResponse::success($result['message'], $result, 201);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
