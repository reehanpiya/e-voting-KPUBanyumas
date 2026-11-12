<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\ApiResponse;
use CodeIgniter\HTTP\ResponseInterface;

final class HealthController extends BaseController
{
    public function index(): ResponseInterface
    {
        return ApiResponse::success('API is ready.', ['status' => 'ok']);
    }
}
