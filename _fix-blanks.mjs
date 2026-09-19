import fs from 'node:fs';

let failed = false;
function patch(file, pairs) {
  let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [oldS, newS, why] of pairs) {
    const n = s.split(oldS).length - 1;
    if (n !== 1) { console.log(`FAIL ${file} [${why}] matched ${n}x`); failed = true; continue; }
    s = s.replace(oldS, newS);
  }
  s = s.replace(/\n*$/, '\n');           // exactly one trailing newline (MD047, MD012 at EOF)
  fs.writeFileSync(file, s, 'utf8');
  console.log(`ok   ${file}`);
}

patch('src/content/lessons/day-001.md', [
  ['Each packet carries two things:\n- **A slice of the data**',
   'Each packet carries two things:\n\n- **A slice of the data**',
   'MD032 L64 blank line before list'],
]);

patch('src/content/lessons/day-003.md', [
  ['looks like a broken password.\n\n\n## HTTP is stateless',
   'looks like a broken password.\n\n## HTTP is stateless',
   'MD012 L253'],
  ["you're referring to the same layer.\n\n\n### How the padlock works",
   "you're referring to the same layer.\n\n### How the padlock works",
   'MD012 L305'],
  ['other than the one intended.\n\n\n## Before you close this tab',
   'other than the one intended.\n\n## Before you close this tab',
   'MD012 L377'],
]);

patch('src/content/lessons/day-005.md', [
  ['**POST twice = two things.**\n## PUT — replace',
   '**POST twice = two things.**\n\n## PUT — replace',
   'MD022 L96 blank line before heading'],
]);

process.exit(failed ? 1 : 0);
