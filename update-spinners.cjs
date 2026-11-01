const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('e:/H Work/bazarbd-main/src');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  const replacements = [
    {
      from: /<Loader2 className="animate-spin mr-2" size=\{18\} \/>/g,
      to: '<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />'
    },
    {
      from: /<RefreshCw className="w-4 h-4 animate-spin" \/>/g,
      to: '<div className="w-4 h-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />'
    },
    {
      from: /<Loader2 size=\{16\} className="animate-spin" \/>/g,
      to: '<div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />'
    },
    {
      from: /border-t-blue-500/g,
      to: 'border-t-slate-900'
    },
    {
      from: /border-gray-300 border-t-slate-900/g,
      to: 'border-slate-200 border-t-slate-900'
    }
  ];

  replacements.forEach(({from, to}) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  });
  
  if (changed) {
     fs.writeFileSync(f, content);
     console.log('Updated: ' + f);
  }
});
