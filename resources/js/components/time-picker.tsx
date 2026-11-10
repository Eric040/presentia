// src/components/ui/time-picker.tsx
import * as React from "react"
import { ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value?: string // format "HH:mm" ou "HH:mm:ss"
  onChange: (time: string) => void
  withSeconds?: boolean
  min?: string // ex: "08:00"
  max?: string // ex: "18:00"
  breakStart?: string // ex: "13:00"
  breakEnd?: string // ex: "14:30"
  className?: string
  id?: string
}

function isWithinRange(time: string, min?: string, max?: string, breakStart?: string, breakEnd?: string) {
  if (min && time < min) return false
  if (max && time > max) return false
  if (breakStart && breakEnd && time >= breakStart && time <= breakEnd) return false
  return true
}

export function TimePicker({
  value,
  onChange,
  withSeconds = false,
  min,
  max,
  breakStart,
  breakEnd,
  className,
  id,
}: TimePickerProps) {
  const [error, setError] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (!newValue) {
      setError(false)
      onChange(newValue)
      return
    }
    const valid = isWithinRange(newValue, min, max, breakStart, breakEnd)
    setError(!valid)
    onChange(newValue)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <ClockIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="time"
          id={id}
          step={withSeconds ? 1 : 60}
          min={min}
          max={max}
          value={value ?? ""}
          onChange={handleChange}
          className={cn(
            "pl-8 appearance-none bg-background",
            "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">
          {breakStart && breakEnd
            ? `L'heure doit être entre ${min} et ${breakStart} ou entre ${breakEnd} et ${max}`
            : min && max
            ? `L'heure doit être entre ${min} et ${max}`
            : min
            ? `L'heure doit être après ${min}`
            : `L'heure doit être avant ${max}`}
        </p>
      )}
    </div>
  )
}