# DeepSeek Harness 官方语音界面的 Gemini 后端

[English](README.md) | 简体中文

为 DeepSeek Harness 官方实验性「录音输入」插件提供 Gemini 识别后端。麦克风、录音波形、停止/取消和文字插入全部使用官方界面。本组件只提供云端转写、API Key 设置及可选个人词表，不再注册自制麦克风或录音控件。

## 安装

需要 Node.js 20 或更新版本、npm、包含 `@deepseek-ai/dsh-experimental-voice-input-bundle` 的 DeepSeek Harness 桌面版，以及具有 `gemini-3.5-transcribe-live` 访问权限的 Google AI Studio API Key。已在 Windows 验证，其他系统尚未验证。

1. 在 Harness「插件 → 实验性」启用官方录音输入插件。
2. 从 [v0.3.7 Release](https://github.com/SparklingAstronaut/dsh-gemini-voice/releases/tag/v0.3.7) 下载 `.tgz` 并核对 SHA-256，保存在固定位置。通过插件管理器安装这个压缩包路径或精确版本的下载 URL；升级时通过管理器替换旧来源。不要只覆盖 `node_modules`，安装记录必须一起指向新包。使用本地路径时保留压缩包。
3. 从「应用 → 退出」完整重启 Harness。
4. 在「设置 → 语音」保存自己的 API Key。
5. 在官方录音输入插件配置中，将识别后端选择为「Gemini（逐字转写 + 个人词表）」。不需要下载 SenseVoice 模型来使用 Gemini。

本组件依赖官方 `speechToText.register()` 接口；实验性接口升级可能需要适配。0.3.0 起需要官方语音插件；从旧版升级后会移除旧的自制录音界面，已保存的 Key 和词表沿用。0.3.1 起，API Key 和个人词表移至独立的「语音」设置栏目，位于通用设置旁，使用麦克风图标。

**0.3.7** 使用官方 `settings.section.icon` 注册麦克风，标签只有文字，修复 DSH 0.2.2-rc.1 中齿轮与麦克风同时出现的问题。源码、生成的界面、发布包及 Environment Kit 1.0.2 及后续版本使用同一份实现。[当前套件和安装说明](https://github.com/SparklingAstronaut/dsh-env-kit)。0.3.5/0.3.6 曾用于本机修复，未作为公开版本发布。

开发者可克隆后执行 `npm ci`、`npm run build`、`npm test`、`npm pack`，再通过插件管理器安装生成的包。

## 使用与接口

点击官方麦克风录音，再点停止；官方界面先录完整段，再把 WAV 提交给识别后端。当前默认单段上限为两分钟。停止后会有上传和识别等待，完成后才填入文字；这不是边录音边显示文字的流式前端。后端把 PCM 音频分块发到 Gemini Live API 的 `BidiGenerateContent` WebSocket 接口，仍使用 `gemini-3.5-transcribe-live`，没有改为文件转写或 `generateContent` 调用。

使用 VERBATIM 逐字转写，不启用 SMART 自动整理和排版。识别语言遵循官方语音设置，默认自动检测。最终文本交回官方界面插入草稿，不自动发送。取消操作会终止云端请求；失败时不自动切换其他识别服务。

API 项目的实时模型配额与计费以 Google 实际设置为准；Gemini 网页版 Pro 订阅与 API 额度分开。

## 个人词表（可选）

建议用户按自己的使用习惯建立专有名词表，而不是直接使用他人的列表。进入「设置 → 语音 → 个人词表」，每行一个词；可新增、命名和移除分组，最多 10 组，每组最多 100 个词。开启后只使用选中的分组，保存后下次转写生效，无需重启。空白行和重复词会在保存时清理。

词表只辅助识别，不执行强制替换，也不会自动读取聊天或学习纠错。词条越多不一定越准确：建议只添加相关的专有名词，并比较启用和关闭时的识别效果。

仓库不附带任何个人词表。设置保存在 `~/.dsh/gemini-voice/vocabulary.json`，独立于插件仓库；请勿提交自己的词表或配置文件。启用时，当前分组的词条会发送到 Google，作为录音识别提示，其余分组不发送。

## 本机配置及隐私

API Key 存储于当前系统用户的 `~/.dsh/gemini-voice/api-key.txt`，不是系统凭据库，请保护本机账号及文件权限。此路径避免 Windows 打包应用将 AppData 重定向到私有目录而产生启动入口差异。可读取的旧版 AppData 密钥会自动迁移，已有新路径密钥不会被覆盖。非空的 `GEMINI_API_KEY` 环境变量优先使用，界面保存的密钥不会覆盖它。

可选环境变量 `DSH_GEMINI_VOICE_HOME` 指定独立配置目录。套件启动器将它设为自身的 `DSH_HOME/gemini-voice`，并禁止从全局 AppData 导入旧密钥。普通安装仍沿用原有共享目录，仅设置 `DSH_HOME` 不会改变现有密钥位置。

本组件不把录音写入文件。录音会在停止后发送给 Google 进行转写。设置接口沿用 Harness 鉴权，限制回环地址及同源请求；密钥不会返回前端。不要分享本机密钥或个人词表文件。

## 更新兼容性

插件不修改 Harness 安装文件，但官方实验性语音接口或设置扩展接口变化时，可能需要更新适配。语音栏目图标使用官方图标槽位，不再依赖界面的 HTML 包装层或隐藏齿轮的 CSS。更新 Harness 后，建议确认 Gemini 后端仍可选择，并测试一段短录音。

## 开发及验证

`npm run build` 生成设置界面；`npm test` 检查共享配置路径、词表选择与校验、WAV 校验、Live API 协议、官方返回格式及取消清理。修改服务器代码后需完整退出并重新打开 Harness。

已使用中文合成音频测试注册的 Gemini 后端：官方格式 WAV → Gemini Live → 官方所需的文字、音频时长、处理耗时。已在 Windows 桌面版通过官方麦克风实际录音验证：重启后选择 Gemini，停止录音后成功将文字填入草稿。识别准确度和处理时间仍受口音、环境、网络和服务状态影响。

早期自制客户端参考 MIT 项目 [forrestahha/dsh-voice-input](https://github.com/forrestahha/dsh-voice-input)，现已移除其录音前端；保留 MIT 声明，许可证见 [LICENSE](LICENSE)。本项目不复制或修改官方语音界面代码。

本项目为社区适配组件，与 DeepSeek、Google 或 OpenAI 无官方关联。如需停用 Gemini，请先在官方录音输入设置中选择其他可用识别后端，再停用本组件。

0.3.7 的新验收覆盖导航、图标回退、配置隔离及重装后修复保持；本轮未重新进行真实麦克风或付费云端识别测试。
