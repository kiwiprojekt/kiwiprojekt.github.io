const { useState, useEffect, useMemo, useCallback, useRef } = React;

/* ===================== data ===================== */

const ORG = "kiwiprojekt";
const EXCLUDE = new Set(["kiwiprojekt.github.io"]);



function inferKind(repo) {
  const txt = `${(repo.topics||[]).join(" ")} ${repo.description||""} ${repo.name}`.toLowerCase();
  if (/library|sdk|package|binding/.test(txt)) return "library";
  if (/cli|tool|utility|downloader|generator/.test(txt)) return "tool";
  if (/app|game|player|site|dashboard|web/.test(txt)) return "app";
  if (repo.language === "C#") return "library";
  if (/HTML|JavaScript|TypeScript/.test(repo.language||"")) return "app";
  return "library";
}

function toProject(repo) {
  const tags = [repo.language, ...(repo.topics||[])].filter(Boolean).slice(0, 5);
  const year = new Date(repo.pushed_at || repo.updated_at || repo.created_at).getFullYear();
  return {
    id: repo.name, name: repo.name,
    tagline: repo.description || "—",
    description: repo.description || "No description yet.",
    tags, kind: inferKind(repo), year,
    stars: repo.stargazers_count || 0, forks: repo.forks_count || 0,
    language: repo.language || "—",
    highlight: repo.description || "",
    github: repo.html_url,
    demo: repo.homepage?.length > 0 ? repo.homepage : null,
    nuget: null, install: null,
    license: repo.license?.spdx_id || null,
    updatedAt: repo.pushed_at || repo.updated_at,
  };
}

