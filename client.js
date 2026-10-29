window.__ModuleLoader__.load({id:"dsh-gemini-voice",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);
var Primitives = __toESM(require("@deepseek-ai/dsh-client-ui-primitives"), 1);
var MicIcon = typeof Primitives.IconMicrophoneOutlineRegular === "function" || typeof Primitives.IconMicrophoneOutlineRegular === "object" ? Primitives.IconMicrophoneOutlineRegular : null;
var inject = ["slots"];
function apply(ctx) {
  if (MicIcon) ctx.effect(() => {
    const sheet = document.createElement("style");
    sheet.textContent = '[role="dialog"] nav button:has([data-gemini-voice-nav]) > svg{display:none}[data-gemini-voice-nav] svg{stroke:currentColor;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}';
    document.head.appendChild(sheet);
    return () => sheet.remove();
  });
  ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "gemini-voice", order: 5, label: () => MicIcon ? /* @__PURE__ */ import_react.default.createElement("span", { "data-gemini-voice-nav": "", style: { display: "inline-flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ import_react.default.createElement(MicIcon, { size: 16 }), /* @__PURE__ */ import_react.default.createElement("span", null, "\u8BED\u97F3")) : "\u8BED\u97F3" }, VoiceSettings));
}
var style = { border: "1px solid #8885", borderRadius: 8, padding: "6px 9px", background: "transparent", color: "inherit", cursor: "pointer" };
function VoiceSettings() {
  const [configured, setConfigured] = (0, import_react.useState)(null), [key, setKey] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false), [message, setMessage] = (0, import_react.useState)(""), [providerReady, setProviderReady] = (0, import_react.useState)(true), [model, setModel] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let live = true;
    fetch("/gemini-voice/config").then(async (r) => {
      if (!r.ok) throw Error();
      return r.json();
    }).then((c) => {
      if (live) {
        setConfigured(c.configured);
        setProviderReady(c.providerReady !== false);
        setModel(c.model || "");
      }
    }).catch(() => {
      if (live) setMessage("\u65E0\u6CD5\u8BFB\u53D6\u914D\u7F6E\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u8BBE\u7F6E");
    });
    return () => {
      live = false;
    };
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/gemini-voice/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: key }) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "\u4FDD\u5B58\u5931\u8D25");
      setKey("");
      setConfigured(true);
      setMessage("\u5DF2\u4FDD\u5B58");
    } catch (e2) {
      setMessage(e2.message);
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ import_react.default.createElement("section", { "aria-label": "\u8BED\u97F3\u8BBE\u7F6E", style: { padding: "8px 0 24px" } }, /* @__PURE__ */ import_react.default.createElement("h2", { style: { fontSize: 18, fontWeight: 600, margin: "0 0 20px" } }, "\u8BED\u97F3"), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "Gemini API Key"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 13, opacity: 0.7, margin: "0 0 12px" } }, configured === null ? "\u6B63\u5728\u8BFB\u53D6\u914D\u7F6E\u2026" : configured ? "API Key \u5DF2\u914D\u7F6E\uFF0C\u53EF\u4EE5\u76F4\u63A5\u4F7F\u7528\u9EA6\u514B\u98CE\u3002\u4EC5\u66F4\u6362\u5BC6\u94A5\u65F6\u9700\u8981\u8F93\u5165\u3002" : "\u5C1A\u672A\u914D\u7F6E\uFF0C\u8BF7\u586B\u5199 Google AI Studio \u7684 API Key\u3002"), /* @__PURE__ */ import_react.default.createElement("form", { onSubmit: save, style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("input", { "aria-label": "Gemini API Key", type: "password", autoComplete: "off", placeholder: configured ? "\u8F93\u5165\u65B0\u7684 API Key \u4EE5\u66F4\u6362" : "\u8F93\u5165 Gemini API Key", value: key, onChange: (e) => setKey(e.target.value), style: { flex: "1 1 240px", minWidth: 0, border: "1px solid #8885", borderRadius: 8, padding: "8px 10px", background: "transparent", color: "inherit" } }), /* @__PURE__ */ import_react.default.createElement("button", { style: { ...style, opacity: busy || !key.trim() ? 0.5 : 1 }, disabled: busy || !key.trim(), type: "submit" }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")), message && /* @__PURE__ */ import_react.default.createElement("p", { role: "status", style: { fontSize: 13 } }, message), !providerReady && /* @__PURE__ */ import_react.default.createElement("p", { role: "alert", style: { fontSize: 13, color: "#f5a623", margin: "10px 0 0" } }, "DeepSeek \u7684\u8BED\u97F3\u8F93\u5165\u529F\u80FD\u5F53\u524D\u6CA1\u6709\u542F\u7528\uFF0CGemini \u8F6C\u5199\u6682\u65F6\u4E0D\u53EF\u7528\uFF1B\u5BC6\u94A5\u548C\u8BCD\u8868\u4ECD\u53EF\u5728\u8FD9\u91CC\u4FEE\u6539\u3002"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 12, opacity: 0.6, margin: "10px 0 0" } }, "\u5BC6\u94A5\u4FDD\u5B58\u5728\u672C\u673A\u3002\u5F55\u97F3\u53D1\u9001\u81F3 Google \u8FDB\u884C\u8F6C\u5199\uFF0C\u4F7F\u7528 Gemini API \u9879\u76EE\u7684\u989D\u5EA6\u3002", model ? ` \u5F53\u524D\u6A21\u578B\uFF1A${model}\u3002` : ""), /* @__PURE__ */ import_react.default.createElement(VocabularySettings, null));
}
function VocabularySettings() {
  const [config, setConfig] = (0, import_react.useState)(null), [busy, setBusy] = (0, import_react.useState)(false), [message, setMessage] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let live = true;
    fetch("/gemini-voice/vocabulary").then(async (r) => {
      if (!r.ok) throw Error();
      return r.json();
    }).then((c) => {
      if (live) setConfig(c);
    }).catch(() => {
      if (live) setMessage("\u65E0\u6CD5\u8BFB\u53D6\u4E2A\u4EBA\u8BCD\u8868\u3002\u66F4\u65B0\u63D2\u4EF6\u540E\u8BF7\u4ECE\u300C\u5E94\u7528 \u2192 \u9000\u51FA\u300D\u91CD\u542F\u3002");
    });
    return () => {
      live = false;
    };
  }, []);
  function updateGroup(change) {
    setMessage("");
    setConfig((c) => ({ ...c, groups: c.groups.map((g, i) => i === c.active ? { ...g, ...change } : g) }));
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/gemini-voice/vocabulary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "\u4FDD\u5B58\u5931\u8D25");
      setConfig(data);
      setMessage("\u8BCD\u8868\u5DF2\u4FDD\u5B58\uFF0C\u4E0B\u6B21\u5F55\u97F3\u751F\u6548");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const field = { ...style, cursor: "text", width: "100%", boxSizing: "border-box" };
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { marginTop: 20, borderTop: "1px solid #8883", paddingTop: 16 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 600 } }, "\u4E2A\u4EBA\u8BCD\u8868\uFF08\u53EF\u9009\uFF09"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 12, opacity: 0.7 } }, "\u5EFA\u8BAE\u5EFA\u7ACB\u81EA\u5DF1\u7684\u4E13\u6709\u540D\u8BCD\u8868\uFF1B\u6BCF\u884C\u4E00\u4E2A\u8BCD\uFF0C\u6BCF\u7EC4\u6700\u591A 100 \u4E2A\u8BCD\uFF0C\u6700\u591A 10 \u7EC4\u3002\u53EA\u4F7F\u7528\u9009\u4E2D\u7684\u5206\u7EC4\u3002\u8BCD\u8868\u8F85\u52A9\u62FC\u5199\uFF0C\u4E0D\u5F00\u542F\u81EA\u52A8\u6574\u7406\u6216\u6392\u7248\u3002"), config && /* @__PURE__ */ import_react.default.createElement("fieldset", { disabled: busy, style: { border: 0, padding: 0, margin: 0, minWidth: 0 } }, /* @__PURE__ */ import_react.default.createElement("label", { style: { display: "block", marginBottom: 12 } }, /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: config.enabled, onChange: (e) => {
    setMessage("");
    setConfig({ ...config, enabled: e.target.checked });
  } }), " \u542F\u7528\u4E2A\u4EBA\u8BCD\u8868"), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } }, /* @__PURE__ */ import_react.default.createElement("select", { "aria-label": "\u5F53\u524D\u8BCD\u8868\u5206\u7EC4", value: config.active, onChange: (e) => {
    setMessage("");
    setConfig({ ...config, active: Number(e.target.value) });
  }, style: { ...style, flex: 1 } }, config.groups.map((g, i) => /* @__PURE__ */ import_react.default.createElement("option", { key: i, value: i, style: { color: "#111", background: "#fff" } }, g.name || "\u672A\u547D\u540D\u5206\u7EC4"))), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", style, disabled: config.groups.length >= 10, onClick: () => {
    setMessage("");
    setConfig({ ...config, active: config.groups.length, groups: [...config.groups, { name: "\u65B0\u8BCD\u8868", terms: [] }] });
  } }, "\u65B0\u589E\u5206\u7EC4"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", style, disabled: config.groups.length <= 1, onClick: () => {
    setMessage("");
    setConfig({ ...config, active: 0, groups: config.groups.filter((_, i) => i !== config.active) });
  } }, "\u79FB\u9664\u5206\u7EC4")), /* @__PURE__ */ import_react.default.createElement("input", { "aria-label": "\u8BCD\u8868\u5206\u7EC4\u540D\u79F0", maxLength: 40, value: config.groups[config.active].name, onChange: (e) => updateGroup({ name: e.target.value }), style: { ...field, marginBottom: 8 } }), /* @__PURE__ */ import_react.default.createElement("textarea", { "aria-label": "\u4E2A\u4EBA\u8BCD\u6761\uFF0C\u6BCF\u884C\u4E00\u4E2A", rows: 6, value: config.groups[config.active].terms.join("\n"), onChange: (e) => updateGroup({ terms: e.target.value.split("\n") }), style: { ...field, resize: "vertical" } }), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 } }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", style, onClick: save }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u8BCD\u8868"), /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: 12, opacity: 0.7 } }, config.groups[config.active].terms.filter((t) => t.trim()).length, " / 100 \u4E2A\u8BCD\u6761"))), message && /* @__PURE__ */ import_react.default.createElement("p", { role: "status", style: { fontSize: 13 } }, message), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 12, opacity: 0.6 } }, "\u8BCD\u8868\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u4E0D\u968F\u63D2\u4EF6\u53D1\u5E03\u3002\u542F\u7528\u65F6\uFF0C\u9009\u4E2D\u7EC4\u7684\u8BCD\u6761\u4F1A\u53D1\u9001\u7ED9 Google \u8F85\u52A9\u8BC6\u522B\u3002\u6CA1\u6709\u81EA\u52A8\u5B66\u4E60\u6216\u5F3A\u5236\u6587\u5B57\u66FF\u6362\uFF1B\u8BEF\u8BC6\u522B\u589E\u591A\u65F6\uFF0C\u53EF\u5173\u95ED\u8BCD\u8868\u540E\u4FDD\u5B58\u8FDB\u884C\u5BF9\u6BD4\u3002"));
}
return module.exports;}});
