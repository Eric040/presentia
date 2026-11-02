<?php

namespace App\Enums;

enum Role: string
{
    case Administrator = 'administrator';
    case Hr = 'hr';
    case Manager = 'manager';
    case Employee = 'employee';
    case Accountant = 'accountant';

    public function label(): string
    {
        return match ($this) {
            self::Administrator => 'Administrateur',
            self::Hr => 'Ressources humaines',
            self::Manager => 'Responsable de service',
            self::Employee => 'Employé',
            self::Accountant => 'Comptable',
        };
    }
}
