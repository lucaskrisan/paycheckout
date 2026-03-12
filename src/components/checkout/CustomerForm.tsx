import { Input } from "@/components/ui/input";

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
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const CustomerForm = ({ data, onChange }: CustomerFormProps) => {
  const handleChange = (field: keyof CustomerData, value: string) => {
    let formatted = value;
    if (field === "cpf") formatted = formatCPF(value);
    if (field === "phone") formatted = formatPhone(value);
    onChange({ ...data, [field]: formatted });
  };

  return (
    <div className="space-y-3">
      <Input
        value={data.name}
        onChange={(e) => handleChange("name", e.target.value)}
        placeholder="Nome"
        className="h-11 bg-card border-border"
      />
      <Input
        type="email"
        value={data.email}
        onChange={(e) => handleChange("email", e.target.value)}
        placeholder="E-mail"
        className="h-11 bg-card border-border"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={data.cpf}
          onChange={(e) => handleChange("cpf", e.target.value)}
          placeholder="CPF/CNPJ"
          className="h-11 bg-card border-border"
        />
        <Input
          type="tel"
          value={data.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="Telefone"
          className="h-11 bg-card border-border"
        />
      </div>
    </div>
  );
};

export default CustomerForm;
