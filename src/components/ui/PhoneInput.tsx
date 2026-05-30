"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CODES = [
  { code: "+1", flag: "🇺🇸", short: "US" },
  { code: "+44", flag: "🇬🇧", short: "GB" },
  { code: "+91", flag: "🇮🇳", short: "IN" },
  { code: "+61", flag: "🇦🇺", short: "AU" },
  { code: "+49", flag: "🇩🇪", short: "DE" },
  { code: "+33", flag: "🇫🇷", short: "FR" },
  { code: "+81", flag: "🇯🇵", short: "JP" },
  { code: "+55", flag: "🇧🇷", short: "BR" },
  { code: "+52", flag: "🇲🇽", short: "MX" },
  { code: "+27", flag: "🇿🇦", short: "ZA" },
  { code: "+234", flag: "🇳🇬", short: "NG" },
  { code: "+971", flag: "🇦🇪", short: "AE" },
  { code: "+65", flag: "🇸🇬", short: "SG" },
  { code: "+60", flag: "🇲🇾", short: "MY" },
  { code: "+63", flag: "🇵🇭", short: "PH" },
  { code: "+62", flag: "🇮🇩", short: "ID" },
  { code: "+92", flag: "🇵🇰", short: "PK" },
  { code: "+880", flag: "🇧🇩", short: "BD" },
  { code: "+20", flag: "🇪🇬", short: "EG" },
  { code: "+254", flag: "🇰🇪", short: "KE" },
];

interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "1234567890",
  disabled,
  className,
  error,
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+1");
  const [localNumber, setLocalNumber] = useState("");

  // On mount, parse the full E.164 value into code + local number
  useEffect(() => {
    if (!value) return;
    const matched = CODES.find((c) => value.startsWith(c.code));
    if (matched) {
      setCountryCode(matched.code);
      setLocalNumber(value.slice(matched.code.length));
    } else {
      setLocalNumber(value.replace(/^\+/, ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = (code: string) => {
    setCountryCode(code);
    onChange(`${code}${localNumber}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setLocalNumber(digits);
    onChange(`${countryCode}${digits}`);
  };

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Select value={countryCode} onValueChange={handleCodeChange} disabled={disabled}>
        <SelectTrigger
          className={cn("w-[88px] shrink-0 font-mono text-sm", error && "border-red-500")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {CODES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="font-mono">
              {c.flag} {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("font-mono", error && "border-red-500")}
      />
    </div>
  );
}
