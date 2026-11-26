<?php

declare(strict_types=1);

namespace App\Controllers\Api\Public;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\ReportingService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class ResultsController extends BaseController
{
    protected ReportingService $reportingService;

    public function __construct()
    {
        $this->reportingService = new ReportingService();
    }

    /**
     * GET /api/public/realcount (atau /api/public/turnout)
     * Realcount live partisipasi pemilih saat status pemilu ACTIVE
     */
    public function turnout(): ResponseInterface
    {
        try {
            $data = $this->reportingService->getPublicTurnout();
            return ApiResponse::success('Data partisipasi pemilu berhasil dimuat.', $data);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * GET /api/public/results
     * Hasil perolehan suara paslon resmi publik (Hanya jika status PUBLISHED)
     */
    public function results(): ResponseInterface
    {
        try {
            $data = $this->reportingService->getPublicResults();
            return ApiResponse::success('Hasil resmi pemilihan berhasil dimuat.', $data);
        } catch (Throwable $e) {
            return ApiResponse::error('Data hasil publik belum tersedia.', 404);
        }
    }
}
