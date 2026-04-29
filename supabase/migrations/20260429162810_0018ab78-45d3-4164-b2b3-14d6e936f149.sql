-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.marketplace_apps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    client_id TEXT NOT NULL DEFAULT 'cid_' || lower(encode(gen_random_bytes(16), 'hex')),
    client_secret TEXT NOT NULL DEFAULT 'csec_' || lower(encode(gen_random_bytes(32), 'hex')),
    sso_secret TEXT NOT NULL DEFAULT 'sso_' || lower(encode(gen_random_bytes(32), 'hex')),
    webhook_secret TEXT NOT NULL DEFAULT 'whsec_' || lower(encode(gen_random_bytes(32), 'hex')),
    redirect_url TEXT,
    sso_url TEXT,
    webhook_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_apps ENABLE ROW LEVEL SECURITY;

-- Everyone can view apps
CREATE POLICY "Marketplace apps are viewable by everyone" 
ON public.marketplace_apps 
FOR SELECT 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_apps_updated_at
BEFORE UPDATE ON public.marketplace_apps
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Insert GatFlow registration
INSERT INTO public.marketplace_apps (
    name, 
    slug, 
    description, 
    webhook_url
) VALUES (
    'GatFlow', 
    'gatflow', 
    'Ferramenta de automação e integração para ecommerce.', 
    'https://gatflow.com/functions/v1/panttera-auth/webhooks/panttera'
);