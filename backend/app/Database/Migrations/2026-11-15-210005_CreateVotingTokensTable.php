<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateVotingTokensTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'auto_increment' => true,
            ],
            'token' => [
                'type'       => 'VARCHAR',
                'constraint' => 32,
                'unique'     => true,
            ],
            'voter_id' => [
                'type' => 'INT',
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'default'    => 'unused',
            ],
            'created_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'TIMESTAMP WITH TIME ZONE',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('voter_id', 'voters', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('voting_tokens');
    }

    public function down(): void
    {
        $this->forge->dropTable('voting_tokens', true);
    }
}
