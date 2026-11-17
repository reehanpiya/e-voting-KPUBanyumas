<?php

declare(strict_types=1);

namespace App\Controllers\Api\School;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\ScheduleService;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class ScheduleController extends BaseController
{
    protected ScheduleService $scheduleService;

    public function __construct()
    {
        $this->scheduleService = new ScheduleService();
    }

    /**
     * GET /api/school/schedule
     * Mendapatkan informasi jadwal pemilu saat ini
     */
    public function show(): ResponseInterface
    {
        try {
            $schedule = $this->scheduleService->getSchedule();
            return ApiResponse::success('Jadwal pemilu berhasil dimuat.', $schedule);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * PUT/POST /api/school/schedule
     * Mengatur jadwal waktu mulai dan selesai pemungutan suara
     */
    public function update(): ResponseInterface
    {
        try {
            $rules = [
                'start_time' => 'required',
                'end_time'   => 'required',
            ];

            if (! $this->validate($rules)) {
                return ApiResponse::fail('Validasi jadwal gagal.', $this->validator->getErrors());
            }

            $startTime = (string) $this->request->getVar('start_time');
            $endTime   = (string) $this->request->getVar('end_time');

            $result = $this->scheduleService->updateSchedule($startTime, $endTime);

            return ApiResponse::success('Jadwal pemungutan suara berhasil diperbarui.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
