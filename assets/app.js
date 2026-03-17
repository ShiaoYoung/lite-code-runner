import { FALLBACK_LANGUAGES, LANGUAGE_PRESETS } from "./config.js";
import { debugCode, fetchLanguages, runCode } from "./executor.js";

const INPUT_FILE_BEGIN = "__INPUT_FILES_JSON_BEGIN__";
const INPUT_FILE_END = "__INPUT_FILES_JSON_END__";
const OUTPUT_FILE_BEGIN = "__OUTPUT_FILE_BEGIN__";
const OUTPUT_FILE_END = "__OUTPUT_FILE_END__";

const ui = {
  languageSelect: document.getElementById("languageSelect"),
  versionSelect: document.getElementById("versionSelect"),
  codeInput: document.getElementById("codeInput"),
  codeLines: document.getElementById("codeLines"),
  uploadCodeButton: document.getElementById("uploadCodeButton"),
  sourceCodeFileInput: document.getElementById("sourceCodeFileInput"),
  uploadStdinButton: document.getElementById("uploadStdinButton"),
  stdinFileInput: document.getElementById("stdinFileInput"),
  executionArgsInput: document.getElementById("executionArgsInput"),
  stdinInput: document.getElementById("stdinInput"),
  stdinLines: document.getElementById("stdinLines"),
  fileInput: document.getElementById("fileInput"),
  inputFileExampleSummary: document.getElementById("inputFileExampleSummary"),
  inputFileExampleCode: document.getElementById("inputFileExampleCode"),
  outputFileExampleSummary: document.getElementById("outputFileExampleSummary"),
  outputFileExampleCode: document.getElementById("outputFileExampleCode"),
  outputBox: document.getElementById("outputBox"),
  runButton: document.getElementById("runButton"),
  debugButton: document.getElementById("debugButton"),
  helpFab: document.getElementById("helpFab"),
  helpModal: document.getElementById("helpModal"),
  helpModalClose: document.getElementById("helpModalClose"),
  helpMarkdownContent: document.getElementById("helpMarkdownContent"),
  helpModalStatus: document.getElementById("helpModalStatus")
};

const state = {
  languages: {},
  selectedLanguage: "python",
  helpMarkdownHtml: "",
  helpMarkdownLoading: false
};

const INPUT_FILE_EXAMPLES = {
  python: `import sys

# 在“执行参数”中填写文件名，例如：input.txt
if len(sys.argv) < 2:
    print("请在执行参数中传入文件名，例如：input.txt")
    raise SystemExit(1)

filename = sys.argv[1]
with open(filename, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

print(f"读取文件成功: {filename}")
print(content)
`,
  javascript: `const fs = require("fs");

// 在“执行参数”中填写文件名，例如：input.txt
const filename = process.argv[2];
if (!filename) {
  console.log("请在执行参数中传入文件名，例如：input.txt");
  process.exit(1);
}

const content = fs.readFileSync(filename, "utf8");
console.log("读取文件成功: " + filename);
console.log(content);
`,
  java: `import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) throws Exception {
        // 在“执行参数”中填写文件名，例如：input.txt
        if (args.length < 1) {
            System.out.println("请在执行参数中传入文件名，例如：input.txt");
            return;
        }

        String filename = args[0];
        String content = Files.readString(Paths.get(filename), StandardCharsets.UTF_8);
        System.out.println("读取文件成功: " + filename);
        System.out.println(content);
    }
}
`,
  c: `#include <stdio.h>

int main(int argc, char *argv[]) {
    // 在“执行参数”中填写文件名，例如：input.txt
    if (argc < 2) {
        printf("请在执行参数中传入文件名，例如：input.txt\\n");
        return 1;
    }

    const char *filename = argv[1];
    FILE *fp = fopen(filename, "r");
    if (!fp) {
        printf("打开文件失败: %s\\n", filename);
        return 1;
    }

    char buf[1024];
    printf("读取文件成功: %s\\n", filename);
    while (fgets(buf, sizeof(buf), fp)) {
        fputs(buf, stdout);
    }
    fclose(fp);
    return 0;
}
`,
  "c++": `#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char *argv[]) {
    // 在“执行参数”中填写文件名，例如：input.txt
    if (argc < 2) {
        std::cout << "请在执行参数中传入文件名，例如：input.txt\\n";
        return 1;
    }

    std::string filename = argv[1];
    std::ifstream in(filename);
    if (!in.is_open()) {
        std::cout << "打开文件失败: " << filename << "\\n";
        return 1;
    }

    std::cout << "读取文件成功: " << filename << "\\n";
    std::string line;
    while (std::getline(in, line)) {
        std::cout << line << "\\n";
    }
    return 0;
}
`,
  matlab: `% 在“执行参数”中填写文件名，例如：input.txt
args = argv();
if numel(args) < 1
    disp('请在执行参数中传入文件名，例如：input.txt');
    return;
end

filename = args{1};
fid = fopen(filename, 'r');
if fid < 0
    disp(['打开文件失败: ', filename]);
    return;
end

disp(['读取文件成功: ', filename]);
while true
    line = fgetl(fid);
    if ~ischar(line)
        break;
    end
    disp(line);
end
fclose(fid);
`
};

