<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\ApiResponse;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class ApiResponseTest extends CIUnitTestCase
{
    public function testSuccessResponseStructure(): void
    {
        $response = ApiResponse::success('Operasi berhasil.', ['id' => 123]);

        $this->assertSame(200, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertTrue($body['success']);
        $this->assertSame('Operasi berhasil.', $body['message']);
        $this->assertSame(['id' => 123], $body['data']);
    }

    public function testErrorResponseStructure(): void
    {
        $response = ApiResponse::error('Terjadi kesalahan.', ['nisn' => ['NISN tidak terdaftar.']], 422);

        $this->assertSame(422, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertFalse($body['success']);
        $this->assertSame('Terjadi kesalahan.', $body['message']);
        $this->assertSame(['nisn' => ['NISN tidak terdaftar.']], $body['errors']);
    }

    public function testForbiddenResponseStructure(): void
    {
        $response = ApiResponse::forbidden('Akses ditolak.');

        $this->assertSame(403, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertFalse($body['success']);
        $this->assertSame('Akses ditolak.', $body['message']);
    }

    public function testUnauthorizedResponseStructure(): void
    {
        $response = ApiResponse::unauthorized('Token tidak valid.');

        $this->assertSame(401, $response->getStatusCode());

        $body = json_decode($response->getBody(), true);
        $this->assertFalse($body['success']);
        $this->assertSame('Token tidak valid.', $body['message']);
    }
}
