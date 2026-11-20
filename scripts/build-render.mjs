import { build } from 'esbuild';
import { resolve } from 'node:path';
await build({entryPoints:['server/main.ts'],outfile:'dist/render/server.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle',sourcemap:false,alias:{'cloudflare:workers':resolve('server/runtime.ts'),'@/app/chatgpt-auth':resolve('server/auth-context.ts'),'@':resolve('.')},logLevel:'info'});
