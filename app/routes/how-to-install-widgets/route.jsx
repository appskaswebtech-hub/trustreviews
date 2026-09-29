import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import InstallVideo from "./InstallVideo";
import { LOGO_URL, NON_THEME_NOTES, WIDGETS, darken, logoIconStyle, swatch, widgetImage } from "./guideData";
import pageCss from "./styles.css?raw";

// Public install guide: /how-to-install-widgets
// No loader and no authenticate.admin(), so it opens without a shop session.

export const links = () => [{ rel: "icon", type: "image/png", href: LOGO_URL }];

export const meta = () => [
  { title: "How to install Trust Reviews widgets" },
  { name: "description", content: "Step-by-step guide with a 20-second video for every Trust Reviews widget, using the Shopify Theme Editor (Customize)." },
];

const VIDEO_WIDGETS = WIDGETS.filter((w) => w.hasVideo);
const OVERVIEW_WIDGET = WIDGETS.find((w) => w.key === "review_widget");

function stepsFor(w) {
  const steps = [
    <>In Shopify admin go to <b>Online Store → Themes</b> and click <b>Customize</b> on your current theme.</>,
    <>From the dropdown at the top, open <b>Products › Default product</b> (or any page where you want the widget).</>,
    <>Click <b>Add section</b>, open the <b>Apps</b> tab, search “Trust” and choose <b>{w.block}</b>.</>,
    <>Drag the <b>⋮⋮</b> handle of the new Apps section to move the widget up or down the page.</>,
  ];
  if (w.blockHandle === "reviews-widget") {
    steps.push(<>In the block settings on the right, set <b>Show this widget</b> to <b>{w.title}</b>.</>);
  } else {
    steps.push(<>Check the <b>{w.block}</b> block settings on the right. Colors and layout come from <b>Trust Reviews → Widgets → {w.title}</b>.</>);
  }
  steps.push(<>Click <b>Save</b> in the top-right. The widget is now live.</>);
  return steps;
}

function VideoModal({ widget, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="hiw-modalBackdrop" onClick={onClose} role="presentation">
      <div className="hiw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`How to install ${widget.title}`}>
        <div className="hiw-modalHead">
          <div>
            <div className="hiw-eyebrow">Installation video · 0:20</div>
            <h3 className="hiw-modalTitle">How to install {widget.title}</h3>
          </div>
          <button type="button" className="hiw-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {widget.hasVideo ? (
          <div className="hiw-modalBody">
            <InstallVideo widget={widget} autoPlay className="hiw-modalVideo" />
            <div className="hiw-modalSteps">
              <div className="hiw-blockTag">Theme block: <b>{widget.block}</b></div>
              <ol className="hiw-steps">
                {stepsFor(widget).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          </div>
        ) : (
          <p className="hiw-lead">{NON_THEME_NOTES[widget.key]}</p>
        )}
      </div>
    </div>
  );
}

