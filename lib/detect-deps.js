const babel = require('babel-core');

module.exports = function (code, opts = {}) {
  if (Buffer.isBuffer(code)) code = code.toString();
  if (typeof code !== 'string') throw new TypeError('code must be Buffer or string');

  const moduleName = opts.moduleName || 'three';
  let dependencies = [];
  let bindings = [];

  // add our own plugin to options
  const babelOpts = Object.assign({}, opts.babel);
  if (Array.isArray(babelOpts.plugins)) {
    babelOpts.plugins.push(detectPlugin);
  } else if (babelOpts.plugins) {
    babelOpts.plugins = [ babelOpts.plugins, detectPlugin ];
  } else {
    babelOpts.plugins = [ detectPlugin ];
  }

  babel.transform(code, babelOpts);

  bindings.forEach(binding => {
    const referencedNames = binding.referencePaths
      .filter(ref => ref.parent.type === 'MemberExpression' && !ref.parent.computed)
      .map(ref => ref.parent.property.name);
    pushAll(referencedNames);
  });

  return dependencies;

  function detectPlugin () {
    return {
      visitor: {
        ImportDeclaration: {
          enter: handleImport
        },
        CallExpression: {
          enter: handleRequire
        }
      }
    };
  }

  function filter (name) {
    return name === moduleName;
  }

  function push (p) {
    if (!dependencies.includes(p)) dependencies.push(p);
  }

  function pushAll (list) {
    list.forEach(dep => push(dep));
  }

  function handleImport (nodePath) {
    const specifiers = nodePath.get('specifiers');
    if (specifiers && specifiers.length) {
      specifiers.forEach(spec => {
        if (spec.isImportNamespaceSpecifier() || spec.isImportDefaultSpecifier()) {
          const name = spec.node.local.name;
          bindings.push(spec.scope.getBinding(name));
        } else {
          push(spec.node.imported.name);
        }
      });
    }
  }

  function handleRequire (nodePath) {
    const callee = nodePath.get('callee');
    if (callee.isIdentifier() && callee.equals('name', 'require')) {
      const arg = nodePath.get('arguments')[0];
      if (arg && arg.isStringLiteral() && filter(arg.node.value)) {
        const parent = nodePath.parentPath;
        if (parent && parent.isVariableDeclarator()) {
          const id = parent.get('id');
          if (id && id.isObjectPattern()) {
            // Object destructuring
            const props = id.get('properties') || [];
            const deps = props.map(p => p.node.key.name);
            pushAll(deps);
          } else if (id && id.node.name) {
            // User required 'three' and referenced it later
            bindings.push(parent.scope.getBinding(id.node.name));
          }
        } else if (parent.isMemberExpression()) {
          // e.g. require('three').LinearFilter
          const dep = parent.get('property').node.name;
          push(dep);
        }
      }
    }
  }
};
