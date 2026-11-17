<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateVotersTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'auto_increment' => true,
            ],
            'election_id' => [
                'type' => 'INT',
                'null' => true,
            ],
            'nisn' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
            ],
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
            ],
            'class' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'birth_date' => [
                'type' => 'DATE',
            ],
            'has_voted' => [
                'type'    => 'BOOLEAN',
                'default' => false,
            ],
            'voted_at' => [
                'type' => 'DATE',
                'null' => true,
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
        $this->forge->addKey(['election_id', 'nisn'], false, true);
        $this->forge->addForeignKey('election_id', 'elections', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('voters');
    }

    public function down(): void
    {
        $this->forge->dropTable('voters', true);
    }
}
