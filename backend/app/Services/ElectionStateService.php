<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ElectionModel;
use CodeIgniter\Database\Exceptions\DatabaseException;
use RuntimeException;

final class ElectionStateService
{
    public const STATUS_READY     = 'READY';
    public const STATUS_PENDING   = 'PENDING';
    public const STATUS_SETUP     = 'SETUP';
    public const STATUS_ACTIVE    = 'ACTIVE';
    public const STATUS_CLOSED    = 'CLOSED';
    public const STATUS_FINALIZED = 'FINALIZED';
    public const STATUS_PUBLISHED = 'PUBLISHED';
    public const STATUS_CLEANUP   = 'CLEANUP';

    /**
     * Strict sequential transition map (forward-only, circular through CLEANUP).
     *
     * @var array<string, string>
     */
    private const ALLOWED_TRANSITIONS = [
        self::STATUS_READY     => self::STATUS_PENDING,
        self::STATUS_PENDING   => self::STATUS_SETUP,
        self::STATUS_SETUP     => self::STATUS_ACTIVE,
        self::STATUS_ACTIVE    => self::STATUS_CLOSED,
        self::STATUS_CLOSED    => self::STATUS_FINALIZED,
        self::STATUS_FINALIZED => self::STATUS_PUBLISHED,
        self::STATUS_PUBLISHED => self::STATUS_CLEANUP,
        self::STATUS_CLEANUP   => self::STATUS_READY,
    ];

    private ElectionModel $electionModel;
    private AuditLogService $auditLogService;

    public function __construct(
        ?ElectionModel $electionModel = null,
        ?AuditLogService $auditLogService = null,
    ) {
        $this->electionModel   = $electionModel ?? new ElectionModel();
        $this->auditLogService = $auditLogService ?? new AuditLogService();
    }

    /**
     * Check if a status transition is syntactically allowed in the FSM sequence.
     */
    public function canTransition(string $currentStatus, string $targetStatus): bool
    {
        return isset(self::ALLOWED_TRANSITIONS[$currentStatus])
            && self::ALLOWED_TRANSITIONS[$currentStatus] === $targetStatus;
    }

    /**
     * Validate business preconditions before executing state transition.
     * Throws RuntimeException with human-readable error if validation fails.
     *
     * @param array<string, mixed> $election
     * @param array<string, mixed> $context
     */
    public function validatePreconditions(array $election, string $targetStatus, array $context = []): void
    {
        $currentStatus = (string) ($election['status'] ?? self::STATUS_READY);

        if (! $this->canTransition($currentStatus, $targetStatus)) {
            throw new RuntimeException(
                sprintf('Transisi status ilegal: tidak dapat berpindah dari %s ke %s.', $currentStatus, $targetStatus)
            );
        }

        switch ($targetStatus) {
            case self::STATUS_PENDING:
                if (empty($election['is_registration_open'])) {
                    throw new RuntimeException('Pendaftaran sekolah saat ini sedang ditutup oleh KPU.');
                }
                break;

            case self::STATUS_ACTIVE:
                if (empty($election['dpt_locked_at'])) {
                    throw new RuntimeException('DPT harus dikunci terlebih dahulu sebelum memulai pemungutan.');
                }
                if (empty($election['candidates_locked_at'])) {
                    throw new RuntimeException('Daftar kandidat harus dikunci terlebih dahulu sebelum memulai pemungutan.');
                }
                if (empty($election['start_time']) || empty($election['end_time'])) {
                    throw new RuntimeException('Jadwal mulai dan selesai pemungutan wajib diatur terlebih dahulu.');
                }
                break;

            case self::STATUS_CLOSED:
                $confirmText = trim((string) ($context['confirmation_text'] ?? ''));
                if ($confirmText !== 'TUTUP SESI PEMUNGUTAN') {
                    throw new RuntimeException('Konfirmasi penutupan tidak valid. Ketik "TUTUP SESI PEMUNGUTAN" dengan tepat.');
                }
                break;

            case self::STATUS_CLEANUP:
                if (empty($election['report_downloaded_at'])) {
                    throw new RuntimeException('Laporan resmi pemilu belum diunduh. Cleanup hanya boleh dilakukan setelah laporan diunduh.');
                }
                $confirmCode = trim((string) ($context['confirmation_code'] ?? ''));
                if ($confirmCode !== 'HAPUS DATA') {
                    throw new RuntimeException('Konfirmasi cleanup tidak valid. Ketik "HAPUS DATA" dengan tepat.');
                }
                break;
        }
    }

    /**
     * Execute status transition inside a strict database transaction.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed> Updated election record
     */
    public function transitionTo(
        int $electionId,
        string $targetStatus,
        ?int $userId = null,
        ?string $ipAddress = null,
        array $context = [],
    ): array {
        $db = $this->electionModel->db;
        $db->transBegin();

        try {
            /** @var array<string, mixed>|null $election */
            $election = $this->electionModel->find($electionId);

            if ($election === null) {
                throw new RuntimeException('Data sesi pemilu tidak ditemukan.');
            }

            $currentStatus = (string) $election['status'];

            // Validate state preconditions
            $this->validatePreconditions($election, $targetStatus, $context);

            // Update status
            $this->electionModel->update($electionId, [
                'status' => $targetStatus,
            ]);

            // Record audit trail
            $this->auditLogService->log(
                $userId,
                sprintf('ELECTION_STATUS_CHANGE: %s -> %s', $currentStatus, $targetStatus),
                $ipAddress
            );

            if ($db->transStatus() === false) {
                $db->transRollback();
                throw new DatabaseException('Gagal mengubah status pemilu pada level basis data.');
            }

            $db->transCommit();

            /** @var array<string, mixed> $updated */
            $updated = $this->electionModel->find($electionId);

            return $updated;
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }
}
