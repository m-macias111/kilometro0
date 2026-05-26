const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.ejs'));

files.forEach(f => {
    const p = path.join(viewsDir, f);
    let content = fs.readFileSync(p, 'utf8');
    if(!content.includes('bootstrap.min.css')) {
        content = content.replace(
            '<link rel="stylesheet" href="/css/style.css">', 
            '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">\n    <link rel="stylesheet" href="/css/style.css">'
        );
        content = content.replace(
            '</body>',
            '    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>\n</body>'
        );
        fs.writeFileSync(p, content);
        console.log('Added Bootstrap to ' + f);
    }
});