async function fetchProjects() {
  const CACHE_KEY = `kp-repos-${ORG}`;
  const CACHE_TTL_MS = 10 * 60 * 1000;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { t, data } = JSON.parse(raw);
      if (Date.now() - t < CACHE_TTL_MS && Array.isArray(data)) return { projects: data, source: "cache" };
    }
  } catch {}
  try {
    const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?per_page=100&sort=pushed`, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const repos = await res.json();
    const projects = repos.filter(r => !r.fork && !r.archived && !EXCLUDE.has(r.name)).sort((a,b) => new Date(b.pushed_at) - new Date(a.pushed_at)).map(toProject);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: projects })); } catch {}
    return { projects, source: "live" };
  } catch (err) {
    return { projects: [], source: "error", error: err.message };
  }
}

/* ===================== icons ===================== */

const Icon = {
  github: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}><path d="M12 .5C5.73.5.67 5.56.67 11.83c0 4.98 3.23 9.2 7.71 10.69.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.64 1.22 3.28.93.1-.72.39-1.22.71-1.5-2.5-.28-5.14-1.25-5.14-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.44.11-3 0 0 .95-.3 3.1 1.16.9-.25 1.86-.37 2.82-.38.96.01 1.92.13 2.82.38 2.15-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.72.11 3 .72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.16 5.56.4.35.76 1.04.76 2.1 0 1.51-.01 2.73-.01 3.1 0 .3.2.65.78.54 4.48-1.5 7.7-5.72 7.7-10.69C23.33 5.56 18.27.5 12 .5Z"/></svg>,
  external: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>,
  nuget: (p) => <svg viewBox="0 0 32 32" width="1em" height="1em" fill="currentColor" {...p}><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="11" cy="13" r="2.2"/><circle cx="21" cy="13" r="2.2"/><circle cx="11" cy="21" r="2.2"/><circle cx="21" cy="21" r="2.2"/></svg>,
  sun: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  moon: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>,
  close: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  star: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  copy: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>,
  settings: (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
};

/* ===================== logo ===================== */

const Logo = ({ size = 36, mono = false }) => {
  const c1 = mono ? "var(--fg)" : "var(--kiwi-sage)";
  const c2 = mono ? "var(--fg)" : "var(--kiwi-lime)";
  const c3 = mono ? "var(--fg)" : "var(--kiwi-yellow)";
  const o = mono ? 0.35 : 0.9;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-label="kiwiprojekt" style={{ display: "block" }}>
      <defs><filter id="kp-blend"><feGaussianBlur stdDeviation="0.3"/></filter></defs>
      <g filter="url(#kp-blend)">
        <polygon points="20,6 37,6 45.5,20.8 37,35.6 20,35.6 11.5,20.8" fill={c1} opacity={o}/>
        <polygon points="12,22 29,22 37.5,36.8 29,51.6 12,51.6 3.5,36.8" fill={c2} opacity={o} style={{mixBlendMode:"multiply"}}/>
        <polygon points="28,22 45,22 53.5,36.8 45,51.6 28,51.6 19.5,36.8" fill={c3} opacity={o} style={{mixBlendMode:"multiply"}}/>
      </g>
    </svg>
  );
};

/* ===================== shared ===================== */

const LANG_COLORS = {
  "C#": "#68217a", "TypeScript": "#3178c6", "JavaScript": "#f1e05a", "Go": "#00add8", "Rust": "#dea584",
};

const LangDot = ({ lang }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.78rem", color:"var(--fg-dim)" }}>
    <span style={{ width:9, height:9, borderRadius:"50%", background: LANG_COLORS[lang]||"#888", boxShadow:"inset 0 0 0 0.5px rgba(0,0,0,0.15)" }}/>
    {lang}
  </span>
);

const LinkButton = ({ href, icon, children, variant = "ghost" }) => {
  if (!href) return null;
  const I = Icon[icon];
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`kp-link kp-link-${variant}`} onClick={e => e.stopPropagation()}>
      {I && <I />}<span>{children}</span>
    </a>
  );
};

const CopyLine = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="kp-copyline" onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1400); }} role="button" tabIndex={0}>
      <code>{text}</code>
      <button aria-label="copy" className="kp-copybtn">{copied ? "copied" : <Icon.copy/>}</button>
    </div>
  );
};

const ProjectModal = ({ project, onClose }) => {
  useEffect(() => {
    if (!project) return;
    const onKey = e => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [project, onClose]);
  if (!project) return null;
  const p = project;
  return (
    <div className="kp-modal-scrim" onClick={onClose}>
      <div className="kp-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="kp-modal-close" onClick={onClose} aria-label="Close"><Icon.close/></button>
        <div className="kp-modal-head">
          <div className="kp-modal-kind">{p.kind}</div>
          <h2 className="kp-modal-title">{p.name}</h2>
          <p className="kp-modal-tagline">{p.tagline}</p>
          <div className="kp-modal-meta">
            <LangDot lang={p.language}/>
            <span className="kp-dot-sep">·</span>
            <span><Icon.star style={{color:"var(--accent)",verticalAlign:"-2px"}}/> {p.stars.toLocaleString()}</span>
            <span className="kp-dot-sep">·</span>
            <span>{p.year}</span>
          </div>
        </div>
        <div className="kp-modal-body">
          <p className="kp-modal-desc">{p.description}</p>
          <div className="kp-modal-highlight">
            <span className="kp-modal-highlight-label">Highlight</span>
            <span>{p.highlight}</span>
          </div>
          {p.install && <div className="kp-modal-install"><div className="kp-modal-install-label">Install</div><CopyLine text={p.install}/></div>}
          <div className="kp-modal-tags">{p.tags.map(t=><span key={t} className="kp-tag">{t}</span>)}</div>
          <div className="kp-modal-actions">
            <LinkButton href={p.github} icon="github" variant="primary">View on GitHub</LinkButton>
            <LinkButton href={p.demo} icon="external">Live demo</LinkButton>
            <LinkButton href={p.nuget} icon="nuget">NuGet</LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
};

function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("kp-theme")||"light"; } catch { return "light"; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem("kp-theme", theme); } catch {} }, [theme]);
  const toggle = useCallback(() => setTheme(t => t==="light"?"dark":"light"), []);
  return [theme, toggle];
}

function useMouseGlow() {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const pending = useRef(null);
  const flush = useCallback(() => {
    rafRef.current = 0;
    const el = ref.current; const p = pending.current;
    if (!el || !p) return;
    el.style.setProperty("--mx", p.x + "%");
    el.style.setProperty("--my", p.y + "%");
  }, []);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    pending.current = { x: ((e.clientX-r.left)/r.width)*100, y: ((e.clientY-r.top)/r.height)*100 };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
  }, [flush]);
  const onEnter = useCallback(() => { const el = ref.current; if (el) el.style.setProperty("--glow","1"); }, []);
  const onLeave = useCallback(() => { const el = ref.current; if (el) el.style.setProperty("--glow","0"); }, []);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  return { ref, onPointerMove: onMove, onPointerEnter: onEnter, onPointerLeave: onLeave };
}

/* ===================== variant B fancy ===================== */

const VariantBFancy = ({ onOpen, projects = [], source = "loading", onRefetch }) => {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const TYPING_LINES = [
    { prompt: "whoami", out: "kiwiprojekt — building sharp, small tools." },
    { prompt: "ls ./projects", out: null },
  ];
  const TOTAL_CHARS = TYPING_LINES.reduce((s, l) => s + l.prompt.length, 0);
  const [charCount, setCharCount] = useState(0);
  const [linesRevealed, setLinesRevealed] = useState(0);

  useEffect(() => {
    if (charCount >= TOTAL_CHARS) return;
    const id = setTimeout(() => setCharCount(c => c + 1), 55);
    return () => clearTimeout(id);
  }, [charCount]);

  const lineChars = [];
  let rem = charCount;
  for (const l of TYPING_LINES) { const s = Math.min(rem, l.prompt.length); lineChars.push(s); rem = Math.max(0, rem - l.prompt.length); }

  useEffect(() => {
    const typed = lineChars.filter((c,i) => c >= TYPING_LINES[i].prompt.length).length;
    if (typed > linesRevealed) { const id = setTimeout(()=>setLinesRevealed(typed),200); return ()=>clearTimeout(id); }
  }, [charCount]);

  const allTyped = charCount >= TOTAL_CHARS;

  const filtered = useMemo(() => projects.filter(p => {
    if (filter !== "all" && p.kind !== filter) return false;
    if (q && !(p.name.toLowerCase().includes(q.toLowerCase()) || p.tagline.toLowerCase().includes(q.toLowerCase()) || p.tags.join(" ").toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [projects, filter, q]);

  const counts = useMemo(() => ({
    all: projects.length,
    library: projects.filter(p=>p.kind==="library").length,
    tool: projects.filter(p=>p.kind==="tool").length,
    app: projects.filter(p=>p.kind==="app").length,
  }), [projects]);

  return (
    <div className="vbf-root"
      onMouseMove={(e) => { const r=e.currentTarget.getBoundingClientRect(); setMouse({x:((e.clientX-r.left)/r.width)*100,y:((e.clientY-r.top)/r.height)*100}); }}
      style={{"--mx":`${mouse.x}%`,"--my":`${mouse.y}%`}}
    >
      <div className="vbf-bg" aria-hidden="true">
        <div className="vbf-bg-grid"/>
        <div className="vbf-bg-spot"/>
        <div className="vbf-bg-noise"/>
        <div className="vbf-bg-orb vbf-bg-orb-1"/>
        <div className="vbf-bg-orb vbf-bg-orb-2"/>
        <div className="vbf-bg-orb vbf-bg-orb-3"/>
        <div className="vbf-bg-scan"/>
      </div>

      <header className="vbf-term">
        <div className="vbf-term-bar">
          <span className="vb-dot vb-dot-r"/><span className="vb-dot vb-dot-y"/><span className="vb-dot vb-dot-g"/>
          <span className="vbf-term-title">~/kiwiprojekt — zsh — 96×24</span>
          <span className="vbf-term-live"><span className="vbf-pulse"/> connected</span>
        </div>
        <div className="vbf-term-body">
          {TYPING_LINES.map((l, i) => {
            const shown = lineChars[i] || 0;
            const isCurrentLine = shown < l.prompt.length || (i === TYPING_LINES.length - 1 && !allTyped);
            const lineFinished = shown >= l.prompt.length;
            const outputVisible = linesRevealed > i && lineFinished;
            return (
              <React.Fragment key={i}>
                <div className="vbf-line">
                  <span className="vb-prompt">kiwi@pl</span>{" "}<span className="vb-cursor">~ $</span>{" "}
                  <span className="vbf-typed">{l.prompt.slice(0, shown)}</span>
                  {isCurrentLine && <span className="vb-caret"/>}
                </div>
                {l.out && outputVisible && <div className="vbf-line vb-out vbf-fadein">{l.out}</div>}
                {l.prompt === "ls ./projects" && outputVisible && (
                  <div className="vb-filelist vbf-fadein">
                    {projects.map((p,idx) => <span key={p.id} className="vbf-filename" style={{animationDelay:`${idx*60}ms`}}>{p.name}</span>)}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {allTyped && <>
            <div className="vbf-line vbf-fadein">
              <span className="vb-prompt">kiwi@pl</span>{" "}<span className="vb-cursor">~ $</span>{" "}
              curl api.github.com/orgs/kiwiprojekt/repos{" "}
              <span className={"vb-status vb-status-"+source}>
                {source==="loading" && <>→ fetching…</>}
                {source==="live"    && <>✓ live ({projects.length} repos)</>}
                {source==="cache"   && <>✓ cached ({projects.length} repos)</>}
                {source==="error"   && <>✗ fetch failed</>}
              </span>
              {onRefetch && <button className="vb-refetch" onClick={onRefetch} title="Re-fetch">refresh</button>}
            </div>
            <div className="vbf-line vbf-fadein">
              <span className="vb-prompt">kiwi@pl</span> <span className="vb-cursor">~ $</span>{" "}
              <span className="vb-caret"/>
            </div>
          </>}
        </div>
      </header>

      <div className="vbf-toolbar">
        <div className="vbf-filters">
          {["all","library","tool","app"].map(f => (
            <button key={f} className={"vbf-filter"+(filter===f?" is-active":"")} onClick={()=>setFilter(f)}>
              <span className="vbf-filter-label">{f}</span>
              <span className="vb-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="vbf-search">
          <span className="vb-search-slash">/</span>
          <input placeholder="filter by name, tag, or keyword…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      </div>

      <section className="vbf-table" role="table">
        <div className="vbf-thead" role="row">
          <span>name</span><span>kind</span><span>lang</span>
          <span className="vb-th-right">stars</span><span>tags</span><span>links</span>
        </div>
        {filtered.map((p,i) => <VBFRow key={p.id} p={p} i={i} onOpen={onOpen}/>)}
        {filtered.length === 0 && <div className="vb-empty">// no matches — try a different filter</div>}
      </section>

      <footer className="vbf-footer">
        <span>// kiwiprojekt.pl</span>
        <span>→ <a href="https://github.com/kiwiprojekt" target="_blank" rel="noopener noreferrer">github.com/kiwiprojekt</a></span>
        <span>© 2026</span>
      </footer>
    </div>
  );
};

const VBFRow = ({ p, i, onOpen }) => {
  const glow = useMouseGlow();
  return (
    <div className="vbf-trow" role="row" onClick={()=>onOpen(p)} style={{"--row-delay":`${i*70}ms`}} {...glow}>
      <span className="vbf-row-bg" aria-hidden="true"/>
      <span className="vb-cell vb-name">
        <span className="vb-name-main">{p.name}</span>
        <span className="vb-name-sub">{p.tagline}</span>
      </span>
      <span className="vb-cell vb-kind">{p.kind}</span>
      <span className="vb-cell"><LangDot lang={p.language}/></span>
      <span className="vb-cell vb-stars"><Icon.star/> {p.stars.toLocaleString()}</span>
      <span className="vb-cell vb-tags">{p.tags.map(t=><span key={t} className="vb-tag">{t}</span>)}</span>
      <span className="vb-cell vb-links">
        {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="GitHub"><Icon.github/></a>}
        {p.demo   && <a href={p.demo}   target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="Live demo"><Icon.external/></a>}
        {p.nuget  && <a href={p.nuget}  target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="NuGet"><Icon.nuget/></a>}
      </span>
      <span className="vbf-row-arrow" aria-hidden="true">→</span>
    </div>
  );
};

/* ===================== app ===================== */

const TWEAK_DEFAULTS = { accent: "lime", density: "comfortable" };

const ACCENTS = {
  lime:   { name:"Kiwi lime", accent:"oklch(0.82 0.18 132)", accentDeep:"oklch(0.58 0.14 138)", accentSoft:"oklch(0.93 0.09 125)" },
  sage:   { name:"Sage",      accent:"oklch(0.78 0.10 142)", accentDeep:"oklch(0.52 0.08 146)", accentSoft:"oklch(0.92 0.05 140)" },
  citrus: { name:"Citrus",    accent:"oklch(0.88 0.18 105)", accentDeep:"oklch(0.62 0.15 98)",  accentSoft:"oklch(0.95 0.09 102)" },
  forest: { name:"Forest",    accent:"oklch(0.62 0.13 152)", accentDeep:"oklch(0.42 0.10 152)", accentSoft:"oklch(0.90 0.06 148)" },
  ink:    { name:"Ink",       accent:"oklch(0.30 0.02 140)", accentDeep:"oklch(0.18 0.01 140)", accentSoft:"oklch(0.92 0.01 140)" },
};

const FONT_TECH = {
  display: "'JetBrains Mono', ui-monospace, monospace",
  body: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

function useTweaks() {
  const [tweaks, setTweaks] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("kp-tweaks-fancy")||"null"); return {...TWEAK_DEFAULTS,...(s||{})}; }
    catch { return {...TWEAK_DEFAULTS}; }
  });
  const update = useCallback((patch) => {
    setTweaks(prev => { const next={...prev,...patch}; try{localStorage.setItem("kp-tweaks-fancy",JSON.stringify(next));}catch{} return next; });
  }, []);
  return [tweaks, update];
}

const TweaksPanel = ({ tweaks, update, onClose }) => (
  <div className="kp-tweaks" role="dialog" aria-label="Tweaks">
    <div className="kp-tweaks-head">
      <span>Tweaks</span>
      <button onClick={onClose} aria-label="close"><Icon.close/></button>
    </div>
    <div className="kp-tweak">
      <label>Accent</label>
      <div className="kp-tweak-accents">
        {Object.entries(ACCENTS).map(([k,v]) => (
          <button key={k} title={v.name} className={"kp-tweak-swatch"+(tweaks.accent===k?" is-on":"")} style={{background:v.accent}} onClick={()=>update({accent:k})}/>
        ))}
      </div>
    </div>
    <div className="kp-tweak">
      <label>Density</label>
      <div className="kp-tweak-seg">
        {[["compact","Compact"],["comfortable","Comfortable"],["airy","Airy"]].map(([k,name]) => (
          <button key={k} className={"kp-tweak-seg-btn"+(tweaks.density===k?" is-on":"")} onClick={()=>update({density:k})}>{name}</button>
        ))}
      </div>
    </div>
  </div>
);

const TopBar = ({ theme, onToggleTheme, tweaksOpen, onToggleTweaks }) => (
  <div className="kp-topbar">
    <div className="kp-topbar-left">
      <Logo size={28}/>
      <span className="kp-topbar-name">kiwiprojekt.pl</span>
    </div>
    <div className="kp-topbar-right">
      <button className="kp-iconbtn" onClick={onToggleTweaks} aria-label="Tweaks" title="Tweaks"><Icon.settings/></button>
      <button className="kp-iconbtn" onClick={onToggleTheme} aria-label="Toggle theme">{theme==="light"?<Icon.moon/>:<Icon.sun/>}</button>
      <a className="kp-iconbtn" href="https://github.com/kiwiprojekt" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Icon.github/></a>
    </div>
  </div>
);

const App = () => {
  const [theme, toggleTheme] = useTheme();
  const [tweaks, updateTweaks] = useTweaks();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [modalProj, setModalProj] = useState(null);
  const [projects, setProjects] = useState([]);
  const [source, setSource] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => { const res = await fetchProjects(); if (cancelled) return; setProjects(res.projects); setSource(res.source); })();
    return () => { cancelled = true; };
  }, []);

  const refetch = useCallback(async () => {
    try { sessionStorage.removeItem(`kp-repos-${ORG}`); } catch {}
    setSource("loading");
    const res = await fetchProjects();
    setProjects(res.projects); setSource(res.source);
  }, []);

  useEffect(() => {
    const a = ACCENTS[tweaks.accent] || ACCENTS.lime;
    const r = document.documentElement;
    r.style.setProperty("--accent", a.accent);
    r.style.setProperty("--accent-deep", a.accentDeep);
    r.style.setProperty("--accent-soft", a.accentSoft);
    r.style.setProperty("--font-display", FONT_TECH.display);
    r.style.setProperty("--font-body", FONT_TECH.body);
    r.style.setProperty("--font-mono", FONT_TECH.mono);
    r.dataset.density = tweaks.density;
  }, [tweaks]);

  return (
    <>
      <TopBar theme={theme} onToggleTheme={toggleTheme} tweaksOpen={tweaksOpen} onToggleTweaks={()=>setTweaksOpen(o=>!o)}/>
      <main>
        <VariantBFancy onOpen={setModalProj} projects={projects} source={source} onRefetch={refetch}/>
      </main>
      {tweaksOpen && <TweaksPanel tweaks={tweaks} update={updateTweaks} onClose={()=>setTweaksOpen(false)}/>}
      <ProjectModal project={modalProj} onClose={()=>setModalProj(null)}/>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
