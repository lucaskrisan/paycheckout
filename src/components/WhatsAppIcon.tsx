import whatsappIcon from "@/assets/whatsapp-icon.png";

interface WhatsAppIconProps {
  className?: string;
}

const WhatsAppIcon = ({ className = "w-4 h-4" }: WhatsAppIconProps) => (
  <img src={whatsappIcon} alt="WhatsApp" className={className} />
);

export default WhatsAppIcon;
