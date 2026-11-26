<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BallotModel;
use App\Models\CandidateModel;
use App\Models\ElectionModel;
use App\Models\UserModel;
use App\Models\VoterModel;
use App\Models\VotingTokenModel;
use CodeIgniter\Database\Exceptions\DatabaseException;
use RuntimeException;
use Throwable;

final class SuperAdminService
{
    private ElectionModel $electionModel;
    private UserModel $userModel;
    private ElectionStateService $stateService;
    private AuditLogService $auditLogService;

    public function __construct(
        ?ElectionModel $electionModel = null,
        ?UserModel $userModel = null,
        ?ElectionStateService $stateService = null,
        ?AuditLogService $auditLogService = null,
    ) {
        $this->electionModel   = $electionModel ?? new ElectionModel();
        $this->userModel       = $userModel ?? new UserModel();
        $this->stateService    = $stateService ?? new ElectionStateService();
        $this->auditLogService = $auditLogService ?? new AuditLogService();
    }

    /**
     * Toggle public school registration opening (Only allowed in READY state).
     *
     * @return array<string, mixed>
     */
    public function toggleRegistration(bool $isOpen, ?int $superAdminId, ?string $ipAddress): array
    {
        $election = $this->electionModel->getActiveSession();

        if ($election === null) {
            throw new RuntimeException('Sesi pemilu tidak ditemukan.');
        }

        if ($election['status'] !== ElectionStateService::STATUS_READY) {
            throw new RuntimeException(
                sprintf('Pendaftaran hanya dapat diubah saat sistem berstatus READY. Status saat ini: %s.', $election['status'])
            );
        }

        $this->electionModel->update($election['id'], [
            'is_registration_open' => $isOpen,
        ]);

        $this->auditLogService->log(
            $superAdminId,
            sprintf('SUPER_ADMIN_TOGGLE_REGISTRATION: %s', $isOpen ? 'DIBUKA' : 'DITUTUP'),
            $ipAddress
        );

        /** @var array<string, mixed> $updated */
        $updated = $this->electionModel->find($election['id']);

        return $updated;
    }

    /**
     * Get pending school registration requests.
     *
     * @return list<array<string, mixed>>
     */
    public function getPendingRegistrations(): array
    {
        return $this->electionModel
            ->where('status', ElectionStateService::STATUS_PENDING)
            ->findAll();
    }

