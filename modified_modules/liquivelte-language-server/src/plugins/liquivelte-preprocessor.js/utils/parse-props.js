"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseProps(str) {
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
    let currentProp = '';
    let currentValue = '';
    for (let i = 0; i < strArr.length; i++) {
        const char = strArr[i];
        switch (true) {
            case char === ' ':
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
        }
        else if (!propStarted && valueStarted && !preventAdd) {
            currentValue += char;
        }
        else if (!propStarted && !valueStarted) {
            if (currentProp) {
                props[currentProp] = currentValue;
            }
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
exports.default = parseProps;
//# sourceMappingURL=parse-props.js.map