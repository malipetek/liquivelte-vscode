
export function stripArrowFunctions(str) {
  let tagOpen = false;
  let bracketOpen = false;
  let newStr = '';
  let strArr = str.split('');
  let preventAdd = false;
  const diff = [

  ];
  
  for (let i = 0; i < strArr.length; i++) {
    const char = strArr[i];
    let change = 0;
    switch (char) {
      case '<':
        tagOpen = true;
        break;
      case '=':
        if (tagOpen && strArr[i + 1] === '>') {
          newStr += '_afeq_';
          preventAdd = true;
          // addition 6
          change += 6;
        }
        break;
      case '>':
        if (tagOpen && strArr[i - 1] !== '=') { 
          tagOpen = false;
        }
        if (tagOpen && strArr[i - 1] === '=') {
          preventAdd = true;
          newStr += '_afct_';
          // addition 6
          change += 6;
        }
        break;
      case '{':
        bracketOpen = true;
        break;
      case '}':
        bracketOpen = false;
        break; 
    }
    if (!preventAdd) {
      newStr += char;
      // no addition
    } else {
      // remove 1
      change -= 1;
    }
    preventAdd = false;

    diff.push({ offset: i, change });
  }

  function transformOffset (offset)
  {
    const diffBefore = diff.filter(e => e.offset < offset);
    const totalDiff = diffBefore.reduce((c, e) => c + e.change, 0);
    return offset - totalDiff;
  }
  return { transformed: newStr, transformOffset };
}

export function putBackArrowFunctions(str) {
  return str.replace(/_afct_/g, '>').replace(/_afeq_/g, '=');
}