const OUTPUT_FILE_EXAMPLES = {
  python: `import base64
import json

with open("output.txt", "w", encoding="utf-8") as f:
    f.write("hello from python\\n")

with open("output.txt", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

payload = {
    "name": "output.txt",
    # payload.type 常见值：text/plain, application/json, text/csv,
    # image/png, application/octet-stream
    "type": "text/plain",
    "base64": b64
}

print("__OUTPUT_FILE_BEGIN__")
print(json.dumps(payload, ensure_ascii=False))
print("__OUTPUT_FILE_END__")
`,
  javascript: `const fs = require("fs");

fs.writeFileSync("output.txt", "hello from javascript\\n", "utf8");
const b64 = fs.readFileSync("output.txt").toString("base64");

const payload = {
  name: "output.txt",
  // payload.type 常见值：text/plain, application/json, text/csv,
  // image/png, application/octet-stream
  type: "text/plain",
  base64: b64
};

console.log("__OUTPUT_FILE_BEGIN__");
console.log(JSON.stringify(payload));
console.log("__OUTPUT_FILE_END__");
`,
  java: `import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;

public class Main {
    public static void main(String[] args) throws Exception {
        Files.write(Paths.get("output.txt"), "hello from java\\n".getBytes(StandardCharsets.UTF_8));
        byte[] bytes = Files.readAllBytes(Paths.get("output.txt"));
        String b64 = Base64.getEncoder().encodeToString(bytes);

        // payload.type 常见值：text/plain, application/json, text/csv,
        // image/png, application/octet-stream
        String payload = "{\"name\":\"output.txt\",\"type\":\"text/plain\",\"base64\":\"" + b64 + "\"}";

        System.out.println("__OUTPUT_FILE_BEGIN__");
        System.out.println(payload);
        System.out.println("__OUTPUT_FILE_END__");
    }
}
`,
  c: `#include <stdio.h>

/*
 * C 语言示例：请将 output.txt 内容做 Base64 编码后填入 b64（可自行实现 base64_encode）。
 * payload.type 常见值：text/plain, application/json, text/csv, image/png, application/octet-stream
 */
int main(void) {
    FILE *fp = fopen("output.txt", "w");
    if (fp) {
        fputs("hello from c\\n", fp);
        fclose(fp);
    }

    const char *b64 = "aGVsbG8gZnJvbSBjCg=="; /* 示例值：\"hello from c\\n\" */

    printf("__OUTPUT_FILE_BEGIN__\\n");
    printf("{\"name\":\"output.txt\",\"type\":\"text/plain\",\"base64\":\"%s\"}\\n", b64);
    printf("__OUTPUT_FILE_END__\\n");
    return 0;
}
`,
  "c++": `#include <fstream>
#include <iostream>

/*
 * C++ 示例：请将 output.txt 内容做 Base64 编码后填入 b64（可自行实现 base64_encode）。
 * payload.type 常见值：text/plain, application/json, text/csv, image/png, application/octet-stream
 */
int main() {
    std::ofstream out("output.txt");
    out << "hello from cpp\\n";
    out.close();

    std::string b64 = "aGVsbG8gZnJvbSBjcHAK"; // 示例值："hello from cpp\\n"

    std::cout << "__OUTPUT_FILE_BEGIN__\\n";
    std::cout << "{\"name\":\"output.txt\",\"type\":\"text/plain\",\"base64\":\"" << b64 << "\"}\\n";
    std::cout << "__OUTPUT_FILE_END__\\n";
    return 0;
}
`,
  matlab: `% Matlab/Octave 示例：使用 Java Base64 编码输出文件
fid = fopen('output.txt', 'w');
fprintf(fid, 'hello from matlab\\n');
fclose(fid);

fid = fopen('output.txt', 'rb');
bytes = fread(fid, Inf, '*uint8');
fclose(fid);

b64 = char(org.apache.commons.codec.binary.Base64.encodeBase64(bytes))';

% payload.type 常见值：text/plain, application/json, text/csv,
% image/png, application/octet-stream
payload = sprintf('{"name":"output.txt","type":"text/plain","base64":"%s"}', b64);

disp('__OUTPUT_FILE_BEGIN__');
disp(payload);
disp('__OUTPUT_FILE_END__');
`
};

