<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ElectionModel;
use DateTime;
use RuntimeException;

class ScheduleService
{
    protected ElectionModel $electionModel;

    public function __construct()
    {
        $this->electionModel = new ElectionModel();
    }

    /**
     * Mendapatkan jadwal pemilu aktif
     */
    public function getSchedule(): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif.');
        }

        return [
            'election_id' => $election['id'],
            'start_time'  => $election['start_time'],
            'end_time'    => $election['end_time'],
        ];
    }

    /**
     * Mengatur waktu mulai & selesai pemungutan suara
     */
    public function updateSchedule(string $startTime, string $endTime): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif.');
        }

        if (! in_array($election['status'], ['SETUP', 'READY', 'PENDING'], true)) {
            throw new RuntimeException('Jadwal pemilu tidak dapat diubah setelah pemungutan suara dimulai atau ditutup.');
        }

        $startDate = new DateTime($startTime);
        $endDate   = new DateTime($endTime);

        if ($endDate <= $startDate) {
            throw new RuntimeException('Waktu selesai pemungutan suara (end_time) harus lebih akhir daripada waktu mulai (start_time).');
        }

        $formattedStart = $startDate->format('Y-m-d H:i:sP');
        $formattedEnd   = $endDate->format('Y-m-d H:i:sP');

        $this->electionModel->update($election['id'], [
            'start_time' => $formattedStart,
            'end_time'   => $formattedEnd,
        ]);

        return [
            'election_id' => $election['id'],
            'start_time'  => $formattedStart,
            'end_time'    => $formattedEnd,
        ];
    }
}