// Same layout as the widget cards on the app's Widgets page.
function WidgetCard({ w, onOpen }) {
  return (
    <button type="button" className="hiw-widgetCard" onClick={() => onOpen(w.key)}>
      <div className="hiw-thumb" style={{ background: w.bg }}>
        <img src={widgetImage(w)} alt={`${w.title} preview`} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <span className="hiw-letter" style={{ background: darken(swatch(w.bg), 0.4) }}>{w.title.charAt(0).toUpperCase()}</span>
        {w.badge && <span className="hiw-badge">{w.badge}</span>}
        {w.hasVideo && <span className="hiw-duration">▶ 0:20</span>}
      </div>
      <div className="hiw-cardBody">
        <div className="hiw-cardTitle">{w.title}</div>
        <div className="hiw-cardDesc">{w.description}</div>
        <div className="hiw-cardActions">
          {w.hasVideo ? (
            <>
              <span className="hiw-btnSolid">▶ Watch video</span>
              <span className="hiw-btnSoft">{w.block}</span>
            </>
          ) : (
            <span className="hiw-btnSoft">Learn more →</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function HowToInstallWidgets() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const openWidget = WIDGETS.find((w) => w.key === params.get("widget"));
  const openVideo = (key) => setParams({ widget: key }, { preventScrollReset: true });
  const closeVideo = () => setParams({}, { preventScrollReset: true });

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? WIDGETS.filter((w) => w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)) : WIDGETS;
  }, [search]);

  return (
    <div className="hiw-page">
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />
      <header className="hiw-topbar">
        <div className="hiw-brand"><span className="hiw-logo" style={logoIconStyle} aria-hidden="true" /> Trust Reviews <span className="hiw-muted">/ Help</span></div>
        <nav className="hiw-topnav">
          <a href="#steps">Steps</a>
          <a href="#customize">Theme Editor</a>
          <a href="#videos">Videos</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <section className="hiw-hero">
        <div className="hiw-heroText">
          <div className="hiw-eyebrow">Installation guide</div>
          <h1>How to install Trust Reviews widgets</h1>
          <p>
            Every widget is added in Shopify&apos;s Theme Editor: <b>Online Store → Themes → Customize</b>.
            Each widget has a 20-second video showing exactly how to add and use it in Customize.
          </p>
          <div className="hiw-heroCtas">
            <a className="hiw-btnPrimary" href="#videos">Browse {VIDEO_WIDGETS.length} widget videos</a>
            <a className="hiw-btnGhost" href="#steps">Read the steps</a>
          </div>
        </div>
        <div className="hiw-heroVideo">
          <InstallVideo widget={OVERVIEW_WIDGET} />
          <div className="hiw-caption">Overview: installing the {OVERVIEW_WIDGET.title}</div>
        </div>
      </section>

      <main className="hiw-main">
        <section id="before" className="hiw-card">
          <h2>Before you start</h2>
          <ul className="hiw-checklist">
            <li><b>Install the Trust Reviews app</b> on your Shopify store. All widgets appear in Customize after that.</li>
            <li><b>Design the widget in the app first:</b> <i>Trust Reviews → Widgets → [widget] → Configure</i>. The theme block only places it on the page.</li>
            <li><b>Use an Online Store 2.0 theme</b> (Dawn, Refresh, Sense, Craft or most themes released since 2021). App blocks only work in 2.0 themes.</li>
          </ul>
        </section>

        <section id="steps" className="hiw-section">
          <h2>Install any widget in 6 steps</h2>
          <div className="hiw-stepGrid">
            {[
              ["Open Customize", "Shopify admin → Online Store → Themes → Customize."],
              ["Pick the page", "Top dropdown → Products › Default product, Home page or any other page."],
              ["Add the block", "Add section → Apps tab → search “Trust” → choose the widget's block."],
              ["Move it", "Drag the ⋮⋮ handle to place the widget where you want it."],
              ["Block settings", "For the Trust Reviews block, “Show this widget” picks which widget it shows."],
              ["Save", "Click Save in the top-right. Open your store to check the widget."],
            ].map(([title, text], i) => (
              <div key={title} className="hiw-step">
                <span className="hiw-stepNum">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="hiw-card hiw-manual">
            <h3>Shortcut from the app</h3>
            <p>In <b>Trust Reviews → Widgets</b>, the <b>Install ↗</b> button on a widget card opens Customize with that block already added to the product page. Then move it and click <b>Save</b>.</p>
          </div>
        </section>

        <section id="customize" className="hiw-section">
          <h2>Using the Shopify Theme Editor (Customize)</h2>
          <p className="hiw-lead">These are the parts of the Theme Editor you use for Trust Reviews widgets.</p>
          <div className="hiw-editorMap">
            <div className="hiw-mapTop">
              <span className="hiw-pin">A</span> Template dropdown
              <span className="hiw-mapSave"><span className="hiw-pin">F</span> Save</span>
            </div>
            <div className="hiw-mapBody">
              <div className="hiw-mapRail"><span className="hiw-pin">B</span></div>
              <div className="hiw-mapSidebar">
                <span className="hiw-pin">C</span> Sections & blocks
                <div className="hiw-mapAdd"><span className="hiw-pin">D</span> Add block / Add section</div>
              </div>
              <div className="hiw-mapPreview">Live preview of your store</div>
              <div className="hiw-mapSettings"><span className="hiw-pin">E</span> Block settings</div>
            </div>
          </div>
          <div className="hiw-legend">
            <div><span className="hiw-pin">A</span><div><b>Template dropdown</b> switches the page you are editing. Product widgets go on <i>Products › Default product</i>. Switch to <i>Home page</i> or a <i>Page</i> to add widgets there.</div></div>
            <div><span className="hiw-pin">B</span><div><b>Icon bar</b>: keep <i>Sections</i> selected. That's where you add and arrange Trust Reviews widgets.</div></div>
            <div><span className="hiw-pin">C</span><div><b>Sections & blocks</b> lists everything on the page, top to bottom. Drag the <b>⋮⋮</b> handle to reorder, click the eye icon to hide, click a block to open its settings.</div></div>
            <div><span className="hiw-pin">D</span><div><b>Add block vs Add section</b>: <i>Add block</i> puts the widget inside a section. <i>Add section</i> gives it a full-width row. In both, open the <b>Apps</b> tab to find the Trust Reviews blocks.</div></div>
            <div><span className="hiw-pin">E</span><div><b>Block settings</b>: for the <b>Trust Reviews</b> block choose the widget in <i>Show this widget</i>. Other blocks take their design from the app.</div></div>
            <div><span className="hiw-pin">F</span><div><b>Save</b>: nothing is live until you save. Use the desktop/mobile icons next to it to check both views.</div></div>
          </div>
        </section>

        <section id="videos" className="hiw-section">
          <div className="hiw-widgetsHeader">
            <div>
              <h2>Widgets</h2>
              <p className="hiw-lead">The same widgets as the app's Widgets page, in the same order. Click a card to watch its 20-second install video.</p>
            </div>
            <input className="hiw-search" type="search" placeholder="Search widgets…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search widgets" />
          </div>
          <div className="hiw-grid">
            {list.map((w) => <WidgetCard key={w.key} w={w} onOpen={openVideo} />)}
            {list.length === 0 && <div className="hiw-empty">No widgets found for “{search}”</div>}
          </div>
        </section>

        <section id="faq" className="hiw-section">
          <h2>Troubleshooting</h2>
          <div className="hiw-faq">
            {[
              ["I can't see Trust Reviews under the Apps tab.", "Make sure the app is installed and your theme is an Online Store 2.0 theme. Some sections don't accept app blocks. If so, use Add section → Apps instead of Add block."],
              ["The block is added but nothing shows on the storefront.", "Make sure you clicked Save in the Theme Editor. Check that the product has reviews, or that the widget is enabled in the app."],
              ["The wrong widget is showing.", "Select the Trust Reviews block and change “Show this widget” from Auto to the widget you want."],
              ["It shows on one product but not another.", "That product uses a different product template. Switch to it in the template dropdown and add the block there too."],
              ["How do I remove a widget?", "Select the block in the sidebar, click Remove block at the bottom of its settings, then Save."],
            ].map(([q, a]) => (
              <details key={q} className="hiw-faqItem">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="hiw-footer">Trust Reviews · Widget installation guide</footer>

      {openWidget && <VideoModal widget={openWidget} onClose={closeVideo} />}
    </div>
  );
}
