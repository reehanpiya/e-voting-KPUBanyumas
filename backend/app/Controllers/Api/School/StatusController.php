<?php

declare(strict_types=1);

namespace App\Controllers\Api\School;

use App\Controllers\BaseController;
use App\Models\ElectionModel;
use App\Services\ApiResponse;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\I18n\Time;
use Throwable;

class StatusController extends BaseController
{
    protected ElectionModel $electionModel;

    public function __construct()
    {
        $this->electionModel = new ElectionModel();
    }

    /**
     * GET /api/school/status
     * Melihat status pemilu saat ini
     */
    public function current(): ResponseInterface
    {
        try {
            $election = $this->electionModel->getActiveSession();
            if (! $election) {
                return ApiResponse::error('Tidak ada sesi pemilu yang aktif.', 404);
            }

            return ApiResponse::success('Status pemilu saat ini.', [
                'id'          => $election['id'],
                'school_name' => $election['school_name'],
                'status'      => $election['status'],
            ]);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/school/status/publish
     * Mempublikasikan hasil pemilihan resmi (mengubah status ke PUBLISHED)
     */
    public function publish(): ResponseInterface
    {
        try {
            $election = $this->electionModel->getActiveSession();
            if (! $election) {
                return ApiResponse::error('Tidak ada sesi pemilu yang aktif.', 404);
            }

            $now = Time::now()->toDateTimeString();

            $this->electionModel->update($election['id'], [
                'status'     => 'PUBLISHED',
                'updated_at' => $now,
            ]);

            return ApiResponse::success('Hasil pemilihan berhasil dipublikasikan resmi (Status: PUBLISHED).', [
                'election_id' => $election['id'],
                'prev_status' => $election['status'],
                'new_status'  => 'PUBLISHED',
            ]);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/school/status
     * Mengatur transisi status pemilu secara fleksibel (SETUP, ACTIVE, CLOSED, FINALIZED, PUBLISHED)
     */
    public function updateStatus(): ResponseInterface
    {
        try {
            $election = $this->electionModel->getActiveSession();
            if (! $election) {
                return ApiResponse::error('Tidak ada sesi pemilu yang aktif.', 404);
            }

            $targetStatus = strtoupper((string) $this->request->getVar('status'));
            $allowed = ['READY', 'PENDING', 'SETUP', 'ACTIVE', 'CLOSED', 'FINALIZED', 'PUBLISHED', 'CLEANUP'];

            if (! in_array($targetStatus, $allowed, true)) {
                return ApiResponse::fail('Status tidak valid.', [
                    'status' => 'Status harus salah satu dari: ' . implode(', ', $allowed),
                ]);
            }

            $now = Time::now()->toDateTimeString();

            $this->electionModel->update($election['id'], [
                'status'     => $targetStatus,
                'updated_at' => $now,
            ]);

            return ApiResponse::success("Status pemilu berhasil diubah menjadi {$targetStatus}.", [
                'election_id' => $election['id'],
                'status'      => $targetStatus,
            ]);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
