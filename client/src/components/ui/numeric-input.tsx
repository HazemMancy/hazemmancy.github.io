import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "./input";

interface NumericInputProps {
  value: number | "";
  onValueChange: (n: number) => void;
  step?: string | number;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
  disabled?: boolean;
}

function toDisplay(value: number | ""): string {
  if (value === "") return "";
  return String(value);
}

export function NumericInput({
  value,
  onValueChange,
  step,
  min,
  max,
  className,
  placeholder,
  "data-testid": testId,
  disabled,
}: NumericInputProps) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (isFocused.current) {
      const parsed = parseFloat(display);
      if (!isNaN(parsed) && parsed === value) return;
      if (display === "" && value === "") return;
      if (display === "" && value === 0) return;
      if (display === "-" && value === 0) return;
      if (/^-?\d*\.$/.test(display) && parsed === value) return;
      if (/^-?\d*\.0*$/.test(display) && parsed === value) return;
    }
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      if (raw === "" || raw === "-") {
        setDisplay(raw);
        onValueChange(0);
        return;
      }

      if (/^-?\d*\.?\d*$/.test(raw)) {
        setDisplay(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          let clamped = parsed;
          if (min !== undefined && clamped < min) clamped = min;
          if (max !== undefined && clamped > max) clamped = max;
          onValueChange(clamped);
        }
      }
    },
    [onValueChange, min, max]
  );

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    const parsed = parseFloat(display);
    if (isNaN(parsed) || display === "") {
      setDisplay("");
      onValueChange(0);
    } else {
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      setDisplay(String(clamped));
      onValueChange(clamped);
    }
  }, [display, onValueChange, min, max]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      step={step}
      className={className}
      placeholder={placeholder}
      data-testid={testId}
      disabled={disabled}
    />
  );
}
