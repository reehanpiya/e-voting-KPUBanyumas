<?php

declare(strict_types=1);

namespace App\Controllers\Api\School;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\CandidateService;
use App\Services\AuthContext;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class CandidateController extends BaseController
{
    protected CandidateService $candidateService;

    public function __construct()
    {
        $this->candidateService = new CandidateService();
    }

    /**
     * GET /api/school/candidates
     * Mengambil seluruh kandidat
     */
    public function index(): ResponseInterface
    {
        try {
            $result = $this->candidateService->getAll();
            if (AuthContext::getRole() !== 'admin_sekolah') {
                unset($result['election']);
            }
            return ApiResponse::success('Daftar kandidat berhasil dimuat.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * GET /api/school/candidates/{id}
     * Detail kandidat
     */
    /** GET /api/school/candidates/manage (admin only) */
    public function manage(): ResponseInterface
    {
        try {
            $result = $this->candidateService->getAll();
            return ApiResponse::success('Daftar kandidat berhasil dimuat.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
    public function show(int $id): ResponseInterface
    {
        try {
            $candidate = $this->candidateService->getById($id);
            return ApiResponse::success('Detail kandidat berhasil dimuat.', $candidate);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/school/candidates
     * Tambah kandidat baru
     */
    public function create(): ResponseInterface
    {
        try {
            $rules = [
                'number' => 'required|is_natural_no_zero',
                'name'   => 'required|min_length[3]|max_length[150]',
            ];

            if (! $this->validate($rules)) {
                return ApiResponse::fail('Validasi input kandidat gagal.', $this->validator->getErrors());
            }

            $photoFile = $this->request->getFile('photo');
            $data      = [
                'number'  => (int) $this->request->getVar('number'),
                'name'    => (string) $this->request->getVar('name'),
                'vision'  => $this->request->getVar('vision'),
                'mission' => $this->request->getVar('mission'),
                'program' => $this->request->getVar('program'),
            ];

            $result = $this->candidateService->create($data, $photoFile);

            return ApiResponse::success('Kandidat berhasil ditambahkan.', $result, 201);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * PUT/POST /api/school/candidates/{id}
     * Ubah kandidat
     */
    public function update(int $id): ResponseInterface
    {
        try {
            $data = [];

            $number = $this->request->getVar('number');
            if ($number !== null) {
                $data['number'] = (int) $number;
            }

            $name = $this->request->getVar('name');
            if ($name !== null) {
                $data['name'] = (string) $name;
            }

            if ($this->request->getVar('vision') !== null) {
                $data['vision'] = $this->request->getVar('vision');
            }
            if ($this->request->getVar('mission') !== null) {
                $data['mission'] = $this->request->getVar('mission');
            }
            if ($this->request->getVar('program') !== null) {
                $data['program'] = $this->request->getVar('program');
            }

            $photoFile = $this->request->getFile('photo');

            $result = $this->candidateService->update($id, $data, $photoFile);

            return ApiResponse::success('Data kandidat berhasil diperbarui.', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * DELETE /api/school/candidates/{id}
     * Hapus kandidat
     */
    public function delete(int $id): ResponseInterface
    {
        try {
            $this->candidateService->delete($id);
            return ApiResponse::success('Kandidat berhasil dihapus.');
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/school/candidates/lock
     * Mengunci kandidat agar read-only
     */
    public function lock(): ResponseInterface
    {
        try {
            $result = $this->candidateService->lockCandidates();
            return ApiResponse::success('Data kandidat berhasil dikunci (read-only).', $result);
        } catch (Throwable $e) {
            return ApiResponse::error($e->getMessage(), 400);
        }
    }
}
