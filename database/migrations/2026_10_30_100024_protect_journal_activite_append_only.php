<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::unprepared("CREATE TRIGGER activity_log_no_update BEFORE UPDATE ON activity_log BEGIN SELECT RAISE(ABORT, 'activity_log is append only'); END;");
            DB::unprepared("CREATE TRIGGER activity_log_no_delete BEFORE DELETE ON activity_log BEGIN SELECT RAISE(ABORT, 'activity_log is append only'); END;");
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::unprepared("CREATE TRIGGER activity_log_no_update BEFORE UPDATE ON activity_log FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_log is append only'");
            DB::unprepared("CREATE TRIGGER activity_log_no_delete BEFORE DELETE ON activity_log FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity_log is append only'");
        }
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS activity_log_no_update');
        DB::unprepared('DROP TRIGGER IF EXISTS activity_log_no_delete');
    }
};
