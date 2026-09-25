const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const root = path.resolve(__dirname, '..');
const counts = { files: 0, elements: 0 };

function filesUnder(dir, extensions) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, extensions);
    return extensions.includes(path.extname(entry.name)) ? [full] : [];
  });
}

function addHtmlClasses(source, base, nextClass) {
  const edits = [];
  // The storefront files contain Liquid inside tag attributes, so scan to the
  // real closing bracket while respecting quoted values and Liquid blocks.
  const startTag = /<([a-z][\w-]*)\b/g;
  let match;
  while ((match = startTag.exec(source))) {
    let i = startTag.lastIndex;
    let quote = null;
    let liquid = null;
    for (; i < source.length; i++) {
      const char = source[i];
      if (liquid) {
        if (source.startsWith(liquid, i)) { i += liquid.length - 1; liquid = null; }
      } else if (quote) {
        if (char === quote && source[i - 1] !== '\\') quote = null;
      } else if (source.startsWith('{{', i)) { liquid = '}}'; i++; }
      else if (source.startsWith('{%', i)) { liquid = '%}'; i++; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (i === source.length) continue;
    const tag = source.slice(match.index, i + 1);
    startTag.lastIndex = i + 1;
    if (/\s(?:class|className)\s*=/.test(tag)) continue;
    const insertion = source[i - 1] === '/' ? i - 1 : i;
    edits.push({ at: base + insertion, value: ` class="${nextClass(match[1])}"` });
  }
  return edits;
}

function addStringFragmentClasses(source, base, nextClass, outerQuote) {
  const edits = [];
  const startTag = /<([a-z][\w-]*)\b/g;
  let match;
  while ((match = startTag.exec(source))) {
    const end = source.indexOf('>', startTag.lastIndex);
    const fragment = source.slice(match.index, end < 0 ? source.length : end + 1);
    if (/\s(?:class|className)\s*=/.test(fragment)) continue;
    const attributeQuote = outerQuote === '"' ? "'" : '"';
    edits.push({ at: base + startTag.lastIndex, value: ` class=${attributeQuote}${nextClass(match[1])}${attributeQuote}` });
  }
  return edits;
}

function processFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const prefix = 'tr-' + relative.replace(/\.(jsx|liquid|js)$/, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const previous = [...original.matchAll(new RegExp(`${prefix}-[a-z][\\w-]*-(\\d+)`, 'g'))];
  let sequence = Math.max(0, ...previous.map((match) => Number(match[1])));
  const nextClass = (tag) => `${prefix}-${tag}-${++sequence}`;
  const edits = [];
  if (file.endsWith('.jsx')) {
    const ast = parser.parse(original, { sourceType: 'unambiguous', plugins: ['jsx'] });
    traverse(ast, {
      JSXOpeningElement({ node }) {
        if (node.name.type !== 'JSXIdentifier' || !/^[a-z]/.test(node.name.name)) return;
        if (node.attributes.some((attr) => attr.type === 'JSXAttribute' && ['className', 'class'].includes(attr.name.name))) return;
        const tag = node.name.name;
        const end = original.slice(node.start, node.end);
        const bracket = end.lastIndexOf('>');
        const offset = end[bracket - 1] === '/' ? bracket - 1 : bracket;
        edits.push({ at: node.start + offset, value: ` className="${nextClass(tag)}"` });
      },
    });
  } else if (file.endsWith('.liquid')) {
    edits.push(...addHtmlClasses(original, 0, nextClass));
  } else {
    const ast = parser.parse(original, { sourceType: 'unambiguous' });
    traverse(ast, {
      TemplateElement({ node }) {
        const start = node.start;
        const raw = original.slice(start, node.end);
        edits.push(...addHtmlClasses(raw, start, nextClass));
      },
      StringLiteral({ node }) {
        const raw = original.slice(node.start + 1, node.end - 1);
        if (raw.includes('<')) edits.push(...addStringFragmentClasses(raw, node.start + 1, nextClass, original[node.start]));
      },
    });
  }
  if (!edits.length) return;
  let output = original;
  for (const edit of edits.sort((a, b) => b.at - a.at)) {
    output = output.slice(0, edit.at) + edit.value + output.slice(edit.at);
  }
  fs.writeFileSync(file, output);
  counts.files++;
  counts.elements += edits.length;
  console.log(`${relative}: ${edits.length}`);
}

for (const file of filesUnder(path.join(root, 'app'), ['.jsx'])) processFile(file);
for (const file of filesUnder(path.join(root, 'extensions'), ['.liquid'])) processFile(file);
for (const file of filesUnder(path.join(root, 'extensions'), ['.js'])) processFile(file);
console.log(counts);
