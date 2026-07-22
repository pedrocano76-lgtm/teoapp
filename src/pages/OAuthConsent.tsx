import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo, BrandWordmark } from "@/components/Brand";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string };
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? "");
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("El servidor no devolvió URL de redirección.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-3 text-center">
          <BrandLogo size={48} />
          <h1 className="text-xl font-medium">No se pudo cargar esta autorización</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </main>
    );
  }

  const clientName = details.client?.name ?? "una aplicación externa";
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-6 rounded-2xl border p-6 bg-card">
        <div className="flex items-center gap-2">
          <BrandLogo size={36} />
          <BrandWordmark style={{ fontSize: 18, lineHeight: 1 }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-medium">Conectar {clientName} a Memory Drawer</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} podrá usar las herramientas de Memory Drawer actuando como tú
            mientras hayas iniciado sesión. Se respetan tus permisos por hijo; no
            se salta ninguna regla de acceso del backend.
          </p>
          {account && (
            <p className="text-xs text-muted-foreground">
              Cuenta: <span className="font-medium">{account}</span>
            </p>
          )}
        </div>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Leer tus hijos, eventos y fotos recientes</li>
          <li>• Crear eventos en hijos donde tienes permiso de edición</li>
        </ul>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            Aprobar
          </Button>
        </div>
      </div>
    </main>
  );
}