function extractVersionLabel(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : name;
}

function extractSortableNumber(versionLabel) {
  const match = versionLabel.match(/(\d+(?:\.\d+)*)/);
  return (match?.[1] ?? "0")
    .split(".")
    .map((item) => Number.parseInt(item, 10))
    .map((num) => (Number.isNaN(num) ? 0 : num));
}

function compareVersionDesc(a, b) {
  const va = extractSortableNumber(a.versionLabel);
  const vb = extractSortableNumber(b.versionLabel);
  const length = Math.max(va.length, vb.length);

  for (let i = 0; i < length; i += 1) {
    const left = va[i] ?? 0;
    const right = vb[i] ?? 0;
    if (left !== right) {
      return right - left;
    }
  }

  return b.name.localeCompare(a.name);
}

function normalizeLanguages(languageList) {
  const selected = Object.fromEntries(Object.keys(LANGUAGE_PRESETS).map((key) => [key, []]));

  for (const language of languageList) {
    const name = String(language.name ?? "");
    for (const [key, preset] of Object.entries(LANGUAGE_PRESETS)) {
      if (preset.matcher.test(name)) {
        selected[key].push({
          id: language.id,
          name,
          versionLabel: extractVersionLabel(name)
        });
        break;
      }
    }
  }

  for (const key of Object.keys(selected)) {
    const unique = new Map();
    for (const item of selected[key]) {
      const identity = `${item.versionLabel}-${item.id}`;
      if (!unique.has(identity)) {
        unique.set(identity, item);
      }
    }

    selected[key] = [...unique.values()].sort(compareVersionDesc);
  }

  return selected;
}

function getLanguageOptions(languageKey) {
  const options = state.languages[languageKey] ?? [];
  if (options.length > 0) {
    return options;
  }

  return FALLBACK_LANGUAGES[languageKey] ?? [];
}

function createOption(text, value) {
  const option = document.createElement("option");
  option.textContent = text;
  option.value = String(value);
  return option;
}

function renderLanguageSelect() {
  ui.languageSelect.innerHTML = "";
  for (const [key, preset] of Object.entries(LANGUAGE_PRESETS)) {
    ui.languageSelect.appendChild(createOption(preset.label, key));
  }
  ui.languageSelect.value = state.selectedLanguage;
}

