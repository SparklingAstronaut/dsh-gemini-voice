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

// protocol.mjs
function appendDraft(draft, text) {
  return draft + (draft && text && !/\s$/.test(draft) ? "\n" : "") + text;
}

// client.jsx
var inject = ["slots"];
function apply(ctx) {
  ctx.slots.inject("conversation.input.right", () => ctx.slots.register({ name: "conversation.input.right", id: "gemini-voice", order: 10 }, VoiceSlot));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({ name: "settings.general.item", id: "gemini-voice-settings", order: 80 }, VoiceSettings));
}
function VoiceSlot(props) {
  return /* @__PURE__ */ import_react.default.createElement(VoiceButton, { key: props.sessionId, ...props });
}
var style = { border: "1px solid #8885", borderRadius: 8, padding: "6px 9px", background: "transparent", color: "inherit", cursor: "pointer" };
var iconButton = { border: 0, background: "transparent", color: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, padding: 5, borderRadius: "50%" };
function Microphone() {
  return /* @__PURE__ */ import_react.default.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ import_react.default.createElement("rect", { x: "9", y: "3", width: "6", height: "12", rx: "3" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" }));
}
function VoiceButton({ useInput, inputActions }) {
  const input = useInput((s) => s);
  const [status, setStatus] = (0, import_react.useState)("idle"), [error, setError] = (0, import_react.useState)(""), [preview, setPreview] = (0, import_react.useState)("");
  const session = (0, import_react.useRef)(null), latest = (0, import_react.useRef)({ input, inputActions });
  latest.current = { input, inputActions };
  const [levels, setLevels] = (0, import_react.useState)([0, 0, 0, 0, 0]);
  function meter(samples) {
    const next = [];
    for (let b = 0; b < 5; b++) {
      let sum = 0;
      const from = Math.floor(b * samples.length / 5), to = Math.floor((b + 1) * samples.length / 5);
      for (let i = from; i < to; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / (to - from));
      next.push(Math.min(1, Math.max(0, (Math.sqrt(rms) - 0.025) * 2.8)));
    }
    setLevels(next);
  }
  const active = !["idle", "error"].includes(status);
  function release(s) {
    if (!s) return;
    s.cancelled = true;
    clearTimeout(s.timer);
    s.stream?.getTracks().forEach((t) => t.stop());
    s.processor?.disconnect();
    s.source?.disconnect();
    s.audio?.close().catch(() => {
    });
    s.ws?.close();
    if (session.current === s) session.current = null;
  }
  (0, import_react.useEffect)(() => () => release(session.current), []);
  function insert(text) {
    if (text) latest.current.inputActions.setDraft(appendDraft(latest.current.input.draft, text));
  }
  function stop() {
    const s = session.current;
    if (!s) return;
    if (status === "connecting") {
      release(s);
      setStatus("idle");
      return;
    }
    setStatus("finishing");
    s.processor?.disconnect();
    s.source?.disconnect();
    s.stream?.getTracks().forEach((t) => t.stop());
    s.audio?.close().catch(() => {
    });
    if (s.ws?.readyState === 1) s.ws.send(JSON.stringify({ stop: true }));
  }
  async function start() {
    setError("");
    setPreview("");
    setLevels([0, 0, 0, 0, 0]);
    setStatus("connecting");
    const s = { cancelled: false };
    session.current = s;
    try {
      const response = await fetch("/gemini-voice/config");
      const config = await response.json();
      if (!response.ok) throw Error("\u65E0\u6CD5\u8BFB\u53D6\u8BED\u97F3\u63D2\u4EF6\u914D\u7F6E");
      if (!config.configured) throw Error("\u8BF7\u5230 \u8BBE\u7F6E \u2192 \u901A\u7528 \u2192 Gemini \u8BED\u97F3\u8F93\u5165 \u914D\u7F6E API Key");
      if (s.cancelled) return;
      s.audio = new AudioContext({ sampleRate: 16e3 });
      await s.audio.resume();
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      if (s.cancelled) {
        release(s);
        return;
      }
      if (s.audio.sampleRate !== 16e3) throw Error("\u6B64\u97F3\u9891\u8BBE\u5907\u4E0D\u652F\u6301 16 kHz \u5F55\u97F3");
      s.ws = new WebSocket(config.websocketUrl);
      s.ws.onmessage = (event) => {
        if (s.cancelled) return;
        const msg = JSON.parse(event.data);
        if (msg.error) {
          setError(msg.error);
          setPreview((msg.final || "") + (msg.interim || ""));
          release(s);
          setStatus("error");
          return;
        }
        if (msg.ready) {
          s.source = s.audio.createMediaStreamSource(s.stream);
          s.processor = s.audio.createScriptProcessor(2048, 1, 1);
          s.processor.onaudioprocess = (e) => {
            if (s.cancelled || s.ws.readyState !== 1) return;
            if (s.ws.bufferedAmount > 32e4) {
              setError("\u7F51\u7EDC\u8FC7\u6162\uFF0C\u5F55\u97F3\u5DF2\u505C\u6B62");
              release(s);
              setStatus("error");
              return;
            }
            const samples = e.inputBuffer.getChannelData(0);
            meter(samples);
            const pcm = new ArrayBuffer(samples.length * 2), view = new DataView(pcm);
            for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, Math.max(-1, Math.min(1, samples[i])) * (samples[i] < 0 ? 32768 : 32767), true);
            s.ws.send(pcm);
          };
          s.source.connect(s.processor);
          s.processor.connect(s.audio.destination);
          setStatus("recording");
          s.timer = setTimeout(() => {
            setError("\u672C\u6BB5\u5F55\u97F3\u5DF2\u63A5\u8FD1 10 \u5206\u949F\uFF0C\u8BF7\u53E6\u8D77\u4E00\u6BB5");
            s.processor.disconnect();
            s.stream.getTracks().forEach((t) => t.stop());
            s.ws.send(JSON.stringify({ stop: true }));
            setStatus("finishing");
          }, 56e4);
        }
        if (msg.final !== void 0) setPreview(msg.final + (msg.interim || ""));
        if (msg.done) {
          insert(msg.final);
          setPreview("");
          release(s);
          setStatus("idle");
        }
      };
      s.ws.onerror = () => {
        if (!s.cancelled) {
          setError("\u8BED\u97F3\u8FDE\u63A5\u5931\u8D25");
          release(s);
          setStatus("error");
        }
      };
      s.ws.onclose = () => {
        if (!s.cancelled) {
          setError("\u8BED\u97F3\u8FDE\u63A5\u4E2D\u65AD\uFF0C\u5DF2\u4FDD\u7559\u9884\u89C8\u6587\u5B57");
          release(s);
          setStatus("error");
        }
      };
    } catch (e) {
      if (!s.cancelled) {
        setError(e.name === "NotAllowedError" ? "\u8BF7\u5141\u8BB8 DeepSeek Harness \u4F7F\u7528\u9EA6\u514B\u98CE" : e.message);
        release(s);
        setStatus("error");
      }
    }
  }
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { position: "relative", display: "flex", gap: 4, alignItems: "center", marginRight: -6 } }, /* @__PURE__ */ import_react.default.createElement("style", null, `.dsh-voice-control:hover{background:rgba(128,128,128,.16)!important}.dsh-voice-control:focus-visible{outline:2px solid currentColor;outline-offset:2px}.dsh-voice-control:disabled{opacity:.45;cursor:default}@media(prefers-reduced-motion:reduce){.dsh-voice-bar{transition:none!important}}`), active ? /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, height: 26, border: "1px solid #8885", borderRadius: 16, padding: "0 3px 0 9px" } }, status === "recording" ? /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true", style: { display: "flex", gap: 3, alignItems: "center", height: 20, width: 27 } }, levels.map((level, i) => /* @__PURE__ */ import_react.default.createElement("span", { className: "dsh-voice-bar", key: i, style: { display: "block", width: 3, height: 3 + level * 13, borderRadius: 2, background: "currentColor", opacity: 0.48 + level * 0.52, transition: "height 110ms ease-out, opacity 110ms ease-out" } }))) : /* @__PURE__ */ import_react.default.createElement("span", { role: "status", style: { fontSize: 12, paddingRight: 4, whiteSpace: "nowrap" } }, status === "connecting" ? "\u8FDE\u63A5\u4E2D\u2026" : "\u8F6C\u5199\u4E2D\u2026"), /* @__PURE__ */ import_react.default.createElement("button", { className: "dsh-voice-control", style: { ...iconButton, width: 23, height: 23 }, type: "button", "aria-label": status === "connecting" ? "\u53D6\u6D88\u8FDE\u63A5" : "\u505C\u6B62 Gemini \u8BED\u97F3\u8F93\u5165", title: status === "connecting" ? "\u53D6\u6D88\u8FDE\u63A5" : "\u505C\u6B62\u5F55\u97F3\u5E76\u586B\u5165\u6587\u5B57", disabled: status === "finishing", onClick: stop }, /* @__PURE__ */ import_react.default.createElement("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ import_react.default.createElement("rect", { x: "3", y: "3", width: "10", height: "10", rx: "1.4" })))) : /* @__PURE__ */ import_react.default.createElement("button", { className: "dsh-voice-control", style: iconButton, type: "button", "aria-label": "\u5F00\u59CB Gemini \u8BED\u97F3\u8F93\u5165", title: "\u8BED\u97F3\u8F93\u5165", disabled: input.phase !== "plain", onClick: start }, /* @__PURE__ */ import_react.default.createElement(Microphone, null)), (error || !active && preview) && /* @__PURE__ */ import_react.default.createElement("div", { style: { position: "absolute", bottom: 40, right: 0, width: 330, maxHeight: 280, overflow: "auto", padding: 14, borderRadius: 12, background: "var(--dsw-alias-bg-base, #202127)", color: "var(--dsw-alias-label-primary, #eee)", boxShadow: "0 4px 24px #0005", zIndex: 1e3 } }, /* @__PURE__ */ import_react.default.createElement("strong", null, "Gemini \u5B9E\u65F6\u8BED\u97F3\u8F93\u5165"), preview && /* @__PURE__ */ import_react.default.createElement("p", { style: { whiteSpace: "pre-wrap" } }, preview), error && /* @__PURE__ */ import_react.default.createElement("p", { role: "alert", style: { color: "#ffb1a7" } }, error), !active && preview && /* @__PURE__ */ import_react.default.createElement("button", { style, onClick: () => {
    insert(preview);
    setPreview("");
    setError("");
    setStatus("idle");
  } }, "\u5C06\u4FDD\u7559\u7684\u6587\u5B57\u653E\u5165\u8F93\u5165\u6846"), !active && error && /* @__PURE__ */ import_react.default.createElement("button", { style, onClick: () => {
    setError("");
    setStatus("idle");
  } }, "\u5173\u95ED\u63D0\u793A")));
}
function VoiceSettings() {
  const [configured, setConfigured] = (0, import_react.useState)(null), [key, setKey] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false), [message, setMessage] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let live = true;
    fetch("/gemini-voice/config").then(async (r) => {
      if (!r.ok) throw Error();
      return r.json();
    }).then((c) => {
      if (live) setConfigured(c.configured);
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
  return /* @__PURE__ */ import_react.default.createElement("section", { "aria-label": "Gemini \u8BED\u97F3\u8F93\u5165", style: { padding: "20px 0", borderTop: "1px solid #8883" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "Gemini \u8BED\u97F3\u8F93\u5165"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 13, opacity: 0.7, margin: "0 0 12px" } }, configured === null ? "\u6B63\u5728\u8BFB\u53D6\u914D\u7F6E\u2026" : configured ? "API Key \u5DF2\u914D\u7F6E\uFF0C\u53EF\u4EE5\u76F4\u63A5\u4F7F\u7528\u9EA6\u514B\u98CE\u3002\u4EC5\u66F4\u6362\u5BC6\u94A5\u65F6\u9700\u8981\u8F93\u5165\u3002" : "\u5C1A\u672A\u914D\u7F6E\uFF0C\u8BF7\u586B\u5199 Google AI Studio \u7684 API Key\u3002"), /* @__PURE__ */ import_react.default.createElement("form", { onSubmit: save, style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("input", { "aria-label": "Gemini API Key", type: "password", autoComplete: "off", placeholder: configured ? "\u8F93\u5165\u65B0\u7684 API Key \u4EE5\u66F4\u6362" : "\u8F93\u5165 Gemini API Key", value: key, onChange: (e) => setKey(e.target.value), style: { flex: "1 1 240px", minWidth: 0, border: "1px solid #8885", borderRadius: 8, padding: "8px 10px", background: "transparent", color: "inherit" } }), /* @__PURE__ */ import_react.default.createElement("button", { style: { ...style, opacity: busy || !key.trim() ? 0.5 : 1 }, disabled: busy || !key.trim(), type: "submit" }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")), message && /* @__PURE__ */ import_react.default.createElement("p", { role: "status", style: { fontSize: 13 } }, message), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: 12, opacity: 0.6, margin: "10px 0 0" } }, "\u5BC6\u94A5\u4FDD\u5B58\u5728\u672C\u673A\u3002\u5F55\u97F3\u53D1\u9001\u81F3 Google \u8FDB\u884C\u8F6C\u5199\uFF0C\u4F7F\u7528 Gemini API \u9879\u76EE\u7684\u989D\u5EA6\u3002"), /* @__PURE__ */ import_react.default.createElement(VocabularySettings, null));
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
