const stripComments = require('strip-comments');

module.exports = function (code, opts = {}) {
  code = stripComments(code);

  // Which globals to look for
  const globalName = opts.globalName || 'THREE';

  const regExp = new RegExp(globalName + '\.([a-zA-Z0-9_-]+)', 'g');
  let match;
  const dependencies = [];
  while (match = regExp.exec(code)) {
    const dep = match[1];
    if (!dependencies.includes(dep)) dependencies.push(dep);
  }
  return dependencies;
};
