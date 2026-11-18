<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Ballots Migration - Zero-Knowledge Ballot Architecture.
 *
 * CRITICAL SECURITY RULE:
 * This table MUST NOT have any foreign key, relation, or column referencing
 * voters or voting tokens. No precision timestamp is recorded to guarantee
 * total vote secrecy.
 */
final class CreateBallotsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'       => 'VARCHAR',
                'constraint' => 36,
            ],
            'candidate_id' => [
                'type'       => 'BIGINT',
                'constraint' => 20,
                'unsigned'   => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('candidate_id');
        $this->forge->addForeignKey('candidate_id', 'candidates', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->createTable('ballots');
    }

    public function down(): void
    {
        $this->forge->dropTable('ballots', true);
    }
}
