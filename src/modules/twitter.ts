import { Twitter } from './types';

export function initTwitter() {
  if (typeof window === 'undefined') return;

  const d = document;
  const s = 'script';
  const id = 'twitter-wjs';
  const fjs = d.getElementsByTagName(s)[0];
  const t = (window as unknown as { twttr: Twitter }).twttr || ({} as Twitter);

  if (d.getElementById(id)) return t;

  const js = d.createElement(s) as HTMLScriptElement;
  js.id = id;
  js.src = "https://platform.twitter.com/widgets.js";
  
  if (fjs && fjs.parentNode) {
    fjs.parentNode.insertBefore(js, fjs);
  }

  t._e = [];
  t.ready = (f: (twttr: { widgets: { load: (el?: HTMLElement) => void } }) => void) => {
    t._e?.push(f);
  };

  (window as unknown as { twttr: Twitter }).twttr = t;
  return t;
}
