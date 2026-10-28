import { build } from 'esbuild';
await build({entryPoints:['client.jsx'],outfile:'client.js',bundle:true,platform:'browser',format:'cjs',external:['react','react/jsx-runtime','@deepseek-ai/dsh-client-ui-primitives'],banner:{js:'window.__ModuleLoader__.load({id:"dsh-gemini-voice",factory:(require)=>{var module={exports:{}};var exports=module.exports;'},footer:{js:'return module.exports;}});'}});
