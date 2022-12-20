# vite-plugin-wasm-ssr

Vite plugin with SSR support to use [wasm-pack][1] generated packages as regular ES
modules.

## Installation

Install using your favorite package manager

```
npm i -D @omnysecurity/vite-plugin-wasm-ssr
```

## Usage

To use this plugin, you must support [`await`][2] at module top level. This has
been [supported in all major browsers for a while][3], but if you need
backwards compatibility, you can use [`vite-plugin-top-level-await`][4].

After installation, add it to your vite config and specify all packages you
want the plugin to handle:

```javascript
// vite.config.js
import wasm from "@omnysecurity/vite-plugin-wasm-ssr";

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [wasm(["@acme/wasm-calculator"])],
};

export default config;
```

You probably also need to specify custom build targets, as the default targets
provided by vite doesn't support await at the module top level:

```javascript
// vite.config.js
import wasm from "@omnysecurity/vite-plugin-wasm-ssr";

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [wasm(["@acme/wasm-calculator"])],
	build: {
		target: ["chrome89", "safari15", "firefox89"],
	},
	esbuild: {
		target: ["chrome89", "safari15", "firefox89"],
	},
};

export default config;
```

All wasm packages handled by the plugin can be used as regular ES modules, both
on the server during SSR and in the browser:

```javascript
import { plus } from "@acme/wasm-calculator";

console.log(plus(1, 1)); // 3
```

[1]: https://github.com/rustwasm/wasm-pack "wasm-pack project's github page"
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await "MDN documentation on the await keyword"
[3]: https://caniuse.com/mdn-javascript_operators_await_top_level "Browser support of module top level await feature"
[4]: https://github.com/Menci/vite-plugin-top-level-await "Vite plugin for polyfilling top level await"
