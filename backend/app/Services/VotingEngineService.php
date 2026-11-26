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
        $candidates = $this->candidateModel->orderBy('number', 'ASC')->findAll();

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

        // Pastikan kandidat yang dipilih valid pada sesi pemilu ini.
    $candidate = $this->candidateModel
        ->where('id', $candidateId)
        ->first();

    if (! $candidate) {
        throw new RuntimeException('Pilihan pasangan calon tidak valid pada sesi pemilihan ini.');
    }

    $db = Database::connect();
    $db->transBegin();

    try {
        // SQLite tidak mendukung SELECT ... FOR UPDATE.
        // PostgreSQL tetap menggunakan pessimistic locking.
        $lockClause = $db->DBDriver === 'Postgre' ? ' FOR UPDATE' : '';

        // 1. Ambil dan kunci token.
        $tokenQuery = $db->query(
            'SELECT id, voter_id, status FROM voting_tokens WHERE token = ?' . $lockClause,
            [$token]
        );

        $tokenRow = $tokenQuery->getRowArray();

        if (! $tokenRow) {
            throw new RuntimeException('Token tidak ditemukan di sistem.');
        }

        if ($tokenRow['status'] !== 'unused') {
            throw new RuntimeException('Token ini sudah pernah digunakan untuk mencoblos. Suara ditolak.');
        }

        // 2. Ambil dan kunci data pemilih.
        $voterId = (int) $tokenRow['voter_id'];

        $voterQuery = $db->query(
            'SELECT id, has_voted FROM voters WHERE id = ?' . $lockClause,
            [$voterId]
        );

        $voterRow = $voterQuery->getRowArray();

        if (! $voterRow) {
            throw new RuntimeException('Data pemilih terkait token tidak valid.');
        }

        if ($this->isVoted($voterRow['has_voted'])) {
            throw new RuntimeException('Pemilih ini telah tercatat memberikan suara sebelumnya.');
        }

        $nowTime   = Time::now()->toDateTimeString();
        $todayDate = Time::now()->toDateString();

        // 3. Tandai token telah digunakan.
        $db->query(
            'UPDATE voting_tokens SET status = ?, updated_at = ? WHERE id = ?',
            [
                'used',
                $nowTime,
                $tokenRow['id'],
            ]
        );

        // 4. Tandai pemilih telah memberikan suara.
        $db->query(
            'UPDATE voters SET has_voted = ?, voted_at = ?, updated_at = ? WHERE id = ?',
            [
                true,
                $todayDate,
                $nowTime,
                $voterId,
            ]
        );

        // 5. Buat UUID v4 menggunakan PHP.
        // Tidak ada voter_id, token_id, maupun timestamp dalam ballot.
        $uuidBytes = random_bytes(16);

        $uuidBytes[6] = chr((ord($uuidBytes[6]) & 0x0f) | 0x40);
        $uuidBytes[8] = chr((ord($uuidBytes[8]) & 0x3f) | 0x80);

        $uuidHex = bin2hex($uuidBytes);

        $ballotId = sprintf(
            '%s-%s-%s-%s-%s',
            substr($uuidHex, 0, 8),
            substr($uuidHex, 8, 4),
            substr($uuidHex, 12, 4),
            substr($uuidHex, 16, 4),
            substr($uuidHex, 20, 12),
        );

        // 6. Simpan surat suara anonim.
        $db->table('ballots')->insert([
            'id'           => $ballotId,
            'candidate_id' => $candidateId,
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

