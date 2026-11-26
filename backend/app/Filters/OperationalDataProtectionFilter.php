<?php

declare(strict_types=1);

namespace App\Filters;

use App\Services\ApiResponse;
use App\Services\AuthContext;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * OperationalDataProtectionFilter.
 *
 * CRITICAL SECURITY RULE:
 * Super Admin is strictly forbidden from accessing school operational data
 * (DPT, candidates, ballots, internal vote counts/results).
 */
final class OperationalDataProtectionFilter implements FilterInterface
{
    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|RequestInterface|void
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (AuthContext::getRole() === 'super_admin') {
            return ApiResponse::forbidden(
                'Super Admin dilarang keras mengakses data operasional pemilu sekolah (DPT, kandidat, bilik, suara, dan rincian hasil).'
            );
        }
    }

    /**
     * @param array<string>|null $arguments
     * @return ResponseInterface|void
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}