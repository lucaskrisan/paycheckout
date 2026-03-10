import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";

export interface CreditCardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  installments: string;
}

interface CreditCardFormProps {
  data: CreditCardData;
  onChange: (data: CreditCardData) => void;
  totalAmount: number;
}

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const CreditCardForm = ({ data, onChange, totalAmount }: CreditCardFormProps) => {
  const handleChange = (field: keyof CreditCardData, value: string) => {
    let formatted = value;
    if (field === 'number') formatted = formatCardNumber(value);
    if (field === 'expiry') formatted = formatExpiry(value);
    if (field === 'cvv') formatted = value.replace(/\D/g, '').slice(0, 4);
    onChange({ ...data, [field]: formatted });
  };

  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const value = totalAmount / n;
    return {
      value: String(n),
      label: n === 1
        ? `1x de R$ ${totalAmount.toFixed(2).replace('.', ',')} (sem juros)`
        : `${n}x de R$ ${value.toFixed(2).replace('.', ',')}`,
    };
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="card-number" className="text-sm font-medium text-foreground">Número do cartão</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="card-number"
            value={data.number}
            onChange={(e) => handleChange('number', e.target.value)}
            placeholder="0000 0000 0000 0000"
            className="pl-10 h-12 bg-card border-border focus:border-primary focus:ring-primary/20 font-mono tracking-wider"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="card-name" className="text-sm font-medium text-foreground">Nome no cartão</Label>
        <Input
          id="card-name"
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value.toUpperCase())}
          placeholder="NOME COMO ESTÁ NO CARTÃO"
          className="h-12 bg-card border-border focus:border-primary focus:ring-primary/20 uppercase tracking-wide"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-expiry" className="text-sm font-medium text-foreground">Validade</Label>
          <Input
            id="card-expiry"
            value={data.expiry}
            onChange={(e) => handleChange('expiry', e.target.value)}
            placeholder="MM/AA"
            className="h-12 bg-card border-border focus:border-primary focus:ring-primary/20 font-mono text-center"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-cvv" className="text-sm font-medium text-foreground">CVV</Label>
          <Input
            id="card-cvv"
            value={data.cvv}
            onChange={(e) => handleChange('cvv', e.target.value)}
            placeholder="000"
            className="h-12 bg-card border-border focus:border-primary focus:ring-primary/20 font-mono text-center"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Parcelas</Label>
        <Select value={data.installments} onValueChange={(v) => handleChange('installments', v)}>
          <SelectTrigger className="h-12 bg-card border-border">
            <SelectValue placeholder="Selecione as parcelas" />
          </SelectTrigger>
          <SelectContent>
            {installmentOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CreditCardForm;
