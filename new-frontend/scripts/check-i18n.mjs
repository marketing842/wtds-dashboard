import fs from 'fs'

const src = fs.readFileSync('lib/translations.ts', 'utf8')
const nlMatch = src.match(/const nl: Dict = \{([\s\S]*?)\n\}\n\nconst en/)
const enMatch = src.match(/const en: Dict = \{([\s\S]*?)\n\}\n\nexport/)

function parseBlock(block) {
  const d = {}
  const re = /'([^']+)':\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/g
  let m
  while ((m = re.exec(block))) d[m[1]] = m[2] ?? m[3]
  return d
}

const nl = parseBlock(nlMatch[1])
const en = parseBlock(enMatch[1])
const nlKeys = new Set(Object.keys(nl))
const enKeys = new Set(Object.keys(en))

console.log('NL keys:', nlKeys.size, 'EN keys:', enKeys.size)
console.log('Missing in EN:', [...nlKeys].filter(k => !enKeys.has(k)))
console.log('Missing in NL:', [...enKeys].filter(k => !nlKeys.has(k)))

const identical = [...nlKeys].filter(k => nl[k] === en[k] && nl[k].length > 2).sort()
console.log('\nIdentical NL/EN (' + identical.length + '):')
for (const k of identical) console.log(' ', k, '=', nl[k])
