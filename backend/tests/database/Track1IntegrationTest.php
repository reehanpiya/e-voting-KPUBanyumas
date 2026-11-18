<?php

declare(strict_types=1);

namespace Tests\Database;

use App\Database\Seeds\SuperAdminSeeder;
use App\Models\BallotModel;
use App\Models\CandidateModel;
use App\Models\ElectionModel;
use App\Models\PersonalAccessTokenModel;
use App\Models\UserModel;
use App\Models\VoterModel;
use App\Models\VotingTokenModel;
use App\Services\AuthService;
use App\Services\ElectionStateService;
use App\Services\SuperAdminService;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use RuntimeException;

/**
 * @internal
 */
final class Track1IntegrationTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $migrate     = true;
    protected $migrateOnce = false;
    protected $refresh     = true;
    protected $namespace   = 'App';
    protected $seed        = SuperAdminSeeder::class;

    public function testSuperAdminSeederAndInitialElection(): void
    {
        $userModel     = new UserModel();
        $electionModel = new ElectionModel();

        // 1. Verify Super Admin account exists
        $admin = $userModel->where('role', UserModel::ROLE_SUPER_ADMIN)->first();
        $this->assertNotNull($admin);
        $this->assertSame('superadmin', $admin['username']);
        $this->assertTrue((bool) $admin['is_primary']);
        $this->assertTrue(password_verify('KpuBanyumas2026!', $admin['password_hash']));

        // 2. Verify Election initial state is READY
        $election = $electionModel->getActiveSession();
        $this->assertNotNull($election);
        $this->assertSame(ElectionStateService::STATUS_READY, $election['status']);
        $this->assertFalse((bool) $election['is_registration_open']);
    }

    public function testAuthServiceLoginAndLogout(): void
    {
        $authService = new AuthService();
        $tokenModel  = new PersonalAccessTokenModel();

        // Test valid login
        $loginResult = $authService->login('superadmin', 'KpuBanyumas2026!', '127.0.0.1');
        $this->assertArrayHasKey('token', $loginResult);
        $this->assertArrayHasKey('user', $loginResult);
        $this->assertArrayNotHasKey('password_hash', $loginResult['user']);

        $plainToken = $loginResult['token'];
        $tokenHash  = hash('sha256', $plainToken);

        // Verify token is stored as SHA-256 hash in database
        $tokenRow = $tokenModel->where('token_hash', $tokenHash)->first();
        $this->assertNotNull($tokenRow);
        $this->assertSame($loginResult['user']['id'], $tokenRow['user_id']);

        // Verify authenticating with token
        $authUser = $authService->getAuthenticatedUser($plainToken);
        $this->assertNotNull($authUser);
        $this->assertSame('superadmin', $authUser['username']);

        // Test invalid password
        $this->expectException(RuntimeException::class);
        $authService->login('superadmin', 'wrong_password', '127.0.0.1');
    }

    public function testSuperAdminToggleRegistration(): void
    {
        $superAdminService = new SuperAdminService();
        $electionModel     = new ElectionModel();

        // Open registration
        $updated = $superAdminService->toggleRegistration(true, 1, '127.0.0.1');
        $this->assertTrue((bool) $updated['is_registration_open']);

        // Close registration
        $updated = $superAdminService->toggleRegistration(false, 1, '127.0.0.1');
        $this->assertFalse((bool) $updated['is_registration_open']);
    }

    public function testSuperAdminApproveCreatesFiveAccountsAndTransitionsToSetup(): void
    {
        $superAdminService = new SuperAdminService();
        $electionModel     = new ElectionModel();
        $userModel         = new UserModel();

        // 1. Simulate a school registered with status PENDING
        $election = $electionModel->getActiveSession();
        $electionModel->update($election['id'], [
            'status'        => ElectionStateService::STATUS_PENDING,
            'school_name'   => 'SMA Negeri 1 Banyumas',
            'npsn'          => '20301122',
            'contact_email' => 'sman1banyumas@sch.id',
        ]);

        // 2. Super Admin approves
        $result = $superAdminService->approveRegistration((int) $election['id'], 1, '127.0.0.1');

        // Check election status transitioned to SETUP
        $this->assertSame(ElectionStateService::STATUS_SETUP, $result['election']['status']);

        // Check that exactly 5 accounts were generated (1 Primary + 4 Support)
        $accounts = $result['accounts'];
        $this->assertCount(5, $accounts);

        $primaryCount = 0;
        $supportCount = 0;

        foreach ($accounts as $acc) {
            $this->assertNotEmpty($acc['username']);
            $this->assertNotEmpty($acc['plain_password']);
            $this->assertSame(UserModel::ROLE_ADMIN_SEKOLAH, $acc['role']);

            if ($acc['is_primary']) {
                $primaryCount++;
                $this->assertStringContainsString('admin_', $acc['username']);
            } else {
                $supportCount++;
                $this->assertStringContainsString('support', $acc['username']);
            }
        }

        $this->assertSame(1, $primaryCount, 'Must have exactly 1 Primary Admin account');
        $this->assertSame(4, $supportCount, 'Must have exactly 4 Support Admin accounts');

        // Verify stored in database
        $schoolUsers = $userModel->where('role', UserModel::ROLE_ADMIN_SEKOLAH)->findAll();
        $this->assertCount(5, $schoolUsers);
    }

    public function testSuperAdminCleanupResetsOperationalData(): void
    {
        $superAdminService = new SuperAdminService();
        $electionModel     = new ElectionModel();
        $voterModel        = new VoterModel();
        $candidateModel    = new CandidateModel();
        $ballotModel       = new BallotModel();
        $tokenModel        = new VotingTokenModel();

        $election = $electionModel->getActiveSession();

        // Populate sample operational data
        $candId = $candidateModel->insert([
            'number' => 1,
            'name'   => 'Calon Ketua 1',
        ]);

        $voterId = $voterModel->insert([
            'nisn'       => '1234567890',
            'name'       => 'Siswa A',
            'class'      => 'XII IPA 1',
            'birth_date' => '2006-05-10',
            'has_voted'  => true,
        ]);

        $tokenModel->insert([
            'token'    => 'TKN-ABC123',
            'voter_id' => $voterId,
            'status'   => 'used',
        ]);

        $ballotModel->insert([
            'id'           => 'uuid-ballot-sample-1234',
            'candidate_id' => $candId,
        ]);

        // Mark election as PUBLISHED and downloaded
        $electionModel->update($election['id'], [
            'status'               => ElectionStateService::STATUS_PUBLISHED,
            'report_downloaded_at' => date('Y-m-d H:i:s'),
        ]);

        // Execute cleanup
        $resetElection = $superAdminService->cleanup('HAPUS DATA', 1, '127.0.0.1');

        // Verify status is reset to READY
        $this->assertSame(ElectionStateService::STATUS_READY, $resetElection['status']);
        $this->assertNull($resetElection['school_name']);

        // Verify operational tables are wiped clean
        $this->assertSame(0, $candidateModel->countAllResults());
        $this->assertSame(0, $voterModel->countAllResults());
        $this->assertSame(0, $ballotModel->countAllResults());
        $this->assertSame(0, $tokenModel->countAllResults());
    }
}
