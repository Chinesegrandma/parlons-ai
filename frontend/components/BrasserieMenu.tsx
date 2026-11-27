import { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";
import menu from "../lib/brasserie.json";
import type { Language } from "../lib/types";

const tabs = ["Entrées", "Plats", "Desserts", "Boissons"];
const euro = new Intl.NumberFormat("fr-FR", {maximumFractionDigits: 2, minimumFractionDigits: 2});

export function MenuInvitation({open}: {open: () => void}) {
  return <button className="menu-invitation" onClick={open} lang="fr">
    <span className="menu-mini-cover" aria-hidden="true">B<span>de</span>P</span>
    <span><strong>Brasserie de Paris</strong><small>Œufs mayonnaise · Steak-frites</small>
    <b>Voir la carte <BookOpen size={14}/></b></span>
  </button>;
}

export function BrasserieMenu({language, close, ask}: {
  language: Language; close: () => void; ask: (text: string) => void;
}) {
  const [section, setSection] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tall, setTall] = useState(false);
  const startY = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dismiss.current?.focus({preventScroll:true});
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", escape);
    return () => {window.removeEventListener("keydown", escape); previous?.focus({preventScroll:true});};
  }, []);
  const [title, dishes] = Object.entries(menu)[section];
  return <aside className={'brasserie-sheet' + (tall ? ' tall' : '')} aria-label="La carte de la Brasserie de Paris" lang="fr">
    <button className="menu-handle" aria-label={tall ? "Réduire la carte" : "Agrandir la carte"} onClick={()=>setTall(!tall)}
      onTouchStart={e=>{startY.current=e.touches[0].clientY;}}
      onTouchEnd={e=>{const delta=e.changedTouches[0].clientY-startY.current; if(delta < -32)setTall(true); if(delta > 32){if(tall)setTall(false);else close();}}}><span/></button>
    <button ref={dismiss} className="menu-dismiss" aria-label="Fermer la carte" onClick={close}><X size={18}/></button>
    <header className="menu-mast">
      <div className="brasserie-etching" aria-hidden="true"/>
      <p>CUISINE FRANÇAISE TRADITIONNELLE</p>
      <h2>Brasserie <em>de</em> Paris</h2>
      <div className="menu-fleur" aria-hidden="true">✿</div>
    </header>
    <nav className="menu-sections" aria-label="Rubriques de la carte">{tabs.map((label,i)=>
      <button key={label} aria-pressed={section===i} onClick={()=>{setSection(i);setExpanded(null);list.current?.scrollTo(0,0);}}>{label}</button>)}</nav>
    <div className="menu-items" ref={list}>
      <h3>{title}</h3>
      {dishes.map(dish=><div key={dish.name} className="menu-dish">
        <button aria-expanded={expanded===dish.name} onClick={()=>setExpanded(expanded===dish.name ? null : dish.name)}>
          <span><strong>{dish.name}</strong><small>{dish.detail}</small></span>
          <span className="menu-price">{dish.price ? (Number.isInteger(dish.price) ? dish.price : euro.format(dish.price))+" €" : "Offerte"}</span>
        </button>
        {expanded===dish.name && <div className="dish-meaning"><span>{dish[language]}</span><button onClick={()=>ask('Pouvez-vous me parler de ce choix sur la carte : « '+dish.name+' » ?')}>{language==="zh"?"问问这道菜":"Ask about this item"}</button></div>}
      </div>)}
    </div>
  </aside>;
}
