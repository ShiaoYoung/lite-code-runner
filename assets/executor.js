import { EXECUTION_API } from "./config.js";

function buildUrl(pathname) {
  return `${EXECUTION_API.baseUrl}${pathname}`;
}

function uint8ArrayToBinary(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return binary;
}

function encodeUtf8Base64(text) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return btoa(uint8ArrayToBinary(bytes));
}

function decodeUtf8Base64(base64Text) {
  const binary = atob(base64Text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(bytes);
}

function decodeResponseField(field) {
  if (typeof field !== "string" || field.length === 0) {
    return field;
  }

  try {
    return decodeUtf8Base64(field);
  } catch {
    return field;
  }
}

function normalizeResultWhenBase64(result) {
  if (!result || typeof result !== "object") {
    return result;
  }

  return {
    ...result,
    stdout: decodeResponseField(result.stdout),
    stderr: decodeResponseField(result.stderr),
    compile_output: decodeResponseField(result.compile_output),
    message: decodeResponseField(result.message)
  };
}

async function extractErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await response.json();
      if (typeof body === "string" && body.trim()) {
        return body;
      }

      if (body && typeof body === "object") {
        if (typeof body.error === "string" && body.error.trim()) {
          return body.error;
        }

        if (typeof body.message === "string" && body.message.trim()) {
          return body.message;
        }

        const normalized = Object.entries(body)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(", ")}`;
            }
            return `${key}: ${String(value)}`;
          })
          .join("; ");

        if (normalized.trim()) {
          return normalized;
        }
      }
    } catch {
      // fall through to text parsing
    }
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // ignore body read errors
  }

  return "";
}

export async function fetchLanguages() {
  const response = await fetch(buildUrl(EXECUTION_API.languagesPath));
  if (!response.ok) {
    throw new Error(`获取语言列表失败：HTTP ${response.status}`);
  }

  return response.json();
}

export async function runCode({ languageId, source, stdin, args, additionalFiles, compileOptions = "" }) {
  const payload = {
    source_code: encodeUtf8Base64(source),
    language_id: languageId,
    stdin: encodeUtf8Base64(stdin),
    command_line_arguments: args,
    cpu_time_limit: 2,
    wall_time_limit: 5,
    memory_limit: 256000
  };

  if (additionalFiles) {
    payload.additional_files = additionalFiles;
  }

  if (compileOptions) {
    payload.compiler_options = compileOptions;
  }

  const query = "?base64_encoded=true&wait=true";

  const response = await fetch(buildUrl(`${EXECUTION_API.submissionsPath}${query}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await extractErrorMessage(response);
    const suffix = detail ? `，${detail}` : "";
    const error = new Error(`执行失败：HTTP ${response.status}${suffix}`);
    error.name = "ExecutionApiError";
    Reflect.set(error, "status", response.status);
    Reflect.set(error, "detail", detail);
    throw error;
  }

  const result = await response.json();
  return normalizeResultWhenBase64(result);
}

export async function debugCode() {
  return {
    supported: false,
    message: "Debug 功能尚未接入，当前为预留扩展点。"
  };
}
