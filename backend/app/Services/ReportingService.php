<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CandidateModel;
use App\Models\ElectionModel;
use App\Models\VoterModel;
use CodeIgniter\I18n\Time;
use Config\Database;
use Dompdf\Dompdf;
use Dompdf\Options;
use RuntimeException;

class ReportingService
{
    protected ElectionModel $electionModel;
    protected CandidateModel $candidateModel;
    protected VoterModel $voterModel;

    public function __construct()
    {
        $this->electionModel  = new ElectionModel();
        $this->candidateModel = new CandidateModel();
        $this->voterModel     = new VoterModel();
    }

    /**
     * Mendapatkan sesi pemilu aktif
     */
    protected function getActiveElection(): array
    {
        $election = $this->electionModel->getActiveSession();
        if (! $election) {
            throw new RuntimeException('Tidak ada sesi pemilu yang aktif saat ini.');
        }
        return $election;
    }

    /**
     * Realcount Partisipasi Publik Terbatas (Saat status ACTIVE)
     * KETAT: Dilarang menampilkan perolehan paslon ke publik!
     */
    public function getPublicTurnout(): array
    {
        $election = $this->getActiveElection();
        $db       = Database::connect();

        $votingActive = $election['status'] === 'ACTIVE';
        $totalDpt   = $this->voterModel->countAllResults();
        $votedCount = $db->table('voters')
            ->where('has_voted IS TRUE', null, false)
            ->countAllResults();

        $percentage = $totalDpt > 0 ? round(($votedCount / $totalDpt) * 100, 2) : 0.0;

        return [
            'available'          => $votingActive,
            'school_name'        => $election['school_name'] ?? 'Pemilu Sekolah',
            'total_dpt'          => $totalDpt,
            'total_votes_in'     => $votedCount,
            'turnout_percentage' => $percentage,
            'last_updated'       => Time::now()->toDateTimeString(),
        ];
    }

    /**
     * Hasil Pemilihan Resmi Publik (Hanya jika status PUBLISHED)
     */
    public function getPublicResults(): array
    {
        $election = $this->getActiveElection();

        if ($election['status'] !== 'PUBLISHED') {
            throw new RuntimeException('Hasil pemilihan belum dipublikasikan secara resmi oleh panitia.');
        }

        return $this->calculateResults($election);
    }

    /**
     * Hasil Rekapitulasi Internal Sekolah & Status Integritas Data
     * Diakses saat CLOSED, FINALIZED, atau PUBLISHED
     */
    public function getSchoolResults(): array
    {
        $election = $this->getActiveElection();

        if (in_array($election['status'], ['READY', 'PENDING', 'SETUP'], true)) {
            throw new RuntimeException('Rekapitulasi hasil belum tersedia pada tahap persiapan.');
        }

        $results = $this->calculateResults($election);

        // Audit Integritas Data
        $db = Database::connect();
        $ballotsCount = $db->table('ballots')->countAllResults();
        $votersVotedCount = $db->table('voters')
            ->where('has_voted IS TRUE', null, false)
            ->countAllResults();

        $integrityStatus = ($ballotsCount === $votersVotedCount);

        return [
            'election' => [
                'id'                   => $election['id'],
                'school_name'          => $election['school_name'],
                'status'               => $election['status'],
                'report_downloaded_at' => $election['report_downloaded_at'],
            ],
            'integrity' => [
                'is_valid'             => $integrityStatus,
                'total_ballots'        => $ballotsCount,
                'voters_participated'  => $votersVotedCount,
                'difference'           => abs($ballotsCount - $votersVotedCount),
                'message'              => $integrityStatus
                    ? 'Integritas data valid: Jumlah surat suara di kotak suara sama persis dengan pemilih yang hadir.'
                    : 'Peringatan: Terdapat selisih antara surat suara fisik dan daftar kehadiran pemilih.',
            ],
            'results' => $results,
        ];
    }