function renderVersionSelect(language) {
  const options = getLanguageOptions(language);
  ui.versionSelect.innerHTML = "";

  for (const item of options) {
    ui.versionSelect.appendChild(createOption(item.versionLabel, item.id));
  }
}

function renderOutputFileExample(language) {
  const code = OUTPUT_FILE_EXAMPLES[language] || OUTPUT_FILE_EXAMPLES.python;
  const label = LANGUAGE_PRESETS[language]?.label || "Python";
  ui.outputFileExampleSummary.textContent = `如何编写代码才能输出文件（${label} 示例）`;
  ui.outputFileExampleCode.textContent = code;
}

function renderInputFileExample(language) {
  const code = INPUT_FILE_EXAMPLES[language] || INPUT_FILE_EXAMPLES.python;
  const label = LANGUAGE_PRESETS[language]?.label || "Python";
  ui.inputFileExampleSummary.textContent = `如何编写代码才能输入文件（${label} 示例）`;
  ui.inputFileExampleCode.textContent = code;
}

function setTemplateCode(language) {
  const preset = LANGUAGE_PRESETS[language];
  if (preset) {
    ui.codeInput.value = preset.template;
    updateLineNumbers(ui.codeInput, ui.codeLines);
  }
}

function updateLineNumbers(textarea, lineBox) {
  const lineCount = textarea.value.split("\n").length;
  const lines = Array.from({ length: Math.max(lineCount, 1) }, (_, index) => index + 1).join("\n");
  lineBox.textContent = lines;
  lineBox.scrollTop = textarea.scrollTop;
}

function setupLineNumbers(textarea, lineBox) {
  updateLineNumbers(textarea, lineBox);
  textarea.addEventListener("input", () => updateLineNumbers(textarea, lineBox));
  textarea.addEventListener("scroll", () => {
    lineBox.scrollTop = textarea.scrollTop;
  });
}

function setupTabInsertion(textarea, lineBox) {
  textarea.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = `${value.slice(0, start)}\t${value.slice(end)}`;
    const cursor = start + 1;
    textarea.selectionStart = cursor;
    textarea.selectionEnd = cursor;
    updateLineNumbers(textarea, lineBox);
  });
}

