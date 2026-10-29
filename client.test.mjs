import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// 在假的 DSH 环境里加载打包后的 client.js：可以控制“官方组件表”里有什么
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
function load(primitives){
  const React={createElement:(type,props,...children)=>({type,props:{...(props||{}),children:children.length<=1?children[0]:children}}),useState:(v)=>[typeof v==='function'?v():v,()=>{}],useEffect:()=>{},Fragment:'Fragment'};
  let plugin=null;
  const registrations=[];
  globalThis.window={__ModuleLoader__:{load({factory}){plugin=factory((name)=>{
    if(name==='react')return React;
    if(name==='react/jsx-runtime')return {jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:'Fragment'};
    if(name==='@deepseek-ai/dsh-client-ui-primitives'){if(primitives===undefined)throw Error('missed the module table');return primitives;}
    throw Error('unexpected module '+name);
  });}}};
  globalThis.document={createElement:()=>({dataset:{},remove(){}}),head:{appendChild(){}}};
  new Function(source)();
  plugin.apply({effect(fn){fn();},slots:{inject(_n,cb){cb();},register(spec,component){registrations.push({spec,component});return()=>{};}}});
  return registrations[0];
}
function flatten(node,out=[]){
  if(node===null||node===undefined||node===false)return out;
  if(Array.isArray(node)){for(const n of node)flatten(n,out);return out;}
  if(typeof node!=='object')return out;
  out.push(node);flatten(node.props&&node.props.children,out);return out;
}
const fake=(name)=>Object.assign(function(){return null;},{displayName:name});
const ALL=()=>({SettingsForm:fake('SettingsForm'),SettingsSecretField:fake('SettingsSecretField'),SettingsValueField:fake('SettingsValueField'),Switch:fake('Switch'),SegmentedControl:fake('SegmentedControl'),Button:fake('Button'),IconMicrophoneOutlineRegular:fake('Mic')});

test('with the DSH components the voice page uses the official settings form and secret field',()=>{
  const primitives=ALL();
  const {spec,component}=load(primitives);
  const nodes=flatten(component({}));
  assert.equal(nodes[0].type,'section');
  assert.equal(nodes[0].props['data-gv-ui'],'official');
  const form=nodes.find(n=>n.type===primitives.SettingsForm);
  assert.ok(form,'page is wrapped in SettingsForm (single official save button)');
  assert.equal(form.props.labels.save,'保存');
  assert.equal(form.props.state.dirty,false,'nothing to save on open');
  assert.equal(typeof form.props.onSave,'function');
  assert.equal(typeof form.props.onDiscard,'function');
  const secret=nodes.find(n=>n.type===primitives.SettingsSecretField);
  assert.ok(secret,'API key uses SettingsSecretField');
  assert.equal(secret.props.stateLabel,'未配置');
  assert.equal(typeof spec.label(),'object','nav label keeps the microphone icon');
});

test('if any DSH component is missing the plugin still loads and uses the simple page',()=>{
  const primitives=ALL();delete primitives.SettingsSecretField;
  const {component}=load(primitives);
  assert.equal(flatten(component({}))[0].props['data-gv-ui'],'fallback');
});

test('if the whole component table is gone the plugin still loads, with a text-only nav label',()=>{
  const {spec,component}=load(undefined);
  assert.equal(spec.label(),'语音');
  assert.equal(flatten(component({}))[0].props['data-gv-ui'],'fallback');
});

test('package no longer declares the component package as a hard dependency',()=>{
  const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
  assert.equal(pkg.dsh.client.inject,undefined);
  assert.equal(pkg.dsh.client.platform,'web');
});
