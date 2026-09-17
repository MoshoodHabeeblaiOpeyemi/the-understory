/**
 * ⌘K search behavior. Listener-only: the index is baked into the page at
 * build time (SearchDialog.astro) — nothing is fetched at runtime.
 * The ClientRouter swaps the dialog on every navigation, so wire()
 * re-binds fresh nodes on astro:after-swap; document-level listeners
 * bind exactly once for the whole session.
 */

const RECENTS_KEY = "understory.search.v1";
const MAX_RESULTS = 12;
const optionId = (i: number) => `search-opt-${i}`;

type SearchEntry = {
  day: number;
  label: string; // chip text: "Day 12" or "Field note"
  title: string;
  module: number;
  moduleName: string;
  moduleEmoji: string;
  url: string;
  blurb: string;
};

/* --- Recents (localStorage, safe) ----------------------------------------- */

const readRecents = (): string[] => {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(RECENTS_KEY) ?? "[]",
    );
    return Array.isArray(raw) ? (raw as string[]).slice(0, 5) : [];
  } catch {
    return [];
  }
};

const writeRecents = (urls: string[]) => {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(urls.slice(0, 5)));
  } catch {
    /* Storage refused — recents just don't persist. */
  }
};

const recordRecent = (url: string) => {
  writeRecents([url, ...readRecents().filter((u) => u !== url)]);
};

/* --- Ranking --------------------------------------------------------------- */

/** Substring + light positional scoring. "Fuzzy-ish" is the brief's bar. */
const score = (entry: SearchEntry, q: string): number => {
  const title = entry.title.toLowerCase();
  let s = 0;
  if (title.startsWith(q)) s += 100;
  if (title.includes(q)) s += 60;
  if (entry.moduleName.toLowerCase().includes(q)) s += 25;
  if (entry.blurb.toLowerCase().includes(q)) s += 10;
  // Multi-word queries: every word present anywhere earns a bonus.
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const hay = `${title} ${entry.moduleName} ${entry.blurb}`.toLowerCase();
    if (words.every((w) => hay.includes(w))) s += 30;
  }
  return s;
};

/**
 * Title with the first match wrapped in <mark> — built from text nodes so
 * reader-facing strings are never parsed as markup.
 */
const highlightedTitle = (title: string, q: string): DocumentFragment => {
  const frag = document.createDocumentFragment();
  const first = q.split(/\s+/)[0]?.toLowerCase() ?? "";
  const at = first ? title.toLowerCase().indexOf(first) : -1;
  if (at < 0) {
    frag.append(title);
    return frag;
  }
  const mark = document.createElement("mark");
  mark.textContent = title.slice(at, at + first.length);
  frag.append(title.slice(0, at), mark, title.slice(at + first.length));
  return frag;
};

/* --- Per-dialog binding ----------------------------------------------------- */

