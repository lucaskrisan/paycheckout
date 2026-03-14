import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

  const SUPABASE_URL = `https://vipltojtcrqatwvzobro.supabase.co`;
  const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcGx0b2p0Y3JxYXR3dnpvYnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTk4MTAsImV4cCI6MjA4ODY3NTgxMH0.rBq_Vw5aD_hPGpgDoatr2STFkxe_E4fLTX5Hot_MoMU`;

  const generatedScript = useMemo(() => {
    if (!selectedProduct || productPixels.length === 0) return "";
    const pixelInits = productPixels
      .map((p) => `    fbq('set','autoConfig',false,'${p.pixel_id}');\n    fbq('init','${p.pixel_id}');`)
      .join("\n");
    const domain = productPixels[0]?.domain || "";
    const fbSrc = domain ? `https://${domain}/en_US/fbevents.js` : "https://connect.facebook.net/en_US/fbevents.js";

    return `<!-- PayCheckout Tracking · ${selectedProductName} -->
<script>
(function(){
  // === Guard anti-loop: só executa 1x por sessão ===
  if(window.__pcTrackingFired) return;
  window.__pcTrackingFired = true;

  // === 1. Meta Pixel ===
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
  n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  '${fbSrc}');

${pixelInits}

  // === IMPORTANTE: Captura fbclid/fbc/fbp ANTES dos disparos ===
  var ps=new URLSearchParams(location.search);
  var fbclid=ps.get('fbclid');

  // fbclid → _fbc cookie (ANTES do CAPI)
  if(fbclid && !document.cookie.match(/(^|;\\s*)_fbc=/)){
    var fbc='fb.1.'+Date.now()+'.'+fbclid;
    document.cookie='_fbc='+fbc+';max-age=7776000;path=/;SameSite=Lax';
  }

  // Ensure _fbp cookie exists
  var fbpCk=(document.cookie.match(/(^|;\\s*)_fbp=([^;]*)/)||[])[2];
  if(!fbpCk){fbpCk='fb.1.'+Date.now()+'.'+Math.floor(1e9+Math.random()*9e9);document.cookie='_fbp='+fbpCk+';max-age=33696000;path=/;SameSite=Lax';}

  // Read _fbc after potential creation above
  var fbcCk=(document.cookie.match(/(^|;\\s*)_fbc=([^;]*)/)||[])[2]||null;

  // Visitor ID
  var vid=(document.cookie.match(/(^|;\\s*)_vid=([^;]*)/)||[])[2];
  if(!vid){vid='v_'+Date.now()+'_'+Math.random().toString(36).slice(2,12);document.cookie='_vid='+vid+';max-age=33696000;path=/;SameSite=Lax';}

  // === IDs de evento para deduplicação ===
  var pvId='pv_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  var vcId='vc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);

  // === Disparos Pixel (Browser) com eventID para deduplicação ===
  fbq('track','PageView',{},{eventID:pvId});
  fbq('track','ViewContent',{content_type:'product',content_ids:['${selectedProduct}']},{eventID:vcId});

  // === Disparos CAPI (Server) com mesmo eventID + fbc/fbp reais ===
  var capiUrl='${SUPABASE_URL}/functions/v1/facebook-capi';
  var commonParams={product_id:'${selectedProduct}',event_source_url:location.href,visitor_id:vid,user_agent:navigator.userAgent,fbp:fbpCk||null,log_browser:true};
  // IMPORTANTE: só envia fbc se existir (Meta rejeita fbc vazio)
  if(fbcCk) commonParams.fbc=fbcCk;
  fetch(capiUrl,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':'${SUPABASE_ANON_KEY}'},
    body:JSON.stringify(Object.assign({},commonParams,{event_name:'PageView',event_id:pvId}))
  }).catch(function(){});
  fetch(capiUrl,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':'${SUPABASE_ANON_KEY}'},
    body:JSON.stringify(Object.assign({},commonParams,{event_name:'ViewContent',event_id:vcId,custom_data:{content_type:'product',content_ids:['${selectedProduct}']}}))
  }).catch(function(){});

  // === 2. Captura UTMs ===
  var utms={};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
    var v=ps.get(k); if(v) utms[k]=v;
  });
  if(Object.keys(utms).length) sessionStorage.setItem('pc_utms',JSON.stringify(utms));

  // === 3. goToCheckout — redireciona com todos os params ===
  window.goToCheckout=function(configId){
    var base='${checkoutBaseUrl}/checkout/${selectedProduct}';
    var q=[];
    var saved=sessionStorage.getItem('pc_utms');
    if(saved){try{var u=JSON.parse(saved);for(var k in u)q.push(k+'='+encodeURIComponent(u[k]))}catch(e){}}
    var m=document.cookie.match(/(^|;\\s*)_fbc=([^;]*)/);
    if(m) q.push('fbc='+encodeURIComponent(m[2]));
    var m2=document.cookie.match(/(^|;\\s*)_fbp=([^;]*)/);
    if(m2) q.push('fbp='+encodeURIComponent(m2[2]));
    if(fbclid) q.push('fbclid='+encodeURIComponent(fbclid));
    if(vid) q.push('vid='+encodeURIComponent(vid));
    if(configId) q.push('config='+encodeURIComponent(configId));
    location.href=base+(q.length?'?'+q.join('&'):'');
  };

  // === 4. Auto-patch links ===
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

  const copyScript = () => { navigator.clipboard.writeText(generatedScript); toast.success("Script copiado!"); };
  const copyUtm = () => { navigator.clipboard.writeText(UTM_TEMPLATE); toast.success("Parâmetros UTM copiados!"); };

  return (
    <div className="space-y-3">
      {/* UTM Template */}
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2.5">
          <Megaphone className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Parâmetros UTM para Meta Ads</h2>
            <p className="text-[10px] text-slate-500">Cole no campo "Parâmetros de URL" do Gerenciador</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <pre className="bg-slate-900/60 border border-slate-700/30 rounded-md p-3 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
              {UTM_TEMPLATE}
            </pre>
            <Button size="sm" variant="outline" className="absolute top-1.5 right-1.5 gap-1 text-[10px] h-6 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={copyUtm}>
              <ClipboardCopy className="w-3 h-3" /> Copiar
            </Button>
          </div>
          <p className="text-[10px] text-slate-500">
            ✅ Captura: source, campaign (nome|id), medium (conjunto|id), content (anúncio|id) e placement.
          </p>
        </div>
      </div>

      {/* Script Generator */}
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2.5">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Script de Integração</h2>
            <p className="text-[10px] text-slate-500">Cole antes do &lt;/body&gt; na sua landing page</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {products.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum pixel Facebook configurado.</p>
          ) : (
            <>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="bg-slate-800/60 border-slate-700/50 text-slate-300 text-xs">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {productPixels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {productPixels.map((px) => (
                    <Badge key={px.pixel_id} variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {px.pixel_id}
                    </Badge>
                  ))}
                  {productPixels[0]?.domain && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      🌐 {productPixels[0].domain}
                    </Badge>
                  )}
                </div>
              )}

              {generatedScript ? (
                <div className="relative">
                  <pre className="bg-slate-900/60 border border-slate-700/30 rounded-md p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[350px] overflow-y-auto whitespace-pre">
                    {generatedScript}
                  </pre>
                  <Button size="sm" variant="outline" className="absolute top-1.5 right-1.5 gap-1 text-[10px] h-6 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={copyScript}>
                    <ClipboardCopy className="w-3 h-3" /> Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">Nenhum pixel Facebook neste produto.</p>
              )}

              <div className="bg-slate-900/40 border border-slate-700/20 rounded-md p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-slate-300">O que o script faz:</p>
                <ul className="text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
                  <li>Carrega o Meta Pixel e inicializa todos os IDs</li>
                  <li>Dispara <span className="text-slate-400">PageView</span> + <span className="text-slate-400">ViewContent</span></li>
                  <li>Captura UTMs e salva na sessão</li>
                  <li>Gera cookie <span className="text-slate-400">_fbc</span> a partir do fbclid</li>
                  <li>Propaga UTMs, fbclid, _fbp e _fbc ao checkout</li>
                  <li>Patch automático de links para o checkout</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
