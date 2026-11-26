<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ElectionModel;
use RuntimeException;

final class SchoolRegistrationService
{
    private ElectionModel $elections;

    public function __construct(?ElectionModel $elections = null)
    {
        $this->elections = $elections ?? new ElectionModel();
    }

    /** @return array{is_open: bool} */
    public function getPublicConfig(): array
    {
        $election = $this->elections->getActiveSession();
        return ['is_open' => $election !== null
            && $election['status'] === ElectionStateService::STATUS_READY
            && ! empty($election['is_registration_open'])];
    }

    /** @param array<string, string> $input
     *  @return array<string, mixed>
     */
    public function submit(array $input): array
    {
        $db = $this->elections->db;
        $db->transBegin();

        try {
            $election = $db->query('SELECT * FROM elections ORDER BY id ASC LIMIT 1 FOR UPDATE')->getRowArray();
            if ($election === null) {
                throw new RuntimeException('Pendaftaran sekolah belum tersedia.');
            }
            if ($election['status'] !== ElectionStateService::STATUS_READY || empty($election['is_registration_open'])) {
                throw new RuntimeException('Pendaftaran sekolah sedang ditutup oleh KPU.');
            }
            if (! empty($election['npsn'])) {
                throw new RuntimeException('NPSN ini sudah pernah diajukan.');
            }

            $this->elections->update((int) $election['id'], [
                'status'         => ElectionStateService::STATUS_PENDING,
                'school_name'    => trim($input['school_name']),
                'npsn'           => trim($input['npsn']),
                'contact_name'   => trim($input['contact_name']),
                'contact_phone'  => trim($input['contact_phone']),
                'contact_email'  => trim($input['contact_email']),
                'is_registration_open' => false,
            ]);

            if ($db->transStatus() === false) {
                throw new RuntimeException('Pengajuan sekolah gagal disimpan.');
            }
            $db->transCommit();

            $saved = $this->elections->find((int) $election['id']);
            return [
                'id'            => (int) $saved['id'],
                'school_name'   => $saved['school_name'],
                'npsn'          => $saved['npsn'],
                'contact_name'  => $saved['contact_name'],
                'contact_phone' => $saved['contact_phone'],
                'contact_email' => $saved['contact_email'],
                'status'        => 'pending',
                'submitted_at'  => $saved['updated_at'],
            ];
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }

    /** @return array<string, mixed>|null */
    public function findPublicStatus(string $identifier): ?array
    {
        if (preg_match('/^REG-[0-9]{4}-([0-9]+)$/i', $identifier, $match)) {
            $election = $this->elections->find((int) $match[1]);
        } else {
            $election = preg_match('/^[0-9]{8}$/', $identifier)
                ? $this->elections->where('npsn', $identifier)->first()
                : null;
        }
        if ($election === null) return null;

        return [
            'id'           => (int) $election['id'],
            'school_name'  => $election['school_name'],
            'npsn'         => $election['npsn'],
            'status'       => $election['status'] === ElectionStateService::STATUS_PENDING ? 'pending' : 'approved',
            'submitted_at' => $election['updated_at'],
        ];
    }
}