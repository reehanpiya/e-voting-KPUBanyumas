<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\ElectionStateService;
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;

/**
 * @internal
 */
final class ElectionStateServiceTest extends CIUnitTestCase
{
    private ElectionStateService $stateService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stateService = new ElectionStateService();
    }

    public function testStrictFsmSequenceTransitions(): void
    {
        // Allowed sequential transitions:
        // READY -> PENDING -> SETUP -> ACTIVE -> CLOSED -> FINALIZED -> PUBLISHED -> CLEANUP -> READY
        $this->assertTrue($this->stateService->canTransition('READY', 'PENDING'));
        $this->assertTrue($this->stateService->canTransition('PENDING', 'SETUP'));
        $this->assertTrue($this->stateService->canTransition('SETUP', 'ACTIVE'));
        $this->assertTrue($this->stateService->canTransition('ACTIVE', 'CLOSED'));
        $this->assertTrue($this->stateService->canTransition('CLOSED', 'FINALIZED'));
        $this->assertTrue($this->stateService->canTransition('FINALIZED', 'PUBLISHED'));
        $this->assertTrue($this->stateService->canTransition('PUBLISHED', 'CLEANUP'));
        $this->assertTrue($this->stateService->canTransition('CLEANUP', 'READY'));

        // Disallowed / Illegal skipping
        $this->assertFalse($this->stateService->canTransition('READY', 'ACTIVE'));
        $this->assertFalse($this->stateService->canTransition('SETUP', 'PUBLISHED'));
        $this->assertFalse($this->stateService->canTransition('ACTIVE', 'READY'));
        $this->assertFalse($this->stateService->canTransition('CLOSED', 'SETUP'));
    }

    public function testPreconditionValidationForActiveVoting(): void
    {
        $incompleteElection = [
            'status'               => 'SETUP',
            'dpt_locked_at'        => null, // Not locked!
            'candidates_locked_at' => null, // Not locked!
            'start_time'           => null,
            'end_time'             => null,
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DPT harus dikunci terlebih dahulu');

        $this->stateService->validatePreconditions($incompleteElection, 'ACTIVE');
    }

    public function testPreconditionValidationForClosedVotingWithWrongConfirmation(): void
    {
        $activeElection = [
            'status' => 'ACTIVE',
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Konfirmasi penutupan tidak valid');

        $this->stateService->validatePreconditions($activeElection, 'CLOSED', [
            'confirmation_text' => 'TUTUP', // Wrong! Must be 'TUTUP SESI PEMUNGUTAN'
        ]);
    }

    public function testPreconditionValidationForCleanupWithoutReport(): void
    {
        $publishedElection = [
            'status'               => 'PUBLISHED',
            'report_downloaded_at' => null, // Not downloaded!
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Laporan resmi pemilu belum diunduh');

        $this->stateService->validatePreconditions($publishedElection, 'CLEANUP', [
            'confirmation_code' => 'HAPUS DATA',
        ]);
    }
}
