import { readFileSync, readdirSync } from 'node:fs';

// Blank-line family of markdownlint rules, which my earlier checker did not
// test at all: MD012 (no multiple blanks), MD022 (blanks around headings),
// MD031 (blanks around fences), MD032 (blanks around lists).
const DIR = 'src/content/lessons';

const isBlank = (l) => l === undefined || l.trim() === '';
const isHeading = (l) => /^#{1,6}\s/.test(l);
const isFence = (l) => /^\s*(```|~~~)/.test(l);
const isItem = (l) => /^\s*([-*+]|\d+\.)\s/.test(l);

function blankLineLint(file, text) {
  const lines = text.split(/\r?\n/);
  const problems = [];

  // Body only — frontmatter is stripped by markdownlint before these rules run.
  const fmEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const start = fmEnd + 1;

  // Mark which lines sit inside a fenced code block, so list-like or
  // heading-like lines in a code sample are never mistaken for structure.
  const inFence = new Array(lines.length).fill(false);
  let fencing = false;
  for (let i = start; i < lines.length; i++) {
    if (isFence(lines[i])) {
      inFence[i] = true;
      fencing = !fencing;
      continue;
    }
    inFence[i] = fencing;
  }

  // MD012 — multiple consecutive blank lines.
  let run = 0;
  for (let i = start; i < lines.length; i++) {
    if (isBlank(lines[i])) {
      run++;
      if (run > 1) problems.push([i + 1, 'MD012', 'multiple consecutive blank lines']);
    } else {
      run = 0;
    }
  }

  // MD022 — headings need a blank line above and below.
  for (let i = start; i < lines.length; i++) {
    if (inFence[i] || !isHeading(lines[i])) continue;
    const atDocStart = i === start;
    if (!atDocStart && !isBlank(lines[i - 1])) {
      problems.push([i + 1, 'MD022', 'heading needs a blank line above']);
    }
    if (i < lines.length - 1 && !isBlank(lines[i + 1])) {
      problems.push([i + 1, 'MD022', 'heading needs a blank line below']);
    }
  }

  // MD031 — fenced code blocks need a blank line above and below.
  let open = null;
  for (let i = start; i < lines.length; i++) {
    if (!isFence(lines[i])) continue;
    if (open === null) {
      open = i;
      if (!isBlank(lines[i - 1])) problems.push([i + 1, 'MD031', 'fence needs a blank line above']);
    } else {
      if (i + 1 < lines.length && !isBlank(lines[i + 1])) {
        problems.push([i + 1, 'MD031', 'fence needs a blank line below']);
      }
      open = null;
    }
  }

  // MD032 — lists need a blank line above and below.
  const items = lines.map((l, i) => (i >= start && !inFence[i] && isItem(l) ? i : -1)).filter((i) => i >= 0);
  const groups = [];
  for (const i of items) {
    const last = groups[groups.length - 1];
    if (last && lines.slice(last.at(-1) + 1, i).every(isBlank)) last.push(i);
    else groups.push([i]);
  }
  for (const g of groups) {
    const first = g[0];
    const last = g.at(-1);
    if (first - 1 >= start && !isBlank(lines[first - 1])) {
      problems.push([first + 1, 'MD032', 'list needs a blank line above']);
    }
    if (last + 1 < lines.length && !isBlank(lines[last + 1])) {
      problems.push([last + 1, 'MD032', 'list needs a blank line below']);
    }
  }

  return problems;
}

let total = 0;
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.md')).sort()) {
  const text = readFileSync(`${DIR}/${f}`, 'utf8');
  const lines = text.split(/\r?\n/);
  const problems = blankLineLint(f, text);
  total += problems.length;
  console.log(`\n=== ${f} ===`);
  if (!problems.length) {
    console.log('  clean');
    continue;
  }
  for (const [ln, rule, msg] of problems) {
    console.log(`  ${rule}  L${ln}  ${msg}`);
    for (let i = ln - 2; i <= ln; i++) {
      console.log(`        ${i + 1}: ${JSON.stringify(lines[i])}`);
    }
  }
}
console.log(`\nTOTAL BLANK-LINE PROBLEMS: ${total}`);