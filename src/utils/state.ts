interface State
{ 
  data: object;
  watch: object;
  once: object;
  until: object;
  set?: object;
  [key: string]: any;
}

const state: State = {
  data: {},
  watch: {},
  once: {},
  until: {},
}

Object.defineProperty(state, "set", {
  set: function (payl) {
    Object.keys(payl).forEach(key =>
    { 
      const altkey = `_${key}`;
      if (this[key]) return;
      this.data[altkey] = { value: payl[key] };
      this.watch[key] = {};
    
      Object.defineProperty(state, key, {
        set: (v) =>
        {
          const was = this.data[altkey].value;
          this.data[altkey].value = v;

          // always run
          const watchers = this.watch[key];
          const oncers = this.once[key];
          const cond_watchers = this.until[key];
          if (watchers && watchers.length) {
            watchers.forEach(cb => cb(v, was, this.data));
          }
          if (oncers && oncers.length) {
            oncers.forEach(cb => cb(v, was, this.data));
            this.data[altkey].once = [];
          }
          if (cond_watchers && cond_watchers.length) {
            const remaining_watchers = cond_watchers.filter(cb => cb(v, was, this.data));
            remaining_watchers
            this.data[altkey].once = remaining_watchers;
          }
          
        },
        get: () => { 
          return this.data[altkey].value;
        }
      });
  
      Object.defineProperty(this.watch, key, {
        set: (fn) => {
          this.data[altkey].watch = [ ...(this.data[altkey].watch || []), fn ];
        },
        get: () => {
          return this.data[altkey].watch;
        }
      });
      Object.defineProperty(this.once, key, {
        set: (fn) => {
          this.data[altkey].once = [ ...(this.data[altkey].once || []), fn ];
        },
        get: () => {
          return this.data[altkey].once;
        }
      });
      Object.defineProperty(this.until, key, {
        set: (fn) => {
          this.data[altkey].until = [ ...(this.data[altkey].onchange || []), fn ];
        },
        get: () => {
          return this.data[altkey].until;
        }
      });
    });
  }
});

export default state;

