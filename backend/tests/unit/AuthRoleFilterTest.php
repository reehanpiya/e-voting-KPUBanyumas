<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Filters\OperationalDataProtectionFilter;
use App\Filters\PrimaryAdminFilter;
use App\Filters\RoleFilter;
use App\Services\AuthContext;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * @internal
 */
final class AuthRoleFilterTest extends CIUnitTestCase
{
    protected function tearDown(): void
    {
        parent::tearDown();
        AuthContext::clear();
    }

    public function testRoleFilterBlocksMismatchedRole(): void
    {
        // Set context as admin_sekolah
        AuthContext::setUser([
            'id'         => 10,
            'username'   => 'support1_123',
            'role'       => 'admin_sekolah',
            'is_primary' => false,
        ], 'token123');

        $roleFilter = new RoleFilter();
        $request    = service('request');

        // Target requires super_admin
        /** @var ResponseInterface|null $result */
        $result = $roleFilter->before($request, ['super_admin']);

        $this->assertInstanceOf(ResponseInterface::class, $result);
        $this->assertSame(403, $result->getStatusCode());

        $body = json_decode($result->getBody(), true);
        $this->assertFalse($body['success']);
        $this->assertStringContainsString('tidak memiliki izin', $body['message']);
    }

    public function testRoleFilterAllowsMatchedRole(): void
    {
        AuthContext::setUser([
            'id'         => 1,
            'username'   => 'superadmin',
            'role'       => 'super_admin',
            'is_primary' => true,
        ], 'token123');

        $roleFilter = new RoleFilter();
        $request    = service('request');

        $result = $roleFilter->before($request, ['super_admin']);
        $this->assertNull($result);
    }

    public function testPrimaryAdminFilterBlocksSecondaryAdmin(): void
    {
        AuthContext::setUser([
            'id'         => 11,
            'username'   => 'support2_123',
            'role'       => 'admin_sekolah',
            'is_primary' => false, // Secondary / Support admin
        ], 'token123');

        $primaryFilter = new PrimaryAdminFilter();
        $request        = service('request');

        /** @var ResponseInterface|null $result */
        $result = $primaryFilter->before($request);

        $this->assertInstanceOf(ResponseInterface::class, $result);
        $this->assertSame(403, $result->getStatusCode());

        $body = json_decode($result->getBody(), true);
        $this->assertStringContainsString('Hanya Admin Utama', $body['message']);
    }

    public function testPrimaryAdminFilterAllowsPrimaryAdmin(): void
    {
        AuthContext::setUser([
            'id'         => 10,
            'username'   => 'admin_123',
            'role'       => 'admin_sekolah',
            'is_primary' => true, // Primary admin
        ], 'token123');

        $primaryFilter = new PrimaryAdminFilter();
        $request        = service('request');

        $result = $primaryFilter->before($request);
        $this->assertNull($result);
    }

    public function testOperationalDataProtectionBlocksSuperAdmin(): void
    {
        AuthContext::setUser([
            'id'         => 1,
            'username'   => 'superadmin',
            'role'       => 'super_admin',
            'is_primary' => true,
        ], 'token123');

        $opFilter = new OperationalDataProtectionFilter();
        $request  = service('request');

        /** @var ResponseInterface|null $result */
        $result = $opFilter->before($request);

        $this->assertInstanceOf(ResponseInterface::class, $result);
        $this->assertSame(403, $result->getStatusCode());

        $body = json_decode($result->getBody(), true);
        $this->assertStringContainsString('Super Admin dilarang keras mengakses data operasional', $body['message']);
    }
}
