<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::unprepared("CREATE TRIGGER users_admin_no_delete BEFORE DELETE ON users WHEN OLD.role = 'administrateur' BEGIN SELECT RAISE(ABORT, 'The administrator account cannot be deleted'); END;");
            DB::unprepared("CREATE TRIGGER users_admin_no_demote BEFORE UPDATE ON users WHEN OLD.role = 'administrateur' AND (NEW.role <> 'administrateur' OR NEW.active = 0) BEGIN SELECT RAISE(ABORT, 'The administrator account cannot be deactivated or change role'); END;");
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::unprepared("CREATE TRIGGER users_admin_no_delete BEFORE DELETE ON users FOR EACH ROW BEGIN IF OLD.role = 'administrateur' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The administrator account cannot be deleted'; END IF; END");
            DB::unprepared("CREATE TRIGGER users_admin_no_demote BEFORE UPDATE ON users FOR EACH ROW BEGIN IF OLD.role = 'administrateur' AND (NEW.role <> 'administrateur' OR NEW.active = 0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The administrator account cannot be deactivated or change role'; END IF; END");
        }
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS users_admin_no_delete');
        DB::unprepared('DROP TRIGGER IF EXISTS users_admin_no_demote');
    }
};
