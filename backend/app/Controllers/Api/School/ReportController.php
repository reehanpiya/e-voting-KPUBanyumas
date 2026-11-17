<?php

declare(strict_types=1);

namespace App\Controllers\Api\School;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\ReportingService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class ReportController extends BaseController
{
    protected ReportingService $reportingService;

    public function __construct()
    {
        $this->reportingService = new ReportingService();
    }

    /**
     * GET /api/school/results
     * Rekapitulasi suara internal sekolah & Audit Integritas Kotak Suara
     */
    public function results(): ResponseInterface
    {
        try {
            $data = $this->reportingService->getSchoolResults();
            return ApiResponse::success('Rekapitulasi dan audit integritas berhasil dimuat.', $data);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * GET /api/school/reports/export-csv
     * Mengunduh Berita Acara Rekapitulasi format CSV
     */
    public function exportCsv(): ResponseInterface
    {
        try {
            $csv = $this->reportingService->exportCsv();
            $filename = 'Berita_Acara_Pemilu_' . date('Ymd_His') . '.csv';

            return $this->response
                ->setHeader('Content-Type', 'text/csv')
                ->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->setBody($csv);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * GET /api/school/reports/export-pdf
     * Mengunduh Berita Acara Rekapitulasi format PDF resmi
     */
    public function exportPdf(): ResponseInterface
    {
        try {
            $pdf = $this->reportingService->exportPdf();
            $filename = 'Berita_Acara_Pemilu_' . date('Ymd_His') . '.pdf';

            return $this->response
                ->setHeader('Content-Type', 'application/pdf')
                ->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->setBody($pdf);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