const bindDialog = (dialog: HTMLDialogElement) => {
  if (dialog.dataset.bound) return;
  dialog.dataset.bound = "1";

  const input = dialog.querySelector<HTMLInputElement>(".search-input");
  const listbox = dialog.querySelector<HTMLUListElement>(".search-results");
  const recentsWrap = dialog.querySelector<HTMLElement>("[data-recents]");
  const recentRows = dialog.querySelector<HTMLElement>(".recent-rows");
  if (!input || !listbox || !recentsWrap || !recentRows) return;

  const raw = document.getElementById("search-index");
  let entries: SearchEntry[] = [];
  if (raw?.textContent) {
    try {
      const parsed: unknown = JSON.parse(raw.textContent);
      if (Array.isArray(parsed)) entries = parsed as SearchEntry[];
    } catch {
      /* Malformed index — search degrades to the empty state. */
    }
  }

  let current: SearchEntry[] = [];
  let active = -1;

  const syncActive = () => {
    const opts = listbox.querySelectorAll<HTMLButtonElement>(".search-option");
    opts.forEach((opt, i) => {
      const on = i === active;
      opt.setAttribute("aria-selected", String(on));
      if (on) {
        input.setAttribute("aria-activedescendant", opt.id);
        opt.scrollIntoView({ block: "nearest" });
      }
    });
    if (active < 0) input.removeAttribute("aria-activedescendant");
  };

  const go = (url: string) => {
    recordRecent(url);
    dialog.close();
    // A synthetic same-origin link click rides the ClientRouter, so the
    // result opens with a view transition instead of a hard reload.
    const a = document.createElement("a");
    a.href = url;
    document.body.append(a);
    a.click();
    a.remove();
  };

  const optionButton = (entry: SearchEntry) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-option";
    const day = document.createElement("span");
    day.className = "opt-day";
    day.textContent = entry.label;
    const body = document.createElement("span");
    body.className = "opt-body";
    const title = document.createElement("span");
    title.className = "opt-title";
    const mod = document.createElement("span");
    mod.className = "opt-mod";
    mod.textContent = `${entry.moduleEmoji} ${entry.moduleName}`.trim();
    body.append(title, mod);
    btn.append(day, body);
    btn.addEventListener("click", () => go(entry.url));
    return { btn, title };
  };

  const clearList = () => {
    listbox.replaceChildren();
    current = [];
    active = -1;
    input.removeAttribute("aria-activedescendant");
  };

  const emptyState = (text: string, withBrowse: boolean) => {
    const li = document.createElement("li");
    li.className = "search-empty";
    li.setAttribute("role", "presentation");
    li.textContent = text;
    if (withBrowse) {
      li.append(" — ");
      const a = document.createElement("a");
      a.href = "/modules";
      a.textContent = "browse all modules";
      li.append(a);
    }
    clearList();
    listbox.append(li);
  };

  const renderRecents = () => {
    const urls = readRecents();
    if (!urls.length) {
      recentsWrap.hidden = true;
      emptyState("Start typing", true);
      return;
    }
    recentsWrap.hidden = false;
    recentRows.replaceChildren();
    for (const url of urls) {
      const entry = entries.find((e) => e.url === url);
      if (!entry) continue;
      const { btn, title } = optionButton(entry);
      title.textContent = entry.title;
      recentRows.append(btn);
    }
    if (recentRows.children.length) clearList();
    else {
      recentsWrap.hidden = true;
      emptyState("Start typing", true);
    }
  };

  const renderResults = (q: string) => {
    recentsWrap.hidden = true;
    const ranked = entries
      .map((e) => ({ e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.e.day - b.e.day)
      .slice(0, MAX_RESULTS)
      .map((x) => x.e);
    if (!ranked.length) {
      emptyState(`No matches for “${q}”`, true);
      return;
    }
    current = ranked;
    active = 0;
    listbox.replaceChildren();
    ranked.forEach((entry, i) => {
      const { btn, title } = optionButton(entry);
      btn.id = optionId(i);
      btn.setAttribute("role", "option");
      title.replaceChildren(highlightedTitle(entry.title, q));
      listbox.append(btn);
    });
    syncActive();
  };

  dialog.addEventListener("close", () => {
    document.documentElement.style.overflow = "";
    input.value = "";
    const t = lastTrigger.current;
    if (t?.isConnected) t.focus();
  });

  // Click on the backdrop (the dialog element itself) closes.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog
    .querySelector("[data-search-close]")
    ?.addEventListener("click", () => dialog.close());

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q) renderResults(q);
    else renderRecents();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && current.length) {
      e.preventDefault();
      active = (active + 1) % current.length;
      syncActive();
    } else if (e.key === "ArrowUp" && current.length) {
      e.preventDefault();
      active = (active - 1 + current.length) % current.length;
      syncActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = current[active];
      if (pick) go(pick.url);
    }
  });
};

/* --- Wiring ------------------------------------------------------------------ */

// Module scope: survives View-Transition swaps and outlives the dialog.
const lastTrigger: { current: HTMLElement | null } = { current: null };

const openSearch = () => {
  const dialog = document.querySelector<HTMLDialogElement>(
    "dialog.search-dialog",
  );
  if (!dialog || dialog.open) return;
  lastTrigger.current =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  document.documentElement.style.overflow = "hidden";
  dialog.showModal();
  const input = dialog.querySelector<HTMLInputElement>(".search-input");
  if (input) {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  }
};

const wire = () => {
  const dialog = document.querySelector<HTMLDialogElement>(
    "dialog.search-dialog",
  );
  if (dialog) bindDialog(dialog);
  document.querySelectorAll("[data-search-open]").forEach((btn) => {
    if (!(btn instanceof HTMLElement) || btn.dataset.searchBound) return;
    btn.dataset.searchBound = "1";
    btn.addEventListener("click", openSearch);
  });
};

// Document-level listeners bind once per session; per-element work is
// redone against fresh nodes after every ClientRouter swap.
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const dialog = document.querySelector<HTMLDialogElement>(
      "dialog.search-dialog",
    );
    if (!dialog) return;
    if (dialog.open) dialog.close();
    else openSearch();
  }
});

wire();
document.addEventListener("astro:after-swap", wire);