    /**
     * Approve school registration, generate 5 accounts, and transition to SETUP.
     *
     * @return array{
     *     election: array<string, mixed>,
     *     accounts: list<array{role: string, is_primary: bool, name: string, username: string, plain_password: string}>
     * }
     */
    public function approveRegistration(int $electionId, ?int $superAdminId, ?string $ipAddress): array
    {
        /** @var array<string, mixed>|null $election */
        $election = $this->electionModel->find($electionId);

        if ($election === null || $election['status'] !== ElectionStateService::STATUS_PENDING) {
            throw new RuntimeException('Permohonan sekolah tidak ditemukan atau status bukan PENDING.');
        }

        $db = $this->electionModel->db;
        $db->transBegin();

        $generatedAccounts = [];

        try {
            $npsn = preg_replace('/[^a-zA-Z0-9]/', '', (string) ($election['npsn'] ?? 'sekolah')) ?: 'sekolah';
            $schoolName = (string) ($election['school_name'] ?? 'Sekolah');

            // 1. Primary Admin Account (is_primary = true)
            $primaryUsername = 'admin_' . $npsn;
            $primaryPassword = $this->generateSecurePassword();

            $primaryUserId = $this->userModel->insert([
                'name'          => 'Admin Utama ' . $schoolName,
                'username'      => $primaryUsername,
                'email'         => $election['contact_email'] ?? null,
                'password_hash' => password_hash($primaryPassword, PASSWORD_BCRYPT),
                'role'          => UserModel::ROLE_ADMIN_SEKOLAH,
                'is_primary'    => true,
                'election_id'   => $electionId,
            ]);

            $generatedAccounts[] = [
                'role'           => UserModel::ROLE_ADMIN_SEKOLAH,
                'is_primary'     => true,
                'name'           => 'Admin Utama ' . $schoolName,
                'username'       => $primaryUsername,
                'plain_password' => $primaryPassword,
            ];

            // 2. 4 Support Admin Accounts (is_primary = false)
            for ($i = 1; $i <= 4; $i++) {
                $supportUsername = sprintf('support%d_%s', $i, $npsn);
                $supportPassword = $this->generateSecurePassword();

                $this->userModel->insert([
                    'name'          => sprintf('Admin Pendukung %d %s', $i, $schoolName),
                    'username'      => $supportUsername,
                    'email'         => null,
                    'password_hash' => password_hash($supportPassword, PASSWORD_BCRYPT),
                    'role'          => UserModel::ROLE_ADMIN_SEKOLAH,
                    'is_primary'    => false,
                    'election_id'   => $electionId,
                ]);

                $generatedAccounts[] = [
                    'role'           => UserModel::ROLE_ADMIN_SEKOLAH,
                    'is_primary'     => false,
                    'name'           => sprintf('Admin Pendukung %d %s', $i, $schoolName),
                    'username'       => $supportUsername,
                    'plain_password' => $supportPassword,
                ];
            }

            // Transition status to SETUP
            $this->electionModel->update($electionId, [
                'status' => ElectionStateService::STATUS_SETUP,
            ]);

            $this->auditLogService->log(
                $superAdminId,
                sprintf('SUPER_ADMIN_APPROVE_REGISTRATION: ID %d (%s)', $electionId, $schoolName),
                $ipAddress
            );

            if ($db->transStatus() === false) {
                $db->transRollback();
                throw new DatabaseException('Gagal menyetujui sekolah dan membuat 5 akun panitia.');
            }

            $db->transCommit();

            /** @var array<string, mixed> $updatedElection */
            $updatedElection = $this->electionModel->find($electionId);

            return [
                'election' => $updatedElection,
                'accounts' => $generatedAccounts,
            ];
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }

    /**
     * Replace school admin passwords and return the credentials once.
     *
     * @return array{school_name: string, accounts: list<array<string, mixed>>}
     */
    public function reissueCredentials(int $electionId, ?int $superAdminId, ?string $ipAddress): array
    {
        $election = $this->electionModel->find($electionId);
        if ($election === null || in_array($election['status'], [ElectionStateService::STATUS_READY, ElectionStateService::STATUS_PENDING], true)) {
            throw new RuntimeException('Kredensial hanya dapat diterbitkan ulang untuk sekolah yang sudah disetujui.');
        }

        $db = $this->electionModel->db;
        $db->transBegin();
        try {
            $userModel = new UserModel();
            $users = $userModel->where('election_id', $electionId)
                ->where('role', UserModel::ROLE_ADMIN_SEKOLAH)
                ->orderBy('is_primary', 'DESC')
                ->orderBy('id', 'ASC')
                ->findAll();

            if (count($users) !== 5) {
                throw new RuntimeException('Akun admin sekolah tidak lengkap; kredensial tidak diubah.');
            }

            $accounts = [];
            foreach ($users as $user) {
                $password = $this->generateSecurePassword();
                $userModel->update((int) $user['id'], [
                    'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                ]);
                $accounts[] = [
                    'role'           => UserModel::ROLE_ADMIN_SEKOLAH,
                    'is_primary'     => in_array(strtolower(trim((string) ($user['is_primary'] ?? ''))), ['1', 't', 'true', 'yes', 'on'], true),
                    'name'           => $user['name'],
                    'username'       => $user['username'],
                    'plain_password' => $password,
                ];
            }

            $this->auditLogService->log(
                $superAdminId,
                sprintf('SUPER_ADMIN_REISSUE_CREDENTIALS: election %d (%s)', $electionId, $election['school_name']),
                $ipAddress
            );
            if ($db->transStatus() === false) {
                throw new DatabaseException('Gagal menerbitkan ulang kredensial sekolah.');
            }
            $db->transCommit();

            return ['school_name' => (string) $election['school_name'], 'accounts' => $accounts];
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }
    /**
     * Get macro progress percentage of election phases (Zero voting data exposed).
     *
     * @return array<string, mixed>
     */
    public function getProgress(): array
    {
        $election = $this->electionModel->getActiveSession();

        if ($election === null) {
            return [
                'status'     => ElectionStateService::STATUS_READY,
                'percentage' => 0,
                'phase_name' => 'Belum ada sesi pemilu aktif',
            ];
        }

        $percentageMap = [
            ElectionStateService::STATUS_READY     => ['percentage' => 0,   'phase' => 'Sistem Kosong & Siap'],
            ElectionStateService::STATUS_PENDING   => ['percentage' => 15,  'phase' => 'Pendaftaran Sekolah Masuk'],
            ElectionStateService::STATUS_SETUP     => ['percentage' => 30,  'phase' => 'Persiapan DPT & Paslon'],
            ElectionStateService::STATUS_ACTIVE    => ['percentage' => 60,  'phase' => 'Pemungutan Suara Berlangsung'],
            ElectionStateService::STATUS_CLOSED    => ['percentage' => 80,  'phase' => 'Pemungutan Suara Selesai'],
            ElectionStateService::STATUS_FINALIZED => ['percentage' => 90,  'phase' => 'Hasil Pemilihan Dikunci'],
            ElectionStateService::STATUS_PUBLISHED => ['percentage' => 100, 'phase' => 'Hasil Resmi Dipublikasikan'],
            ElectionStateService::STATUS_CLEANUP   => ['percentage' => 0,   'phase' => 'Proses Pembersihan Data'],
        ];

        $status = (string) $election['status'];
        $meta   = $percentageMap[$status] ?? ['percentage' => 0, 'phase' => $status];

        return [
            'election_id'          => $election['id'],
            'status'               => $status,
            'phase_name'           => $meta['phase'],
            'percentage'           => $meta['percentage'],
            'school_name'          => $election['school_name'] ?? null,
            'is_registration_open' => (bool) ($election['is_registration_open'] ?? false),
            'dpt_locked'           => ! empty($election['dpt_locked_at']),
            'candidates_locked'    => ! empty($election['candidates_locked_at']),
            'report_downloaded'    => ! empty($election['report_downloaded_at']),
        ];
    }

    /**
     * Clean up all operational tables and reset election to READY.
     *
     * @return array<string, mixed>
     */
    public function cleanup(string $confirmationCode, ?int $superAdminId, ?string $ipAddress): array
    {
        $election = $this->electionModel->getActiveSession();

        if ($election === null) {
            throw new RuntimeException('Sesi pemilu tidak ditemukan.');
        }

        if ($election['status'] !== ElectionStateService::STATUS_PUBLISHED) {
            throw new RuntimeException(
                sprintf('Cleanup hanya dapat dieksekusi saat status PUBLISHED. Status saat ini: %s.', $election['status'])
            );
        }

        if (empty($election['report_downloaded_at'])) {
            throw new RuntimeException('Laporan resmi pemilu belum diunduh oleh panitia sekolah. Cleanup ditolak.');
        }

        if (trim($confirmationCode) !== 'HAPUS DATA') {
            throw new RuntimeException('Konfirmasi tidak valid. Anda wajib mengetik "HAPUS DATA" dengan persis.');
        }

        $db = $this->electionModel->db;
        $db->transBegin();

        try {
            // Delete ballots
            (new BallotModel())->emptyTable();

            // Delete tokens
            (new VotingTokenModel())->emptyTable();

            // Delete voters
            (new VoterModel())->emptyTable();

            // Delete candidates
            (new CandidateModel())->emptyTable();

            // Delete school admin users
            $this->userModel->where('role', UserModel::ROLE_ADMIN_SEKOLAH)->delete();

            // Reset election row to READY
            $this->electionModel->update($election['id'], [
                'status'               => ElectionStateService::STATUS_READY,
                'is_registration_open' => false,
                'school_name'          => null,
                'npsn'                 => null,
                'contact_name'         => null,
                'contact_phone'        => null,
                'contact_email'        => null,
                'start_time'           => null,
                'end_time'             => null,
                'dpt_locked_at'        => null,
                'candidates_locked_at' => null,
                'report_downloaded_at' => null,
            ]);

            $this->auditLogService->log(
                $superAdminId,
                'SUPER_ADMIN_CLEANUP: Seluruh data operasional pemilu berhasil dibersihkan dan status direset ke READY.',
                $ipAddress
            );

            if ($db->transStatus() === false) {
                $db->transRollback();
                throw new DatabaseException('Gagal mengeksekusi operasi cleanup pada level basis data.');
            }

            $db->transCommit();

            /** @var array<string, mixed> $resetElection */
            $resetElection = $this->electionModel->find($election['id']);

            return $resetElection;
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }

    /**
     * Generate secure random password for school admin accounts.
     */
    private function generateSecurePassword(): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
        $maxIndex = strlen($chars) - 1;
        $password = '';

        for ($i = 0; $i < 10; $i++) {
            $password .= $chars[random_int(0, $maxIndex)];
        }

        return $password;
    }
}
