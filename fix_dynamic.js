const fs = require('fs');
const files = [
  'src/app/admin/page.tsx',
  'src/app/admin/agenda/page.tsx',
  'src/app/admin/clientes/page.tsx',
  'src/app/admin/config/page.tsx',
  'src/app/admin/procedimentos/page.tsx'
];
for(const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if(!content.includes('export const dynamic')) {
    content = 'export const dynamic = "force-dynamic";\n' + content;
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
}
