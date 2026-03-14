import { supabase } from "@/integrations/supabase/client";

export async function resolveUserDestination() {
  const { data, error } = await supabase.functions.invoke("resolve-user-destination", {
    body: {},
  });

  if (error) {
    throw error;
  }

  return (data?.destination as string | undefined) ?? "/completar-perfil";
}
