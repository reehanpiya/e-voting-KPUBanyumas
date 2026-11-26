<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CandidateModel;
use App\Models\ElectionModel;
use CodeIgniter\Files\File;
use CodeIgniter\HTTP\Files\UploadedFile;
use CodeIgniter\I18n\Time;
use RuntimeException;

class CandidateService
{
    protected CandidateModel $candidateModel;
    protected ElectionModel $electionModel;

    public function __construct()
    {
        $this->candidateModel = new CandidateModel();
        $this->electionModel  = new ElectionModel();
    }

    /**
     * Mendapatkan sesi pemilu aktif
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
     * Mengambil seluruh daftar kandidat
     */
    public function getAll(): array
    {
        $election   = $this->getActiveElection();
        $candidates = $this->candidateModel->orderBy('number', 'ASC')->findAll();

        return [
            'election' => [
                'id'                   => $election['id'],
                'candidates_locked_at' => $election['candidates_locked_at'],
                'is_locked'            => ! empty($election['candidates_locked_at']),
            ],
            'candidates' => $candidates,
        ];
    }

    /**
     * Mendapatkan detail kandidat berdasarkan ID
     */
    public function getById(int $id): array
    {
        $election  = $this->getActiveElection();
        $candidate = $this->candidateModel
            ->where('id', $id)
            ->first();

        if (! $candidate) {
            throw new RuntimeException('Kandidat tidak ditemukan.');
        }

        return $candidate;
    }

    /**
     * Menambah kandidat baru
     */
    public function create(array $data, ?UploadedFile $photoFile = null): array
    {
        $election = $this->getActiveElection();

        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Data kandidat hanya dapat diubah saat status pemilu SETUP.');
        }

        if (! empty($election['candidates_locked_at'])) {
            throw new RuntimeException('Data kandidat sudah dikunci (read-only) dan tidak dapat ditambah.');
        }

        // Cek duplikasi nomor urut
        $existing = $this->candidateModel
            ->where('number', (int) $data['number'])
            ->first();

        if ($existing) {
            throw new RuntimeException("Nomor urut {$data['number']} sudah digunakan oleh kandidat lain.");
        }

        $photoUrl = null;
        if ($photoFile && $photoFile->isValid() && ! $photoFile->hasMoved()) {
            $photoUrl = $this->handlePhotoUpload($photoFile);
        }

        $candidateId = $this->candidateModel->insert([
            'number'      => (int) $data['number'],
            'name'        => trim($data['name']),
            'photo_url'   => $photoUrl,
            'vision'      => $data['vision'] ?? null,
            'mission'     => $data['mission'] ?? null,
            'program'     => $data['program'] ?? null,
        ]);

        return $this->getById((int) $candidateId);
    }

    /**
     * Mengubah data kandidat
     */
    public function update(int $id, array $data, ?UploadedFile $photoFile = null): array
    {
        $election  = $this->getActiveElection();
        $candidate = $this->getById($id);

        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Data kandidat hanya dapat diubah saat status pemilu SETUP.');
        }

        if (! empty($election['candidates_locked_at'])) {
            throw new RuntimeException('Data kandidat sudah dikunci (read-only) dan tidak dapat diubah.');
        }

        // Cek duplikasi nomor urut jika nomor diubah
        if (isset($data['number']) && (int) $data['number'] !== (int) $candidate['number']) {
            $existing = $this->candidateModel
                ->where('number', (int) $data['number'])
                ->where('id !=', $id)
                ->first();

            if ($existing) {
                throw new RuntimeException("Nomor urut {$data['number']} sudah digunakan oleh kandidat lain.");
            }
        }

        $updateData = [];
        if (isset($data['number'])) {
            $updateData['number'] = (int) $data['number'];
        }
        if (isset($data['name'])) {
            $updateData['name'] = trim($data['name']);
        }
        if (array_key_exists('vision', $data)) {
            $updateData['vision'] = $data['vision'];
        }
        if (array_key_exists('mission', $data)) {
            $updateData['mission'] = $data['mission'];
        }
        if (array_key_exists('program', $data)) {
            $updateData['program'] = $data['program'];
        }

        if ($photoFile && $photoFile->isValid() && ! $photoFile->hasMoved()) {
            $updateData['photo_url'] = $this->handlePhotoUpload($photoFile);
        }

        if (! empty($updateData)) {
            $this->candidateModel->update($id, $updateData);
        }

        return $this->getById($id);
    }

    /**
     * Menghapus kandidat
     */
    public function delete(int $id): bool
    {
        $election  = $this->getActiveElection();
        $candidate = $this->getById($id);

        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Data kandidat hanya dapat dihapus saat status pemilu SETUP.');
        }

        if (! empty($election['candidates_locked_at'])) {
            throw new RuntimeException('Data kandidat sudah dikunci (read-only) dan tidak dapat dihapus.');
        }

        return (bool) $this->candidateModel->delete($id);
    }

    /**
     * Kunci kandidat menjadi Read-Only
     */
    public function lockCandidates(): array
    {
        $election = $this->getActiveElection();

        if ($election['status'] !== 'SETUP') {
            throw new RuntimeException('Penguncian kandidat hanya dapat dilakukan saat status pemilu SETUP.');
        }

        if (! empty($election['candidates_locked_at'])) {
            throw new RuntimeException('Data kandidat sudah dikunci sebelumnya pada ' . $election['candidates_locked_at']);
        }

        $candidatesCount = $this->candidateModel->countAllResults();
        if ($candidatesCount === 0) {
            throw new RuntimeException('Kandidat tidak dapat dikunci karena belum ada pasangan calon yang terdaftar.');
        }

        $lockTime = Time::now()->toDateTimeString();
        $this->electionModel->update($election['id'], [
            'candidates_locked_at' => $lockTime,
        ]);

        return [
            'total_candidates'     => $candidatesCount,
            'candidates_locked_at' => $lockTime,
        ];
    }

    /**
     * Proses penyimpanan dan resize foto kandidat
     */
    protected function handlePhotoUpload(UploadedFile $photoFile): string
    {
        if ($photoFile->getSizeByUnit('mb') > 1.0) {
            throw new RuntimeException('Ukuran file foto melebihi batas maksimal 1MB.');
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (! in_array($photoFile->getMimeType(), $allowedTypes, true)) {
            throw new RuntimeException('Format file foto tidak didukung. Harap unggah format JPG, PNG, atau WEBP.');
        }

        $targetDir = FCPATH . 'uploads/candidates/';
        if (! is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $fileName = $photoFile->getRandomName();
        $photoFile->move($targetDir, $fileName);

        // Resize / fit ke 500x500px menggunakan image service CodeIgniter jika ekstensi GD aktif
        try {
            $imageService = \Config\Services::image();
            $imageService->withFile($targetDir . $fileName)
                ->fit(500, 500, 'center')
                ->save($targetDir . $fileName);
        } catch (\Throwable $e) {
            // Jika GD tidak aktif, biarkan file asli tersimpan
        }

        return base_url('uploads/candidates/' . $fileName);
    }
}
