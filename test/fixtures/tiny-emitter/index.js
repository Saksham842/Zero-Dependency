export default class TinyEmitter {
  constructor() {
    this._e = {};
  }
  on(name, callback, ctx) {
    var e = this._e || (this._e = {});
    (e[name] || (e[name] = [])).push({ fn: callback, ctx: ctx });
    return this;
  }
  once(name, callback, ctx) {
    var self = this;
    function listener() {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    }
    listener._ = callback;
    return this.on(name, listener, ctx);
  }
  emit(name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this._e || (this._e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;
    for (i = 0; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }
    return this;
  }
  off(name, callback) {
    var e = this._e || (this._e = {});
    var evts = e[name];
    var liveEvents = [];
    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback) {
          liveEvents.push(evts[i]);
        }
      }
    }
    (liveEvents.length) ? e[name] = liveEvents : delete e[name];
    return this;
  }
}