    /**
     * Menghitung rincian perolehan suara paslon
     */
    private function calculateResults(array $election): array
    {
        $db = Database::connect();
        $candidates = $this->candidateModel->orderBy('number', 'ASC')->findAll();

        $totalDpt = $this->voterModel->countAllResults();

        // Hitung suara per kandidat dari tabel ballots
        $countsQuery = $db->table('ballots')
            ->select('candidate_id, count(id) as total_votes')
            ->groupBy('candidate_id')
            ->get()
            ->getResultArray();

        $voteMap = [];
        $totalValidVotes = 0;
        foreach ($countsQuery as $row) {
            $cid = (int) $row['candidate_id'];
            $votes = (int) $row['total_votes'];
            $voteMap[$cid] = $votes;
            $totalValidVotes += $votes;
        }

        $candidateResults = [];
        $highestVotes = -1;
        $winner = null;

        foreach ($candidates as $cand) {
            $cid = (int) $cand['id'];
            $votes = $voteMap[$cid] ?? 0;
            $percent = $totalValidVotes > 0 ? round(($votes / $totalValidVotes) * 100, 2) : 0.0;

            if ($votes > $highestVotes) {
                $highestVotes = $votes;
                $winner = [
                    'id'     => $cid,
                    'number' => (int) $cand['number'],
                    'name'   => $cand['name'],
                    'votes'  => $votes,
                ];
            }

            $candidateResults[] = [
                'id'         => $cid,
                'number'     => (int) $cand['number'],
                'name'       => $cand['name'],
                'photo_url'  => $cand['photo_url'],
                'votes'      => $votes,
                'percentage' => $percent,
            ];
        }

        return [
            'total_dpt'          => $totalDpt,
            'total_valid_votes'  => $totalValidVotes,
            'turnout_percentage' => $totalDpt > 0 ? round(($totalValidVotes / $totalDpt) * 100, 2) : 0.0,
            'winner'             => $totalValidVotes > 0 ? $winner : null,
            'candidates'         => $candidateResults,
        ];
    }

    /**
     * Ekspor Laporan Rekapitulasi CSV Resmi
     */
    public function exportCsv(): string
    {
        $election = $this->getActiveElection();
        $data     = $this->calculateResults($election);

        $this->markReportDownloaded((int) $election['id']);

        $output = fopen('php://temp', 'r+');

        // Header Laporan
        fputcsv($output, ['BERITA ACARA REKAPITULASI HASIL PEMILIHAN E-VOTING']);
        fputcsv($output, ['Sekolah', $election['school_name'] ?? '-']);
        fputcsv($output, ['Status Sesi', $election['status']]);
        fputcsv($output, ['Waktu Unduh', Time::now()->toDateTimeString()]);
        fputcsv($output, []);

        // Ringkasan Partisipasi
        fputcsv($output, ['RINGKASAN PARTISIPASI']);
        fputcsv($output, ['Total DPT', (string) $data['total_dpt']]);
        fputcsv($output, ['Total Suara Sah Masuk', (string) $data['total_valid_votes']]);
        fputcsv($output, ['Persentase Partisipasi', $data['turnout_percentage'] . '%']);
        fputcsv($output, []);

        // Rincian Perolehan Paslon
        fputcsv($output, ['PEROLEHAN SUARA PASANGAN CALON']);
        fputcsv($output, ['Nomor Urut', 'Nama Paslon', 'Perolehan Suara', 'Persentase']);

        foreach ($data['candidates'] as $c) {
            fputcsv($output, [
                $c['number'],
                $c['name'],
                $c['votes'],
                $c['percentage'] . '%',
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return (string) $csvContent;
    }

    /**
     * Ekspor Berita Acara Resmi PDF
     */
    public function exportPdf(): string
    {
        $election = $this->getActiveElection();
        $schoolResults = $this->getSchoolResults();

        $this->markReportDownloaded((int) $election['id']);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);

        $dompdf = new Dompdf($options);

        $html = view('reports/official_report', [
            'election' => $election,
            'report'   => $schoolResults,
            'date'     => Time::now()->toLocalizedString('d MMMM yyyy HH:mm:ss'),
        ]);

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return (string) $dompdf->output();
    }

    /**
     * Update flag report_downloaded_at (syarat Super Admin Cleanup)
     */
    protected function markReportDownloaded(int $electionId): void
    {
        $this->electionModel->update($electionId, [
            'report_downloaded_at' => Time::now()->toDateTimeString(),
        ]);
    }
}
