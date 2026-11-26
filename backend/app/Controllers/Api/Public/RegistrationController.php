<?php

declare(strict_types=1);

namespace App\Controllers\Api\Public;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use App\Services\SchoolRegistrationService;
use CodeIgniter\HTTP\ResponseInterface;
use RuntimeException;
use Throwable;

final class RegistrationController extends BaseController
{
    private SchoolRegistrationService $registrations;

    public function __construct(?SchoolRegistrationService $registrations = null)
    {
        $this->registrations = $registrations ?? new SchoolRegistrationService();
    }

    public function config(): ResponseInterface
    {
        return ApiResponse::success('Status penerimaan pendaftaran dimuat.', $this->registrations->getPublicConfig());
    }

    public function submit(): ResponseInterface
    {
        $rules = [
            'school_name'   => 'required|min_length[5]|max_length[255]',
            'npsn'          => 'required|exact_length[8]|numeric',
            'contact_name'  => 'required|min_length[3]|max_length[255]',
            'contact_phone' => 'required|min_length[8]|max_length[50]',
            'contact_email' => 'required|valid_email|max_length[255]',
        ];
        if (! $this->validate($rules)) {
            return ApiResponse::fail('Data pendaftaran sekolah belum valid.', $this->validator->getErrors());
        }

        try {
            $input = [];
            foreach (array_keys($rules) as $key) $input[$key] = (string) $this->request->getVar($key);
            return ApiResponse::success('Pengajuan sekolah berhasil dikirim.', $this->registrations->submit($input), 201);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            return ApiResponse::error('Pengajuan sekolah gagal disimpan.', 500);
        }
    }

    public function check(string $identifier): ResponseInterface
    {
        $result = $this->registrations->findPublicStatus($identifier);
        return $result === null
            ? ApiResponse::notFound('Pengajuan sekolah tidak ditemukan.')
            : ApiResponse::success('Status pengajuan sekolah dimuat.', $result);
    }
}