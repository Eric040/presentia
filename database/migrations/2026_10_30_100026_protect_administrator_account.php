<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::unprepared("CREATE TRIGGER users_admin_no_delete BEFORE DELETE ON users FOR EACH ROW BEGIN IF OLD.role = 'administrator' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The administrator account cannot be deleted'; END IF; END");
        DB::unprepared("CREATE TRIGGER users_admin_no_demote BEFORE UPDATE ON users FOR EACH ROW BEGIN IF OLD.role = 'administrator' AND (NEW.role <> 'administrator' OR NEW.active = 0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The administrator account cannot be deactivated or change role'; END IF; END");
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS users_admin_no_delete');
        DB::unprepared('DROP TRIGGER IF EXISTS users_admin_no_demote');
    }
};
