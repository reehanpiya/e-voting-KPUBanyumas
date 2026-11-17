<?php

declare(strict_types=1);

namespace App\Controllers\Api\School;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\VoterService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class VoterController extends BaseController
{
    protected VoterService $voterService;

    public function __construct()
    {
        $this->voterService = new VoterService();
    }

    /**
     * GET /api/school/voters
     * Menampilkan daftar DPT dengan pagination
     */
    public function index(): ResponseInterface
    {
        try {
            $page    = (int) ($this->request->getGet('page') ?? 1);
            $perPage = (int) ($this->request->getGet('per_page') ?? 50);
            $search  = $this->request->getGet('search');

            $result = $this->voterService->getVoters($page, $perPage, $search ? (string) $search : null);

            return ApiResponse::success('Daftar DPT berhasil dimuat.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/school/voters/import
     * Mengunggah dan memproses file CSV DPT
     */
    public function import(): ResponseInterface
    {
        try {
            $csvFile = $this->request->getFile('csv_file') ?? $this->request->getFile('file');

            if (! $csvFile || ! $csvFile->isValid()) {
                return ApiResponse::fail('File CSV wajib diunggah.', [
                    'csv_file' => 'File CSV tidak ditemukan atau rusak.',
                ]);
            }

            $mimeType  = $csvFile->getMimeType();
            $extension = strtolower($csvFile->getClientExtension());

            if (! in_array($extension, ['csv', 'txt'], true)) {
                return ApiResponse::fail('Format file tidak didukung.', [
                    'csv_file' => 'Hanya file format .csv yang diizinkan.',
                ]);
            }

            $tempPath = $csvFile->getTempName();
            $result   = $this->voterService->importFromCsv($tempPath);

            if (! $result['success']) {
                return ApiResponse::fail('Terdapat baris data CSV yang tidak valid.', [
                    'summary' => "Ditemukan {$result['failed_count']} baris bermasalah.",
                    'details' => $result['errors'],
                ]);
            }

            return ApiResponse::success(
                "Berhasil mengimpor {$result['imported']} data pemilih ke DPT.",
                $result,
                201
            );
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/school/voters/lock
     * Mengunci DPT agar tidak dapat diubah lagi
     */
    public function lock(): ResponseInterface
    {
        try {
            $result = $this->voterService->lockVoters();

            return ApiResponse::success('DPT pemilu berhasil dikunci (read-only).', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