function escapeHtml(raw) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeLink(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) {
    return trimmed;
  }
  return "#";
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const safeUrl = sanitizeLink(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inCodeBlock = false;
  let inUnorderedList = false;
  let inOrderedList = false;

  function closeLists() {
    if (inUnorderedList) {
      html.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  }

  for (const rawLine of lines) {
    if (rawLine.startsWith("```")) {
      closeLists();
      if (!inCodeBlock) {
        html.push("<pre><code>");
        inCodeBlock = true;
      } else {
        html.push("</code></pre>");
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(`${escapeHtml(rawLine)}\n`);
      continue;
    }

    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }

    if (/^---+$/.test(line)) {
      closeLists();
      html.push("<hr />");
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html.push("<ul>");
        inUnorderedList = true;
      }
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (inUnorderedList) {
        html.push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      closeLists();
      html.push(`<blockquote>${renderInlineMarkdown(quoteMatch[1])}</blockquote>`);
      continue;
    }

    closeLists();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeLists();
  if (inCodeBlock) {
    html.push("</code></pre>");
  }

  return html.join("\n");
}

function setHelpStatus(message = "") {
  if (!(ui.helpModalStatus instanceof HTMLElement)) {
    return;
  }

  ui.helpModalStatus.textContent = message;
  ui.helpModalStatus.hidden = message.length === 0;
}

function setHelpModalOpen(isOpen) {
  if (!(ui.helpModal instanceof HTMLElement)) {
    return;
  }

  ui.helpModal.hidden = !isOpen;
  document.body.style.overflow = isOpen ? "hidden" : "";
}

async function buildHelpMarkdownHtml() {
  const response = await fetch("./how-to-use.md", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("读取 how-to-use.md 失败，无法加载帮助文档。");
  }

  const markdown = await response.text();
  return markdownToHtml(markdown) || "<p>帮助文档为空。</p>";
}

async function ensureHelpMarkdownReady() {
  if (state.helpMarkdownHtml) {
    return state.helpMarkdownHtml;
  }

  if (state.helpMarkdownLoading) {
    while (state.helpMarkdownLoading) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    if (state.helpMarkdownHtml) {
      return state.helpMarkdownHtml;
    }
  }

  state.helpMarkdownLoading = true;
  try {
    state.helpMarkdownHtml = await buildHelpMarkdownHtml();
    return state.helpMarkdownHtml;
  } finally {
    state.helpMarkdownLoading = false;
  }
}

async function openHelpModal() {
  setHelpModalOpen(true);
  setHelpStatus("正在加载 how-to-use.md，请稍候...");

  if (!(ui.helpMarkdownContent instanceof HTMLElement)) {
    setHelpStatus("帮助文档容器不可用，请刷新页面后重试。");
    return;
  }

  try {
    const markdownHtml = await ensureHelpMarkdownReady();
    ui.helpMarkdownContent.innerHTML = markdownHtml;
    setHelpStatus("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "帮助文档加载失败。";
    setHelpStatus(message);
  }
}

function closeHelpModal() {
  setHelpModalOpen(false);
}

function base64ToUint8Array(base64) {
  const normalized = base64.replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getUploadedRuntimeFiles() {
  const fileList = ui.fileInput.files;
  if (!fileList || fileList.length === 0) {
    return [];
  }

  return [...fileList];
}

async function buildAdditionalFilesBase64(files) {
  if (files.length === 0) {
    return "";
  }

  const jsZip = globalThis.JSZip;
  if (typeof jsZip !== "function") {
    throw new Error("文件打包组件加载失败，请刷新页面后重试。");
  }

  const zip = new jsZip();
  for (const file of files) {
    zip.file(file.name, await file.arrayBuffer());
  }

  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

async function buildStdinFilePayload(files) {
  const packed = [];
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    packed.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      base64: arrayBufferToBase64(buffer)
    });
  }
  return packed;
}

function mergeStdinWithFiles(stdin, files) {
  if (files.length === 0) {
    return stdin;
  }

  const payload = JSON.stringify({ files });
  const trimmed = stdin.trimEnd();
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : "";
  return `${prefix}${INPUT_FILE_BEGIN}\n${payload}\n${INPUT_FILE_END}`;
}

function parseOutputFiles(stdout) {
  const files = [];
  let cursor = 0;

  while (true) {
    const start = stdout.indexOf(OUTPUT_FILE_BEGIN, cursor);
    if (start < 0) {
      break;
    }

    const jsonStart = start + OUTPUT_FILE_BEGIN.length;
    const end = stdout.indexOf(OUTPUT_FILE_END, jsonStart);
    if (end < 0) {
      break;
    }

    const raw = stdout.slice(jsonStart, end).trim();
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.name === "string" && typeof parsed.base64 === "string") {
        files.push(parsed);
      }
    } catch {
      // ignore malformed file blocks and continue parsing
    }

    cursor = end + OUTPUT_FILE_END.length;
  }

  return files;
}

function collectOutputFilesFromResult(result) {
  const channels = [result.stdout || "", result.stderr || "", result.compile_output || "", result.message || ""];
  const all = channels.flatMap((item) => parseOutputFiles(item));
  const unique = new Map();
  for (const file of all) {
    const key = `${file.name}:${file.base64}`;
    if (!unique.has(key)) {
      unique.set(key, file);
    }
  }

  return [...unique.values()];
}

function stripOutputFileBlocks(stdout) {
  let result = stdout;
  while (true) {
    const start = result.indexOf(OUTPUT_FILE_BEGIN);
    if (start < 0) {
      break;
    }

    const end = result.indexOf(OUTPUT_FILE_END, start + OUTPUT_FILE_BEGIN.length);
    if (end < 0) {
      break;
    }

    result = `${result.slice(0, start)}${result.slice(end + OUTPUT_FILE_END.length)}`;
  }

  return result.trim();
}

