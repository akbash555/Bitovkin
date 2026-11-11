const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const config = fs.readFileSync('dist/config.js', 'utf8');
const app = fs.readFileSync('dist/app.js', 'utf8');
function render(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { render(file); continue; }
    if (!file.endsWith('.html')) continue;
    const body = { innerHTML: '' };
    const element = { addEventListener() {}, append() {} };
    const document = {
      body,
      addEventListener() {},
      querySelector(selector) {
        if (selector === '#results' || selector === '#contacts') return null;
        return element;
      }
    };
    vm.runInNewContext(config + '\n' + app, {
      window: {}, document, location: { pathname: '/' + file.replaceAll('\\', '/').replace('dist/', '') }
    });
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<body>[\s\S]*<\/body>/, '<body>' + body.innerHTML + '</body>');
    fs.writeFileSync(file, html);
  }
}
render('dist');
