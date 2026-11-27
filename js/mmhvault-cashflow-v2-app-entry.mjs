/* Explicit opt-in app mount. The host must supply lexical bindings from app.html.
 * Does not auto-run, hide legacy UI, modify navigation or request network data. */
import {buildAdapter,makeLegacyPorts} from './mmhvault-cashflow-v2-adapter.mjs?v=2.0.49';
import {mountCashflowV2} from './mmhvault-cashflow-v2-ui.mjs?v=2.0.51';
const mounts=new WeakMap();
export function validAppBindings(b){
 return !!b&&['owner','configOwner','config','currencies','groupOf','isLinkedInvestment'].every(k=>typeof b[k]==='function');
}
export function mountAppCashflowV2(root,bindings){
 if(!root?.ownerDocument?.defaultView||!validAppBindings(bindings))throw TypeError('Explicit app bindings required');
 if(mounts.has(root))return mounts.get(root);
 const host=root.ownerDocument.defaultView;
 const ports=makeLegacyPorts(host,bindings);
 // Explicitly do not bind legacy estimates as verified current/historical assets.
 const adapter=buildAdapter(ports),ui=mountCashflowV2(root,adapter);
 const handle={refresh:ui.refresh,destroy(){ui.destroy();mounts.delete(root)}};
 mounts.set(root,handle);return handle;
}