function sanitizeFileName(name) {
  const replaced = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return replaced.length > 0 ? replaced : "output.bin";
}

function downloadOutputFiles(files) {
  const downloaded = [];
  const failed = [];

  for (const file of files) {
    try {
      const bytes = base64ToUint8Array(file.base64);
      const blob = new Blob([bytes], { type: file.type || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = sanitizeFileName(file.name);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
      downloaded.push(anchor.download);
    } catch {
      failed.push(file.name || "unknown");
    }
  }

  return { downloaded, failed };
}

function extractOutput(result) {
  const compileOutput = result.compile_output || "";
  const stderr = result.stderr || "";
  const stdout = result.stdout || "";
  const status = result.status?.description ? `【状态】\n${result.status.description}` : "";
  const time = result.time ? `【耗时】\n${result.time}s` : "";
  const memory = result.memory ? `【内存】\n${result.memory} KB` : "";

  const blocks = [
    compileOutput ? `【编译信息】\n${compileOutput}` : "",
    stderr ? `【错误输出】\n${stderr}` : "",
    stdout ? `【运行输出】\n${stdout}` : "",
    status,
    time,
    memory
  ].filter(Boolean);

  return blocks.length > 0 ? blocks.join("\n\n") : "程序执行完成，无输出。";
}

function setBusy(isBusy) {
  ui.runButton.disabled = isBusy;
  ui.runButton.textContent = isBusy ? "运行中..." : "运行代码";
}

async function handleRun() {
  const languageId = Number.parseInt(ui.versionSelect.value, 10);
  const source = ui.codeInput.value;
  const args = ui.executionArgsInput.value.trim();
  const stdin = ui.stdinInput.value;

  if (!source.trim()) {
    ui.outputBox.textContent = "请先输入程序代码。";
    return;
  }

  if (Number.isNaN(languageId)) {
    ui.outputBox.textContent = "语言版本不可用，请刷新页面后重试。";
    return;
  }

  setBusy(true);
  ui.outputBox.textContent = "正在调用在线执行服务，请稍候...";

  try {
    const runtimeFiles = getUploadedRuntimeFiles();
    let fallbackNotice = "";
    let result;

    try {
      const additionalFiles = await buildAdditionalFilesBase64(runtimeFiles);
      result = await runCode({ languageId, source, stdin, args, additionalFiles });
    } catch (error) {
      const status = Number(Reflect.get(error, "status"));
      if (runtimeFiles.length > 0 && status === 400) {
        const compatFiles = await buildStdinFilePayload(runtimeFiles);
        const compatStdin = mergeStdinWithFiles(stdin, compatFiles);
        result = await runCode({ languageId, source, stdin: compatStdin, args, additionalFiles: "" });
        fallbackNotice = "\n\n提示：当前执行服务拒绝运行时文件直传，已自动回退为 stdin 注入协议。";
      } else {
        throw error;
      }
    }

    const outputFiles = collectOutputFilesFromResult(result);
    if (outputFiles.length > 0) {
      const downloadResult = downloadOutputFiles(outputFiles);
      result.stdout = stripOutputFileBlocks(result.stdout || "");
      result.stderr = stripOutputFileBlocks(result.stderr || "");
      result.compile_output = stripOutputFileBlocks(result.compile_output || "");
      result.message = stripOutputFileBlocks(result.message || "");

      const downloadedNames = downloadResult.downloaded.join("、");
      const failedNames = downloadResult.failed.join("、");
      const baseOutput = extractOutput(result);
      ui.outputBox.textContent =
        downloadResult.failed.length > 0
          ? `${baseOutput}\n\n已尝试下载输出文件：${downloadedNames || "无"}\n下载失败文件：${failedNames}${fallbackNotice}`
          : `${baseOutput}\n\n已自动下载输出文件：${downloadedNames}${fallbackNotice}`;
      return;
    }

    const baseOutput = extractOutput(result);
    ui.outputBox.textContent =
      outputFiles.length > 0
        ? `${baseOutput}\n\n已自动下载输出文件：${outputFiles.map((item) => item.name).join("、")}${fallbackNotice}`
        : `${baseOutput}${fallbackNotice}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    ui.outputBox.textContent = message.startsWith("执行失败：") ? message : `执行失败：${message}`;
  } finally {
    setBusy(false);
  }
}

async function handleDebug() {
  const result = await debugCode();
  ui.outputBox.textContent = result.message;
}

async function handleSourceCodeFileSelect(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.files || target.files.length === 0) {
    return;
  }

  const sourceFile = target.files[0];
  try {
    const content = await sourceFile.text();
    ui.codeInput.value = content;
    updateLineNumbers(ui.codeInput, ui.codeLines);
    ui.outputBox.textContent = `已加载源代码文件：${sourceFile.name}`;
  } catch {
    ui.outputBox.textContent = "源代码文件读取失败，请重试。";
  } finally {
    target.value = "";
  }
}

async function handleStdinFileSelect(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.files || target.files.length === 0) {
    return;
  }

  const stdinFile = target.files[0];
  try {
    const content = await stdinFile.text();
    ui.stdinInput.value = content;
    updateLineNumbers(ui.stdinInput, ui.stdinLines);
    ui.outputBox.textContent = `已将文件内容填充到标准输入：${stdinFile.name}`;
  } catch {
    ui.outputBox.textContent = "标准输入文件读取失败，请重试。";
  } finally {
    target.value = "";
  }
}

async function initialize() {
  renderLanguageSelect();
  setTemplateCode(state.selectedLanguage);
  renderInputFileExample(state.selectedLanguage);
  renderOutputFileExample(state.selectedLanguage);
  setupLineNumbers(ui.codeInput, ui.codeLines);
  setupLineNumbers(ui.stdinInput, ui.stdinLines);
  setupTabInsertion(ui.codeInput, ui.codeLines);
  setupTabInsertion(ui.stdinInput, ui.stdinLines);

  try {
    const languageList = await fetchLanguages();
    state.languages = normalizeLanguages(languageList);
  } catch {
    state.languages = { ...FALLBACK_LANGUAGES };
    ui.outputBox.textContent = "提示：语言列表拉取失败，已使用内置版本。";
  }

  renderVersionSelect(state.selectedLanguage);

  ui.languageSelect.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    state.selectedLanguage = target.value;
    renderVersionSelect(state.selectedLanguage);
    setTemplateCode(state.selectedLanguage);
    renderInputFileExample(state.selectedLanguage);
    renderOutputFileExample(state.selectedLanguage);
  });

  ui.runButton.addEventListener("click", handleRun);
  ui.debugButton.addEventListener("click", handleDebug);
  ui.uploadCodeButton.addEventListener("click", () => {
    ui.sourceCodeFileInput.click();
  });
  ui.uploadStdinButton.addEventListener("click", () => {
    ui.stdinFileInput.click();
  });
  ui.sourceCodeFileInput.addEventListener("change", handleSourceCodeFileSelect);
  ui.stdinFileInput.addEventListener("change", handleStdinFileSelect);

  if (ui.helpFab instanceof HTMLButtonElement) {
    ui.helpFab.addEventListener("click", () => {
      void openHelpModal();
    });
  }

  if (ui.helpModalClose instanceof HTMLButtonElement) {
    ui.helpModalClose.addEventListener("click", closeHelpModal);
  }

  if (ui.helpModal instanceof HTMLElement) {
    ui.helpModal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.dataset.helpClose === "backdrop") {
        closeHelpModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.helpModal instanceof HTMLElement && !ui.helpModal.hidden) {
      closeHelpModal();
    }
  });

}

initialize();
