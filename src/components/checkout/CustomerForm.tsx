import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const CustomerForm = ({ data, onChange }: CustomerFormProps) => {
  const handleChange = (field: keyof CustomerData, value: string) => {
    let formatted = value;
    if (field === 'cpf') formatted = formatCPF(value);
    if (field === 'phone') formatted = formatPhone(value);
    onChange({ ...data, [field]: formatted });
  };

  const fields = [
    { key: 'name' as const, label: 'Nome completo', icon: User, placeholder: 'Seu nome completo', type: 'text' },
    { key: 'email' as const, label: 'E-mail', icon: Mail, placeholder: 'seu@email.com', type: 'email' },
    { key: 'phone' as const, label: 'Celular / WhatsApp', icon: Phone, placeholder: '(00) 00000-0000', type: 'tel' },
    { key: 'cpf' as const, label: 'CPF', icon: FileText, placeholder: '000.000.000-00', type: 'text' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-foreground">Seus dados</h2>
      {fields.map(({ key, label, icon: Icon, placeholder, type }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key} className="text-sm font-medium text-foreground">
            {label}
          </Label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id={key}
              type={type}
              value={data[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className="pl-10 h-12 bg-card border-border focus:border-primary focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomerForm;
