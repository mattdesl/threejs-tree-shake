const fs = require('fs');
const path = require('path');
const requireRelative = require('require-path-relative');
const stripComments = require('strip-comments');
const resolve = require('resolve');

module.exports = function (dependencies = [], opt = {}) {
  const basedir = opt.basedir || process.cwd();

  const threePath = opt.threePath || path.dirname(resolve.sync('three/package.json', { basedir }));
  const threeSrc = path.resolve(threePath, 'src');
  const threeIndex = path.resolve(threeSrc, 'Three.js');

  const ignoreRecurse = [
    'polyfills.js',
    'BufferAttribute.js',
    'constants.js',
    'Three.Legacy.js'
  ];

  const alwaysImport = [];
  const polyfills = typeof opt.polyfills === 'boolean' ? opt.polyfills : true;

  const constants = gatherConstants();
  const imports = parse(threeIndex);

  const strings = [];
  imports.forEach(block => {
    if (block.fileName === 'BufferAttribute.js') {
      const hasBufferAttrib = dependencies.some(dep => dep.includes('BufferAttribute'));
      if (hasBufferAttrib) strings.push(block.code);
    } else if (block.fileName === 'constants.js') {
      const variables = dependencies.filter(dep => constants.includes(dep));
      if (variables.length > 0) {
        strings.push(
          `export { ${variables.join(', ')} } from '${block.file}';`
        );
      }
    } else {
      const push = block.required || block.modifiedVariables.some(name => dependencies.includes(name));
      if (block.fileName === 'Three.Legacy.js' && !opt.legacy) {
        return;
      }
      if (block.fileName === 'polyfills.js' && !polyfills) {
        return;
      }
      if (push) {
        strings.push(block.code);
      }
    }
  });
  return strings.join('\n');

  function gatherConstants () {
    const file = path.resolve(threeSrc, 'constants.js');
    const exportStrings = stripComments(fs.readFileSync(file, 'utf-8'))
      .split('\n')
      .filter(n => n.trim().length > 0);
    return exportStrings.map(str => {
      const match = /export (?:var|let|const) (.*)\s+\=/.exec(str);
      if (!match) return null;
      return match[1];
    }).filter(Boolean);
  }

  function parse (file, base) {
    const importStrings = stripComments(fs.readFileSync(file, 'utf-8'))
      .split('\n')
      .filter(n => n.trim().length > 0);
    return importStrings.map(str => {
      const match = /\{\s*(.*)\s*\}/.exec(str);
      let variables = [];
      if (match) {
        variables = match[1].trim().split(',').map(n => n.trim());
      }

      let fileName;
      let file;
      let nameMatch = /from\s*["'](.*)["']/.exec(str);
      if (nameMatch) {
        file = nameMatch[1].trim();
        fileName = path.basename(file);
      } else {
        const importMatch = /import\s*["'](.*)["']/.exec(str);
        if (importMatch) {
          file = importMatch[1].trim();
          fileName = path.basename(file);
        }
      }

      const shouldRecurse = str.includes('export *') && variables.length === 0;
      if (shouldRecurse && !ignoreRecurse.includes(fileName)) {
        const absPath = path.resolve(threeSrc, file);
        const children = parse(absPath, path.dirname(absPath));
        return children;
      }

      if (base) {
        file = requireRelative(threeSrc, path.dirname(path.resolve(base, file)), fileName);
      }

      const isAlwaysImport = fileName
        ? alwaysImport.includes(fileName)
        : false;
      const modifiedVariables = variables.filter(dep => dependencies.includes(dep));
      const isModify = !isAlwaysImport && file && variables.length >= 0 && str.includes('export') && !str.includes('*');
      const required = fileName !== 'BufferAttribute.js' && !isModify;
      const block = {
        variables,
        modifiedVariables,
        file,
        fileName,
        required,
        isModify,
        code: isModify ? `export { ${modifiedVariables.join(', ')} } from '${file}';` : str
      };
      return [ block ];
    }).reduce((array, other) => {
      return array.concat(other);
    }, []);
  }
};
