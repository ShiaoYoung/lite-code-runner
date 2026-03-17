# Code Runner Hub（GitHub Pages）

一个可部署到 **GitHub Pages** 的静态网站：

- 支持运行 `Python`、`C`、`C++`、`Java`、`JavaScript`、`Matlab（Octave 兼容）`
- 页面包含：语言选择、版本选择、代码输入（带行号）、执行参数输入、标准输入（带行号）、输出信息
- 支持上传运行时文件、stdin 文件导入，并支持从程序输出中自动下载结果文件
- 已预留 Debug 扩展点（当前不启用调试）

## 技术方案

由于 GitHub Pages 只提供静态托管，无法直接在服务器端执行代码，项目采用：

- 前端：原生 HTML/CSS/JavaScript
- 在线执行：Judge0 CE API（浏览器直接调用）

> 说明：版本下拉优先读取在线语言列表（`/languages`），失败时回退到内置版本。

## 本地运行

直接打开 `index.html` 可能受浏览器模块加载策略影响，建议通过本地静态服务器启动，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 部署到 GitHub Pages

1. 将当前目录推送到 GitHub 仓库（默认分支 `main`）
2. 仓库中已包含工作流：`.github/workflows/deploy-pages.yml`
3. 在 GitHub 仓库设置中：
   - `Settings` → `Pages`
   - `Source` 选择 `GitHub Actions`
4. 推送后等待 Actions 成功，页面会自动发布

## 目录结构

```text
.
├─ .github/workflows/deploy-pages.yml
├─ assets/
│  ├─ app.js
│  ├─ config.js
│  ├─ executor.js
│  └─ styles.css
├─ index.html
└─ README.md
```

## Debug 预留设计

- `assets/executor.js` 暴露 `debugCode()` 作为后续扩展入口
- UI 提供 `Debug（预留）` 按钮
- 后续可替换为支持断点/单步调试的服务端 API

## 文件上传与输出文件下载协议

## 执行参数说明

- 可在「执行参数（可选）」输入框填写命令行参数（例如：`--input data.txt --mode fast`）
- 运行时会透传到 Judge0 的 `command_line_arguments` 字段

### 程序运行文件上传

- 上传区选择的文件会被打包为 ZIP，并通过 Judge0 的 `additional_files` 字段上传到执行环境
- 程序可通过执行参数传入文件名后直接读取（如 `input.txt`）

### 程序标准输入上传

- 在「程序标准输入（stdin）」区域点击“上传输入”可将文本文件内容直接填充到 stdin 输入框

### 输出文件自动下载

如果程序在标准输出打印以下标记块，页面会自动触发下载：

```text
__OUTPUT_FILE_BEGIN__
{"name":"result.txt","type":"text/plain","base64":"..."}
__OUTPUT_FILE_END__
```

其中 `base64` 为输出文件内容。

页面会根据当前所选语言动态展示对应的“输出文件示例”，并在示例注释中说明
`payload.type` 的常见取值：`text/plain`、`application/json`、`text/csv`、`image/png`、`application/octet-stream`。

Python 示例：

```python
with open("output.txt", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

payload = {
    "name": "output.txt",
    "type": "text/plain",
    "base64": b64
}

print("__OUTPUT_FILE_BEGIN__")
print(json.dumps(payload, ensure_ascii=False))
print("__OUTPUT_FILE_END__")
```

## 注意事项

- 在线执行依赖第三方 API，受网络与限流策略影响
- 生产环境建议自建 Judge0 实例或加一层代理服务，便于稳定性与配额控制
- ⚠️ 由于程序执行使用第三方 API，不要提交涉密、隐私的数据或文件
"# lite-code-runner" 
