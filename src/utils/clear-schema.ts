export default function removeAllEmptyKeys(ob) {
  function clean(obj) {
    var propNames = Object.getOwnPropertyNames(obj);
    for (var i = 0; i < propNames.length; i++) {
      var propName = propNames[i];
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === '') {
        delete obj[propName];
      } else if (typeof obj[propName] === 'object') {
        clean(obj[propName]);
      } else if (Array.isArray(obj[propName])) {
        for (var j = 0; j < obj[propName].length; j++) {
          clean(obj[propName][j]);
        }
      }
    }
  }
  clean(ob);
}