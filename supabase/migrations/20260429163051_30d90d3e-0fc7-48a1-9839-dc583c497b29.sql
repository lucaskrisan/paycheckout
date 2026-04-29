-- Tabela para rastrear instalações de apps por usuário (produtor)
CREATE TABLE public.marketplace_app_installations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    app_id UUID REFERENCES public.marketplace_apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT,
    plan_tier TEXT DEFAULT 'starter',
    active BOOLEAN DEFAULT true,
    installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(app_id, user_id)
);

-- Tabela temporária para códigos de autorização OAuth2
CREATE TABLE public.marketplace_oauth_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    app_id UUID REFERENCES public.marketplace_apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
    used_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.marketplace_app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_oauth_codes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view their own installations" 
ON public.marketplace_app_installations FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_marketplace_app_installations_updated_at
BEFORE UPDATE ON public.marketplace_app_installations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Nota: A geração do JWT para SSO será feita em uma Edge Function por segurança (segredos não expostos no client)
