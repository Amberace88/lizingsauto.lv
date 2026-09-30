// Agrīnais skripts <head>: noķer pārlūka instalēšanas notikumu, pirms React ir ielādējies, un reģistrē service worker.
export const PWA_SCRIPT = `(function(){try{
window.__bip=null;
addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;dispatchEvent(new Event('la:bip'))});
addEventListener('appinstalled',function(){window.__bip=null;try{localStorage.setItem('la_pwa','installed')}catch(_){}dispatchEvent(new Event('la:installed'))});
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}
}catch(_){}})();`;
