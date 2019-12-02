/**
 * Debug Script
 *
 * This code is intended to be evaluated in an environment where owl is available,
 * to log lot of helpful information on how Owl components behave.
 */

let debugSetup = {
  // componentBlackList: /App/,  // regexp
  // componentWhiteList: /SomeComponent/, // regexp
  // methodBlackList: ["mounted"], // list of method names
  // methodWhiteList: ["willStart"], // list of method names
  logScheduler: true, // display/mute scheduler logs
  logStore: true // display/mute store logs
};
{
  let prefix = "[OWL_DEBUG]";
  let current;
  Object.defineProperty(owl.Component, "current", {
    get() {
      return current;
    },
    set(comp) {
      current = comp;
      const name = comp.constructor.name;
      if (debugSetup.componentBlackList && debugSetup.componentBlackList.test(name)) {
        return;
      }
      if (debugSetup.componentWhiteList && !debugSetup.componentWhiteList.test(name)) {
        return;
      }
      let __owl__;
      Object.defineProperty(current, "__owl__", {
        get() {
          return __owl__;
        },
        set(val) {
          __owl__ = val;
          debugComponent(comp, name, __owl__.id);
        }
      });
    }
  });

  function toStr(obj) {
    let str = JSON.stringify(obj || {});
    if (str.length > 200) {
      str = str.slice(0, 200) + "...";
    }
    return str;
  }

  function debugComponent(component, name, id) {
    let fullName = `${name}<id=${id}>`;
    let shouldDebug = method => {
      if (debugSetup.methodBlackList && debugSetup.methodBlackList.includes(method)) {
        return false;
      }
      if (debugSetup.methodWhiteList && !debugSetup.methodWhiteList.includes(method)) {
        return false;
      }
      return true;
    };
    if (shouldDebug("constructor")) {
      console.log(`${prefix} ${fullName} constructor, props=${toStr(component.props)}`);
    }
    if (shouldDebug("willStart")) {
      owl.hooks.onWillStart(() => {
        console.log(`${prefix} ${fullName} willStart`);
      });
    }
    if (shouldDebug("mounted")) {
      owl.hooks.onMounted(() => {
        console.log(`${prefix} ${fullName} mounted`);
      });
    }
    if (shouldDebug("willUpdateProps")) {
      owl.hooks.onWillUpdateProps(nextProps => {
        console.log(`${prefix} ${fullName} willUpdateProps, nextprops=${toStr(nextProps)}`);
      });
    }
    if (shouldDebug("willPatch")) {
      owl.hooks.onWillPatch(() => {
        console.log(`${prefix} ${fullName} willPatch`);
      });
    }
    if (shouldDebug("patched")) {
      owl.hooks.onPatched(() => {
        console.log(`${prefix} ${fullName} patched`);
      });
    }
    if (shouldDebug("willUnmount")) {
      owl.hooks.onWillUnmount(() => {
        console.log(`${prefix} ${fullName} willUnmount`);
      });
    }
    const __render = component.__render.bind(component);
    component.__render = function(...args) {
      console.log(`${prefix} ${fullName} rendering template`);
      __render(...args);
    };
    const render = component.render.bind(component);
    component.render = function(...args) {
      console.log(`${prefix} ${fullName} render`);
      return render(...args);
    };
    const mount = component.mount.bind(component);
    component.mount = function(...args) {
      console.log(`${prefix} ${fullName} mount`);
      return mount(...args);
    };
  }

  if (debugSetup.logScheduler) {
    let isRunning;
    Object.defineProperty(owl.Component.scheduler, "isRunning", {
      get() {
        return isRunning;
      },
      set(val) {
        if (val) {
          console.log(`${prefix} scheduler: start running tasks queue`);
        } else {
          console.log(`${prefix} scheduler: stop running tasks queue`);
        }
        isRunning = val;
      }
    });
  }
  if (debugSetup.logStore) {
    let dispatch = owl.Store.prototype.dispatch;
    owl.Store.prototype.dispatch = function(action, ...payload) {
      console.log(`${prefix} store: action '${action}' dispatched. Payload: '${toStr(payload)}'`);
      return dispatch.call(this, action, ...payload);
    };
  }
}