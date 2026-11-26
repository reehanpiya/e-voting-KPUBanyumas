<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ElectionModel;
use App\Models\VoterModel;
use App\Models\VotingTokenModel;
use CodeIgniter\I18n\Time;
use RuntimeException;

class VoterVerificationService
{
    protected ElectionModel $electionModel;
    protected VoterModel $voterModel;
    protected VotingTokenModel $tokenModel;

    // Kumpulan karakter alfanumerik aman (mengecualikan 0, O, 1, I untuk mencegah ambiguitas visual)
    private const SAFE_CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    public function __construct()
    {
        $this->electionModel = new ElectionModel();
        $this->voterModel    = new VoterModel();
        $this->tokenModel    = new VotingTokenModel();
    }

    /**
     * Cek DPT Publik (NISN + Tanggal Lahir)
     * Pesan kegagalan diseragamkan untuk mencegah NISN enumeration / timing attack
     */
    public function checkDpt(string $nisn, string $rawBirthDate): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif saat ini.');
        }

        $formattedDob = $this->parseBirthDate($rawBirthDate);
        if ($formattedDob === null) {
            throw new RuntimeException('Data pemilih tidak ditemukan atau tanggal lahir salah.');
        }

        $voter = $this->voterModel
            ->where('nisn', trim($nisn))
            ->where('birth_date', $formattedDob)
            ->first();

        if (! $voter) {
            throw new RuntimeException('Data pemilih tidak ditemukan atau tanggal lahir salah.');
        }

        return [
            'election' => [
                'school_name' => $election['school_name'] ?? 'Pemilu Sekolah',
            ],
            'voter' => [
                'name'      => $voter['name'],
                'class'     => $voter['class'],
                'has_voted' => $this->isVoted($voter['has_voted']),
            ],
        ];
    }

    /**
     * Verifikasi Mandiri Siswa via Smartphone & Generator Token Bilik Suara
     * Menerapkan prinsip idempotensi & token non-ambigu
     */
    public function verifyAndGenerateToken(string $nisn, string $rawBirthDate): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif saat ini.');
        }

        // Pemungutan suara hanya dapat diverifikasi saat status ACTIVE
        if ($election['status'] !== 'ACTIVE') {
            throw new RuntimeException('Sesi pemungutan suara belum dibuka atau telah berakhir.');
        }

        $formattedDob = $this->parseBirthDate($rawBirthDate);
        if ($formattedDob === null) {
            throw new RuntimeException('Data pemilih tidak valid atau tanggal lahir salah.');
        }

        $voter = $this->voterModel
            ->where('nisn', trim($nisn))
            ->where('birth_date', $formattedDob)
            ->first();

        if (! $voter) {
            throw new RuntimeException('Data pemilih tidak valid atau tanggal lahir salah.');
        }

        // Cek apakah siswa sudah mencoblos (PostgreSQL boolean aware)
        if ($this->isVoted($voter['has_voted'])) {
            throw new RuntimeException('Anda sudah menggunakan hak suara pada pemilihan ini.');
        }

        $voterId = (int) $voter['id'];

        // Cek IDEMPOTENSI: Apakah siswa sudah memiliki token yang belum digunakan (unused)?
        $existingToken = $this->tokenModel
            ->where('voter_id', $voterId)
            ->where('status', 'unused')
            ->orderBy('id', 'DESC')
            ->first();

        if ($existingToken) {
            $tokenFull = $existingToken['token'];
            $codeOnly  = str_replace('TKN-', '', $tokenFull);

            return [
                'token'      => $tokenFull,
                'token_code' => $codeOnly,
                'qr_data'    => $tokenFull,
                'status'     => 'unused',
                'voter'      => [
                    'name'  => $voter['name'],
                    'class' => $voter['class'],
                ],
                'message'    => 'Token aktif berhasil dimuat kembali (idempoten).',
            ];
        }

        // Generate token baru 6 karakter unik tanpa karakter ambigu
        $tokenFull = $this->generateUniqueToken();
        $codeOnly  = str_replace('TKN-', '', $tokenFull);

        $this->tokenModel->insert([
            'token'      => $tokenFull,
            'voter_id'   => $voterId,
            'status'     => 'unused',
            'created_at' => Time::now()->toDateTimeString(),
            'updated_at' => Time::now()->toDateTimeString(),
        ]);

        return [
            'token'      => $tokenFull,
            'token_code' => $codeOnly,
            'qr_data'    => $tokenFull,
            'status'     => 'unused',
            'voter'      => [
                'name'  => $voter['name'],
                'class' => $voter['class'],
            ],
            'message'    => 'Verifikasi berhasil. Silakan tunjukkan QR Code atau Kode Token di bilik suara.',
        ];
    }

    /**
     * Menghasilkan token unik format TKN-XXXXXX
     */
    private function generateUniqueToken(): string
    {
        $maxAttempts = 10;
        $attempt     = 0;
        $chars       = self::SAFE_CHARACTERS;
        $charsLen    = strlen($chars);

        do {
            $attempt++;
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $chars[random_int(0, $charsLen - 1)];
            }

            $fullToken = 'TKN-' . $code;

            // Cek collision di database
            $exists = $this->tokenModel->where('token', $fullToken)->first();
            if (! $exists) {
                return $fullToken;
            }
        } while ($attempt < $maxAttempts);

        throw new RuntimeException('Gagal menghasilkan token unik. Silakan coba kembali.');
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

    /**
     * Parser tanggal lahir (DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
     */
    private function parseBirthDate(string $raw): ?string
    {
        $clean = trim($raw);

        // Format DDMMYYYY (misal: 17082006)
        if (preg_match('/^(\d{2})(\d{2})(\d{4})$/', $clean, $m)) {
            $day   = (int) $m[1];
            $month = (int) $m[2];
            $year  = (int) $m[3];
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        // Format DD/MM/YYYY atau DD-MM-YYYY
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $clean, $m)) {
            $day   = (int) $m[1];
            $month = (int) $m[2];
            $year  = (int) $m[3];
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        // Format YYYY-MM-DD
        if (preg_match('/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/', $clean, $m)) {
            $year  = (int) $m[1];
            $month = (int) $m[2];
            $day   = (int) $m[3];
            if (checkdate($month, $day, $year)) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        return null;
    }
}
