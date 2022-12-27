// @ts-nocheck
export default function parseProps (str): { [key: string]: string, spread?: string }
{
  const props = {};
  let bracket = {
    bracketsOpened: 0,
    get open() {
      return this.bracketsOpened > 0;
    },
    set open(value) { 
      // console.log(value)
      if (value === true) {
        this.bracketsOpened = this.bracketsOpened + 1;
      }
      else if (value === false) {
        this.bracketsOpened = this.bracketsOpened - 1;
      }
      // console.log('open', this.bracketsOpened);
    }
  };
  let strArr = ` ${str} `.split('');
  let preventAdd = false;
  let propStarted = false;
  let valueStarted = false;
  let quoteStarted = false;
  let valueOmitted = false;
  let currentProp = '';
  let currentValue = '';

  for (let i = 0; i < strArr.length; i++) {
    const char = strArr[i];
    switch (true) {
      case /\s|\n/.test(char):
        if (propStarted) {
          propStarted = false;
          valueOmitted = true;
        }
        if (!quoteStarted && !bracket.open) {
            propStarted = false;
            // console.log(char, 'propEnded', currentProp);
        }
        if (valueStarted && !quoteStarted && !bracket.open) {
          valueStarted = false;
          // console.log(char, 'Value ended', currentValue);
        }
        break;
      case char === '{':
        bracket.open = true;
        if (!valueStarted) {
          propStarted = true;
        }
        break;
      case char === '}':
        bracket.open = false;
        break;
      case char === '"':
        quoteStarted = !quoteStarted;
        break;
      case char === '=':
        if (propStarted) {
          propStarted = false;
          // console.log(char, 'propEnded', currentProp);
          valueStarted = true;
          preventAdd = true;
        }
        break;
      case /[^\s]/.test(char):
        // there is a char
        if (!valueStarted) {
          propStarted = true;
        }
        break;
    }

    // console.log(char,
    //   propStarted ? 'propStarted' : '',
    //   valueStarted ? 'valueStarted' : '',
    //   quoteStarted ? 'quoteStarted' : '',
    //   bracket.open ? 'bracket.open' : '');

    if (propStarted && !valueStarted && !preventAdd) {
      currentProp += char;
    } else if (!propStarted && valueStarted && !preventAdd) {
      currentValue += char;
    } else if (!propStarted && !valueStarted) {
      if (currentProp) {
        props[currentProp] = valueOmitted ? '1' : currentValue.replace(/^"/, '').replace(/"$/, '');
      }
      valueOmitted = false;
      currentValue = '';
      currentProp = '';
    }
   
    preventAdd = false;
  }

  Object.keys(props).map(key => {
    if (/\{\s*\.\.\.(\w+)\s*\}/.test(key)) {
      const [, variable] = key.match(/\{\s*\.\.\.(\w+)\s*\}/);
      props.spread = variable;
      delete props[key];
    }
  });
  return props;
}

export function parseIncludes(template) {
  // Use a regular expression to find Liquid include tags in the template
  const regex = /{%\s*(include|render|section)\s*['"]([\w-]+)['"]\s*(with)?\s*([\w\s:\'",]+)?\s*%}/g;
  let match;
  let matches = [];

  // Iterate over the matches and add them to the matches array
  while ((match = regex.exec(template)) !== null) {
    let include = {
      tagName: match[1],
      includeName: match[2],
      props: {}
    };

    if (match[4]) {
      // Parse the properties from the string and add them to the include object
      let props = match[4].split(',');
      props.forEach((prop) => {
        let [key, value] = prop.split(':').map((x) => x.trim());
        if (value && value.includes(':')) {
          // The value is a multi-assignment object, parse it
          let obj = {};
          value.split(',').forEach((x) => {
            let [k, v] = x.split(':').map((x) => x.trim());
            obj[k] = v;
          });
          include.props[key] = obj;
        } else {
          // The value is a simple string, add it directly to the include object
          include.props[key] = value;
        }
      });
    }

    matches.push(include);
  }

  return matches;
}
