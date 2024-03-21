import { basename } from "path";
import { Plugin } from "vite";

const IDENTIFIER = "\0__vite-plugin-wasm-esm";

/**
 * Returns a wasm pack generated module's wasm file name.
 *
 * Example: "@acme/p-is-np" becomes "p_is_np_bg.wasm"
 */
function wasmFileNameFromModule(module: string) {
	return basename(module).replace(/-/g, "_") + "_bg.wasm";
}

type ModuleResolution = {
	module: string;
	entryPath: string;
	wasmFileName: string;
	wasmPath: string;
};

export default function wasm(modules: string[]): Plugin {
	const moduleSet = new Set(modules);
	const resolutions: Map<string, ModuleResolution> = new Map();

	return {
		name: "vite-plugin-wasm-esm",
		enforce: "pre",

		config: () => ({ ssr: { noExternal: modules } }),

		async resolveId(source, importer, options) {
			// We only care about packages provided to us
			if (!moduleSet.has(source)) return null;
			// Create a unique ID for the resolved module
			const id = `${IDENTIFIER}?${source}`;
			// We only need to resolve things we haven't resolved already
			if (!resolutions.has(id)) {
				// Create a small helper function
				const resolve = (source: string) =>
					this.resolve(source, importer, { skipSelf: true, ...options });
				// Resolve the path of the JS entrypoint
				const entryResolution = await resolve(source);
				// Let bundler handle missing entrypoints
				if (!entryResolution) return null;
				// Compute the wasm file name
				const wasmFile = wasmFileNameFromModule(source);
				// Resolve the wasm path
				const wasmResolution = await resolve(`${source}/${wasmFile}`);
				// Fail hard if we don't find the wasm file
				if (!wasmResolution) {
					throw new Error(
						`Expected to find wasm file (${wasmFile}) in module: "${source}".`,
					);
				}
				// Store the resolved info so we can find back to it later
				resolutions.set(id, {
					module: source,
					entryPath: entryResolution.id,
					wasmFileName: wasmFile,
					wasmPath: wasmResolution.id,
				});
			}

			// TODO: Do we need to update side effects?

			return id;
		},

		async load(id) {
			// Fetch module info
			const resolution = resolutions.get(id);
			// Only handle files we know about and have resolved
			if (!resolution) return null;
			// Create polyfill to allow SSR to load wasm from disk
			// and web to load wasm file over HTTP
			return `
				import init from ${JSON.stringify(resolution.entryPath)};
				import url from ${JSON.stringify(
					`${resolution.module}/${resolution.wasmFileName}?url`,
				)};
				if (!import.meta.env.SSR) {
					await init(url);
				} else {
					const { readFile } = await import("fs/promises");
					await init(readFile(${JSON.stringify(resolution.wasmPath)}));
				}
				export * from ${JSON.stringify(resolution.entryPath)};
				export default () => {};
			`;
		},
	};
}
