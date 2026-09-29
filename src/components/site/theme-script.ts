/** Iestata tēmu pirms lapas attēlošanas (bez mirgošanas). */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('ta_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;
