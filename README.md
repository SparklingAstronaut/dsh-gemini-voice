# DeepSeek Harness Gemini 语音输入

为 DeepSeek Harness 桌面版添加 Gemini 语音输入：简洁的麦克风图标、随实际音量变化的录音波形，以及停止后追加到草稿的转写文字。

## 安装

需要 Node.js 20 或更新版本、npm、支持本地插件的 DeepSeek Harness 桌面版，以及具有 `gemini-3.5-transcribe-live` 访问权限的 Google AI Studio API Key。已在 Windows 验证，其他系统尚未验证。

下载或克隆本仓库，在项目目录执行：

```sh
npm ci
npm run build
```

在 Harness「插件」页面添加本项目的本地目录并启用，必要时重新打开应用。进入「设置 → 通用设置 → Gemini 语音输入」填写自己的 API Key。此目录是运行时依赖，安装后不要移动或删除。

插件依赖 `conversation.input.right` 和 `settings.general.item` 插槽；Harness 接口变化时可能需要更新。

## 使用

1. 打开会话，在输入框旁点击麦克风。
2. 等待连接完成、出现波形后说话。
3. 再点「停止」，最终文字会追加到当前草稿，不会自动发送。
4. 在「设置 → 通用设置 → Gemini 语音输入」中更换 Google AI Studio API Key；已配置时会显示状态，无需重复填写。

使用 Gemini API 的 `gemini-3.5-transcribe-live`，设置中文及英文提示。它与 Gemini 网页版 Pro 订阅分开；插件没有开通账单。实际费用与额度由对应 API 项目的 Google 设置决定。

## 本机配置及隐私

API Key 存储于当前系统用户的 `~/.dsh/gemini-voice/api-key.txt`，不是系统凭据库，请保护本机账号及文件权限。此路径避免 Windows 打包应用将 AppData 重定向到私有 LocalCache，导致从不同入口启动时读取不同的文件。可读取的旧版 AppData 密钥会自动迁移，已有新路径密钥不会被覆盖。环境变量名称按大小写不敏感读取。非空的 `GEMINI_API_KEY` 优先使用，界面保存的密钥不会覆盖它。

录音通过本机 Harness 服务实时发送到 Google，插件不保存音频文件。停止或离开组件会释放麦克风。单段接近十分钟会停止，请分段输入。断线时可手动将已保留的转写放入输入框。

服务沿用 Harness 鉴权，并限制回环地址及同源请求。密钥不会返回前端。不要分享本机密钥文件。

## 开发及验证

`npm install` 安装依赖，`npm run build` 生成客户端，`npm test` 检查转写拼接及草稿保留。修改服务器代码后需退出并重新打开 Harness。

已用中文合成音频实际调用 Google，并通过本机中继完成转写；同时检查未授权及跨来源请求被拒绝。已手动验证桌面麦克风录音及转写填入草稿。识别效果仍受口音、环境和设备影响；静音录音可能显示最终转写超时提示。

客户端入口参考 MIT 项目 [forrestahha/dsh-voice-input](https://github.com/forrestahha/dsh-voice-input) 的插件结构，已适配桌面 Harness 的输入组件接口。保留其 MIT 声明，许可证见 [LICENSE](LICENSE)。

本项目为社区插件，与 DeepSeek、Google 或 OpenAI 无官方关联。模型可用性、免费额度、数据处理规则与费用以 Google 对相应 API 项目的规定为准。

如需停用，在 Harness 的「插件」页面停用本插件。

