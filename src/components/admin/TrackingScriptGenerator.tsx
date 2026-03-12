import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code2, ClipboardCopy, CheckCircle2, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface PixelInfo {
  product_id: string;
  product_name: string;
  pixel_id: string;
  domain: string | null;
  platform: string;
}

interface Props {
  pixels: PixelInfo[];
  products: { id: string; name: string }[];
  checkoutBaseUrl: string;
}

const UTM_TEMPLATE = `utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}`;

export default function TrackingScriptGenerator({ pixels, products, checkoutBaseUrl }: Props) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || "");

  const productPixels = useMemo(
    () => pixels.filter((p) => p.product_id === selectedProduct && p.platform === "facebook"),
    [pixels, selectedProduct]
  );

  const selectedProductName = products.find((p) => p.id === selectedProduct)?.name || "";

  const generatedScript = useMemo(() => {
    if (!selectedProduct || productPixels.length === 0) return "";

    const pixelInits = productPixels
      .map((p) => `    fbq('set','autoConfig',false,'${p.pixel_id}');\n    fbq('init','${p.pixel_id}');`)
      .join("\n");

    const pixelIds = productPixels.map((p) => `'${p.pixel_id}'`).join(", ");
    const domain = productPixels[0]?.domain || "";
    const fbSrc = domain
      ? `https://${domain}/en_US/fbevents.js`
      : "https://connect.facebook.net/en_US/fbevents.js";

    return `<!-- PayCheckout Tracking · ${selectedProductName} -->
<script>
(function(){
  // === 1. Meta Pixel ===
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
  n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  '${fbSrc}');

${pixelInits}

  fbq('track','PageView');
  fbq('track','ViewContent',{content_type:'product',content_ids:['${selectedProduct}']});

  // === 2. Captura UTMs + fbclid ===
  var ps=new URLSearchParams(location.search);
  var utms={};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
    var v=ps.get(k); if(v) utms[k]=v;
  });
  if(Object.keys(utms).length) sessionStorage.setItem('pc_utms',JSON.stringify(utms));

  // fbclid → _fbc cookie
  var fbclid=ps.get('fbclid');
  if(fbclid && !document.cookie.match(/(^|;\\s*)_fbc=/)){
    var fbc='fb.1.'+Date.now()+'.'+fbclid;
    document.cookie='_fbc='+fbc+';max-age=7776000;path=/;SameSite=Lax';
  }

  // === 3. goToCheckout — redireciona com todos os params ===
  window.goToCheckout=function(configId){
    var base='${checkoutBaseUrl}/checkout/${selectedProduct}';
    var q=[];
    // UTMs
    var saved=sessionStorage.getItem('pc_utms');
    if(saved){try{var u=JSON.parse(saved);for(var k in u)q.push(k+'='+encodeURIComponent(u[k]))}catch(e){}}
    // fbclid / _fbp / _fbc
    var m=document.cookie.match(/(^|;\\s*)_fbc=([^;]*)/);
    if(m) q.push('fbc='+encodeURIComponent(m[2]));
    var m2=document.cookie.match(/(^|;\\s*)_fbp=([^;]*)/);
    if(m2) q.push('fbp='+encodeURIComponent(m2[2]));
    if(fbclid) q.push('fbclid='+encodeURIComponent(fbclid));
    if(configId) q.push('config='+encodeURIComponent(configId));
    location.href=base+(q.length?'?'+q.join('&'):'');
  };

  // === 4. Auto-patch links com href contendo "/checkout/${selectedProduct}" ===
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('a[href*="/checkout/${selectedProduct}"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var url=new URL(a.href);
        var cid=url.searchParams.get('config')||'';
        goToCheckout(cid);
      });
    });
  });
})();
</script>`;
  }, [selectedProduct, productPixels, selectedProductName, checkoutBaseUrl]);

  const copyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    toast.success("Script copiado!");
  };

  const copyUtm = () => {
    navigator.clipboard.writeText(UTM_TEMPLATE);
    toast.success("Parâmetros UTM copiados!");
  };

  return (
    <div className="space-y-4">
      {/* UTM Template for Meta Ads */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Parâmetros UTM para Meta Ads</h2>
            <p className="text-xs text-muted-foreground">Cole no campo "Parâmetros de URL" do Gerenciador de Anúncios</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
              {UTM_TEMPLATE}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 gap-1.5 text-xs"
              onClick={copyUtm}
            >
              <ClipboardCopy className="w-3.5 h-3.5" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ✅ Captura automática: source, campaign (nome|id), medium (conjunto|id), content (anúncio|id) e placement.
          </p>
        </div>
      </Card>

      {/* Script Generator */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <Code2 className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Script de Integração</h2>
            <p className="text-xs text-muted-foreground">Cole antes do &lt;/body&gt; na sua landing page</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum pixel do Facebook configurado. Configure em Produtos → Editar → Configurações.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Produto</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {productPixels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productPixels.map((px) => (
                    <Badge key={px.pixel_id} variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {px.pixel_id}
                    </Badge>
                  ))}
                  {productPixels[0]?.domain && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                      🌐 {productPixels[0].domain}
                    </Badge>
                  )}
                </div>
              )}

              {generatedScript ? (
                <div className="relative">
                  <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre">
                    {generatedScript}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 gap-1.5 text-xs"
                    onClick={copyScript}
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" /> Copiar script
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pixel Facebook encontrado para este produto.
                </p>
              )}

              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">O que o script faz:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Carrega o Meta Pixel e inicializa todos os IDs do produto</li>
                  <li>Dispara <strong>PageView</strong> + <strong>ViewContent</strong> (topo de funil)</li>
                  <li>Captura UTMs da URL e salva na sessão</li>
                  <li>Gera cookie <strong>_fbc</strong> a partir do fbclid (atribuição CAPI)</li>
                  <li>Propaga UTMs, fbclid, _fbp e _fbc para o checkout via query params</li>
                  <li>Patch automático de links apontando para o checkout deste produto</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
