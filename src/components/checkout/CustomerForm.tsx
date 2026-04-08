import { Input } from "@/components/ui/input";
import { User, Mail, Phone, FileText } from "lucide-react";

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

interface CustomerFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  hideDocumentPhone?: boolean;
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const isValidCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += parseInt(digits[i]) * (t + 1 - i);
    const remainder = (sum * 10) % 11;
    if ((remainder === 10 ? 0 : remainder) !== parseInt(digits[t])) return false;
  }
  return true;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const inputClass =
  "h-11 pl-10 bg-white border-[#D5D9D9] text-[#0F1111] placeholder:text-[#767676] rounded-xl focus:border-[#007185] focus:ring-[#007185] transition-colors";

const CustomerForm = ({ data, onChange, hideDocumentPhone }: CustomerFormProps) => {
  const handleChange = (field: keyof CustomerData, value: string) => {
    let formatted = value;
    // Length limits to prevent abuse
    if (field === "name" && value.length > 100) return;
    if (field === "email" && value.length > 255) return;
    if (field === "cpf") formatted = formatCPF(value);
    if (field === "phone") formatted = formatPhone(value);
    // Strip any HTML tags from text fields
    if (field === "name" || field === "email") {
      formatted = formatted.replace(/<[^>]*>/g, '');
    }
    onChange({ ...data, [field]: formatted });
  };

  const cpfDigits = data.cpf.replace(/\D/g, "");
  const cpfComplete = cpfDigits.length === 11;
  const cpfInvalid = cpfComplete && !isValidCPF(data.cpf);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[#565959] uppercase tracking-wider">Seus dados</p>

      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565959]" />
        <Input
          value={data.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Nome completo"
          className={inputClass}
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565959]" />
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={data.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="E-mail"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565959]" />
            <Input
              inputMode="numeric"
              autoComplete="off"
              value={data.cpf}
              onChange={(e) => handleChange("cpf", e.target.value)}
              placeholder="CPF"
              className={`${inputClass} ${cpfInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
            />
          </div>
          {cpfInvalid && (
            <p className="text-xs text-red-500 mt-1">CPF inválido</p>
          )}
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565959]" />
          <Input
            type="tel"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Celular"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
