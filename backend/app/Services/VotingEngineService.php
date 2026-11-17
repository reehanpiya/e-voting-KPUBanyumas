<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CandidateModel;
use App\Models\ElectionModel;
use CodeIgniter\I18n\Time;
use Config\Database;
use RuntimeException;
use Throwable;

class VotingEngineService
{
    protected ElectionModel $electionModel;
    protected CandidateModel $candidateModel;

    public function __construct()
    {
        $this->electionModel  = new ElectionModel();
        $this->candidateModel = new CandidateModel();
    }

    /**
     * Normalisasi input kode token dari bilik (trim, uppercase, standarisasi prefix TKN-)
     */
    public function normalizeToken(string $input): string
    {
        $clean = strtoupper(trim($input));
        if (! str_starts_with($clean, 'TKN-')) {
            $clean = 'TKN-' . $clean;
        }
        return $clean;
    }

    /**
     * Validasi status token di bilik suara laptop
     * Mengembalikan status validitas serta daftar paslon jika token siap digunakan
     */
    public function validateToken(string $rawToken): array
    {
        $token = $this->normalizeToken($rawToken);

        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif saat ini.');
        }

        if ($election['status'] !== 'ACTIVE') {
            throw new RuntimeException('Bilik suara ditutup. Pemungutan suara hanya dapat dilakukan saat status ACTIVE.');
        }

        $db    = Database::connect();
        $tokenRow = $db->table('voting_tokens')
            ->where('token', $token)
            ->get()
            ->getRowArray();

        if (! $tokenRow) {
            throw new RuntimeException('Kode token atau QR Code bilik suara tidak valid.');
        }

        if ($tokenRow['status'] !== 'unused') {
            throw new RuntimeException('Token ini sudah digunakan dan tidak berlaku lagi.');
        }

        // Ambil data paslon yang aktif untuk ditampilkan di bilik suara
        $candidates = $this->candidateModel->getByElection((int) $election['id']);

        return [
            'token'      => $token,
            'status'     => 'unused',
            'is_valid'   => true,
            'candidates' => array_map(static fn ($c) => [
                'id'        => (int) $c['id'],
                'number'    => (int) $c['number'],
                'name'      => $c['name'],
                'photo_url' => $c['photo_url'],
                'vision'    => $c['vision'],
                'mission'   => $c['mission'],
                'program'   => $c['program'],
            ], $candidates),
        ];
    }

    /**
     * Eksekusi pencoblosan suara dengan Database Transaction ketat & Pessimistic Locking
     * Mencegah race condition (double vote) & menjamin kerahasiaan suara (Zero-Knowledge)
     */
    public function castVote(string $rawToken, int $candidateId): array
    {
        $token = $this->normalizeToken($rawToken);

        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif saat ini.');
        }

        if ($election['status'] !== 'ACTIVE') {
            throw new RuntimeException('Pemungutan suara ditolak karena status pemilu bukan ACTIVE.');
        }

        // Pastikan kandidat yang dipilih valid pada sesi pemilu ini
        $candidate = $this->candidateModel
            ->where('election_id', $election['id'])
            ->where('id', $candidateId)
            ->first();

        if (! $candidate) {
            throw new RuntimeException('Pilihan pasangan calon tidak valid pada sesi pemilihan ini.');
        }

        $db = Database::connect();
        $db->transBegin();

        try {
            // 1. KUNCI baris token dengan SELECT ... FOR UPDATE (Pessimistic Lock)
            $tokenQuery = $db->query('SELECT id, voter_id, status FROM voting_tokens WHERE token = ? FOR UPDATE', [$token]);
            $tokenRow   = $tokenQuery->getRowArray();

            if (! $tokenRow) {
                throw new RuntimeException('Token tidak ditemukan di sistem.');
            }

            if ($tokenRow['status'] !== 'unused') {
                throw new RuntimeException('Token ini sudah pernah digunakan untuk mencoblos. Suara ditolak.');
            }

            // 2. Kunci dan periksa baris pemilih terkait
            $voterId    = (int) $tokenRow['voter_id'];
            $voterQuery = $db->query('SELECT id, has_voted FROM voters WHERE id = ? FOR UPDATE', [$voterId]);
            $voterRow   = $voterQuery->getRowArray();

            if (! $voterRow) {
                throw new RuntimeException('Data pemilih terkait token tidak valid.');
            }

            if ($this->isVoted($voterRow['has_voted'])) {
                throw new RuntimeException('Pemilih ini telah tercatat memberikan suara sebelumnya.');
            }

            $nowTime   = Time::now()->toDateTimeString();
            $todayDate = Time::now()->toDateString();

            // 3. Ubah status token menjadi 'used'
            $db->query('UPDATE voting_tokens SET status = ?, updated_at = ? WHERE id = ?', [
                'used',
                $nowTime,
                $tokenRow['id'],
            ]);

            // 4. Tandai pemilih telah berpartisipasi (has_voted = true)
            $db->query('UPDATE voters SET has_voted = true, voted_at = ?, updated_at = ? WHERE id = ?', [
                $todayDate,
                $nowTime,
                $voterId,
            ]);

            // 5. Masukkan surat suara anonim (Zero-Knowledge Ballots)
            // Mutlak tanpa voter_id, tanpa token_id, tanpa timestamp presisi
            $db->query('INSERT INTO ballots (id, candidate_id) VALUES (gen_random_uuid(), ?)', [
                $candidateId,
            ]);

            $db->transCommit();

            return [
                'voted'   => true,
                'message' => 'Suara berhasil dicatat secara sah dan rahasia.',
            ];
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }

    /**
     * Konversi boolean PostgreSQL ('t'/'f', true/false, 1/0)
     */
    private function isVoted(mixed $val): bool
    {
        if (is_bool($val)) {
            return $val;
        }
        if (is_string($val)) {
            return in_array(strtolower(trim($val)), ['t', 'true', '1'], true);
        }
        if (is_int($val)) {
            return $val === 1;
        }
        return false;
    }
}

