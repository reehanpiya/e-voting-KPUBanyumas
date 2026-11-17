<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ElectionModel;
use App\Models\VoterModel;
use CodeIgniter\I18n\Time;
use DateTime;
use Exception;
use RuntimeException;

class VoterService
{
    protected VoterModel $voterModel;
    protected ElectionModel $electionModel;

    public function __construct()
    {
        $this->voterModel    = new VoterModel();
        $this->electionModel = new ElectionModel();
    }

    /**
     * Mendapatkan sesi pemilu aktif saat ini
     */
    protected function getActiveElection(): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif.');
        }
        return $election;
    }

    /**
     * Mengambil daftar DPT dengan pagination dan filter
     */
    public function getVoters(int $page = 1, int $perPage = 50, ?string $search = null): array
    {
        $election = $this->getActiveElection();
        $builder  = $this->voterModel->where('election_id', $election['id']);

        if ($search !== null && trim($search) !== '') {
            $builder->groupStart()
                ->like('nisn', $search)
                ->orLike('name', $search)
                ->orLike('class', $search)
                ->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $data  = $builder->orderBy('class', 'ASC')
            ->orderBy('name', 'ASC')
            ->paginate($perPage, 'default', $page);

        return [
            'election' => [
                'id'            => $election['id'],
                'status'        => $election['status'],
                'dpt_locked_at' => $election['dpt_locked_at'],
                'is_locked'     => ! empty($election['dpt_locked_at']),
            ],
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int) ceil($total / $perPage),
            'voters'      => $data,
        ];
    }

    /**
     * Parsing dan validasi file CSV DPT
     * Format kolom CSV: nisn,nama,kelas,tanggal_lahir (DDMMYYYY)
     */
    public function importFromCsv(string $filePath): array
    {
        $election = $this->getActiveElection();

        // 1. Validasi Status Pemilu & Penguncian DPT
        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Impor DPT hanya dapat dilakukan saat status pemilu SETUP.');
        }

        if (! empty($election['dpt_locked_at'])) {
            throw new RuntimeException('DPT sudah dikunci (read-only) dan tidak dapat diubah lagi.');
        }

        if (! file_exists($filePath) || ! is_readable($filePath)) {
            throw new RuntimeException('File CSV tidak ditemukan atau tidak dapat dibaca.');
        }

        $file = fopen($filePath, 'r');
        if (! $file) {
            throw new RuntimeException('Gagal membuka file CSV.');
        }

        $rowNumber    = 0;
        $validRows    = [];
        $errors       = [];
        $nisnMapInCsv = [];

        // 2. Baca baris per baris
        while (($line = fgetcsv($file, 1000, ',')) !== false) {
            $rowNumber++;

            // Abaikan baris kosong
            if (empty(array_filter($line))) {
                continue;
            }

            // Abaikan header jika ada
            if ($rowNumber === 1 && (strtolower(trim($line[0])) === 'nisn' || strtolower(trim($line[0])) === '"nisn"')) {
                continue;
            }

            if (count($line) < 4) {
                $errors[] = [
                    'row'   => $rowNumber,
                    'error' => 'Jumlah kolom kurang dari 4 (wajib: NISN, Nama, Kelas, Tanggal Lahir).',
                ];
                continue;
            }

            $nisn      = trim($line[0]);
            $name      = trim($line[1]);
            $class     = trim($line[2]);
            $birthDate = trim($line[3]);

            $rowErrors = [];

            // Validasi NISN (harus digit dan tidak kosong)
            if ($nisn === '') {
                $rowErrors[] = 'NISN tidak boleh kosong.';
            } elseif (! ctype_digit($nisn)) {
                $rowErrors[] = 'NISN harus berupa angka.';
            }

            // Deteksi duplikasi di dalam file CSV itu sendiri
            if (isset($nisnMapInCsv[$nisn])) {
                $rowErrors[] = "Duplikasi NISN {$nisn} terdeteksi di dalam file (baris {$nisnMapInCsv[$nisn]} dan {$rowNumber}).";
            } else {
                $nisnMapInCsv[$nisn] = $rowNumber;
            }

            // Validasi Nama
            if ($name === '') {
                $rowErrors[] = 'Nama pemilih tidak boleh kosong.';
            }

            // Validasi Kelas
            if ($class === '') {
                $rowErrors[] = 'Kelas tidak boleh kosong.';
            }

            // Validasi Tanggal Lahir (Format DDMMYYYY atau DD-MM-YYYY atau DD/MM/YYYY)
            $parsedDate = $this->parseBirthDate($birthDate);
            if ($parsedDate === null) {
                $rowErrors[] = "Format tanggal lahir '{$birthDate}' tidak valid (wajib DDMMYYYY atau DD/MM/YYYY).";
            }

            if (! empty($rowErrors)) {
                $errors[] = [
                    'row'    => $rowNumber,
                    'nisn'   => $nisn,
                    'errors' => $rowErrors,
                ];
            } else {
                $validRows[] = [
                    'election_id' => $election['id'],
                    'nisn'        => $nisn,
                    'name'        => $name,
                    'class'       => $class,
                    'birth_date'  => $parsedDate,
                    'has_voted'   => false,
                    'created_at'  => Time::now()->toDateTimeString(),
                    'updated_at'  => Time::now()->toDateTimeString(),
                ];
            }
        }

        fclose($file);

        // Jika ada baris yang rusak, tolak seluruh import (Fail-Fast)
        if (! empty($errors)) {
            return [
                'success'      => false,
                'total_rows'   => $rowNumber,
                'failed_count' => count($errors),
                'errors'       => $errors,
            ];
        }

        if (empty($validRows)) {
            throw new RuntimeException('File CSV tidak memuat data pemilih yang dapat diproses.');
        }

        // 3. Simpan ke database dalam Transaksi DB
        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            // Hapus DPT lama pada sesi ini jika belum dikunci untuk re-import bersih
            $this->voterModel->where('election_id', $election['id'])->delete();

            // Insert batch untuk ribuan baris dengan cepat
            $this->voterModel->insertBatch($validRows);

            $db->transCommit();
        } catch (Exception $e) {
            $db->transRollback();
            throw new RuntimeException('Gagal menyimpan data DPT ke database: ' . $e->getMessage());
        }

        return [
            'success'      => true,
            'imported'     => count($validRows),
            'total_rows'   => $rowNumber,
        ];
    }

    /**
     * Kunci DPT menjadi Read-Only
     */
    public function lockVoters(): array
    {
        $election = $this->getActiveElection();

        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Penguncian DPT hanya dapat dilakukan saat status pemilu SETUP.');
        }

        if (! empty($election['dpt_locked_at'])) {
            throw new RuntimeException('DPT sudah dikunci sebelumnya pada ' . $election['dpt_locked_at']);
        }

        $voterCount = $this->voterModel->where('election_id', $election['id'])->countAllResults();
        if ($voterCount === 0) {
            throw new RuntimeException('DPT tidak dapat dikunci karena belum ada data pemilih yang diimpor.');
        }

        $lockTime = Time::now()->toDateTimeString();
        $this->electionModel->update($election['id'], [
            'dpt_locked_at' => $lockTime,
        ]);

        return [
            'election_id'   => $election['id'],
            'total_voters'  => $voterCount,
            'dpt_locked_at' => $lockTime,
        ];
    }

    /**
     * Parser tanggal lahir fleksibel (DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
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

        // Format Standar YYYY-MM-DD
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
