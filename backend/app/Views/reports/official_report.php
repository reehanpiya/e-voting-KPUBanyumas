<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Berita Acara Rekapitulasi Pemilihan E-Voting</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #1e293b;
            line-height: 1.5;
            margin: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 16px;
            margin: 0;
            text-transform: uppercase;
            color: #0f172a;
        }
        .header h2 {
            font-size: 14px;
            margin: 4px 0;
            color: #334155;
        }
        .header p {
            font-size: 10px;
            margin: 0;
            color: #64748b;
        }
        .section-title {
            font-size: 13px;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 8px;
            color: #1e293b;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-success {
            background-color: #d1fae5;
            color: #065f46;
        }
        .signatures {
            margin-top: 40px;
            width: 100%;
        }
        .signatures td {
            border: none;
            text-align: center;
            width: 50%;
            padding-top: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>KOMISI PEMILIHAN UMUM (KPU) KABUPATEN BANYUMAS</h1>
        <h2>BERITA ACARA REKAPITULASI HASIL PENGHITUNGAN SUARA E-VOTING</h2>
        <p>Satuan Pendidikan: <?= esc($election['school_name'] ?? 'Sekolah') ?> &bull; Waktu Cetak: <?= esc($date) ?></p>
    </div>

    <div class="section-title">I. REKAPITULASI TINGKAT PARTISIPASI PEMILIH</div>
    <table>
        <tr>
            <th style="width: 50%;">Uraian</th>
            <th class="text-right" style="width: 50%;">Jumlah</th>
        </tr>
        <tr>
            <td>Total Pemilih Terdaftar dalam DPT</td>
            <td class="text-right"><?= number_format($report['results']['total_dpt']) ?> Orang</td>
        </tr>
        <tr>
            <td>Total Suara Sah Masuk (Pemilih Hadir)</td>
            <td class="text-right"><?= number_format($report['results']['total_valid_votes']) ?> Suara</td>
        </tr>
        <tr>
            <td>Tingkat Partisipasi Pemilih</td>
            <td class="text-right"><strong><?= esc((string) $report['results']['turnout_percentage']) ?>%</strong></td>
        </tr>
    </table>

    <div class="section-title">II. PEROLEHAN SUARA PASANGAN CALON</div>
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width: 10%;">No. Urut</th>
                <th style="width: 50%;">Nama Pasangan Calon</th>
                <th class="text-right" style="width: 20%;">Perolehan Suara</th>
                <th class="text-right" style="width: 20%;">Persentase</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($report['results']['candidates'] as $candidate): ?>
            <tr>
                <td class="text-center"><strong><?= esc((string) $candidate['number']) ?></strong></td>
                <td><?= esc($candidate['name']) ?></td>
                <td class="text-right"><?= number_format($candidate['votes']) ?> Suara</td>
                <td class="text-right"><strong><?= esc((string) $candidate['percentage']) ?>%</strong></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <div class="section-title">III. HASIL AUDIT INTEGRITAS DATA (ANTI-TAMPERING)</div>
    <table>
        <tr>
            <th style="width: 50%;">Parameter Audit</th>
            <th class="text-right" style="width: 50%;">Status</th>
        </tr>
        <tr>
            <td>Kesesuaian Kotak Suara & Kehadiran DPT</td>
            <td class="text-right">
                <?php if ($report['integrity']['is_valid']): ?>
                    <span class="badge badge-success">VALID (Sinkron Sempurna)</span>
                <?php else: ?>
                    <span style="color: red; font-weight: bold;">TERDAPAT SELISIH (<?= esc((string) $report['integrity']['difference']) ?>)</span>
                <?php endif; ?>
            </td>
        </tr>
        <tr>
            <td>Total Surat Suara Anonim di Sistem (Ballots)</td>
            <td class="text-right"><?= number_format($report['integrity']['total_ballots']) ?></td>
        </tr>
        <tr>
            <td>Total Pemilih Tercatat Menggunakan Hak Suara</td>
            <td class="text-right"><?= number_format($report['integrity']['voters_participated']) ?></td>
        </tr>
    </table>

    <p style="font-size: 11px; margin-top: 15px;">
        Demikian Berita Acara Rekapitulasi Hasil Pemilihan Elektronik ini dibuat dengan sebenar-benarnya serta menjunjung tinggi asas Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil.
    </p>

    <table class="signatures">
        <tr>
            <td>
                Mengetahui,<br>
                <strong>Saksi Panitia / Pengawas</strong><br><br><br><br>
                ( .................................................... )
            </td>
            <td>
                Banyumas, <?= esc(date('d F Y')) ?><br>
                <strong>Ketua Panitia Pemilihan Sekolah</strong><br><br><br><br>
                ( .................................................... )
            </td>
        </tr>
    </table>
</body>
</html>
