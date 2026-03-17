export const EXECUTION_API = {
  baseUrl: "https://ce.judge0.com",
  languagesPath: "/languages",
  submissionsPath: "/submissions"
};

export const LANGUAGE_PRESETS = {
  python: {
    label: "Python",
    template: "print('Hello, Code Runner Hub!')\n",
    matcher: /Python/i
  },
  c: {
    label: "C",
    template:
      "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, Code Runner Hub!\\n\");\n    return 0;\n}\n",
    matcher: /^C\s*\(/i
  },
  "c++": {
    label: "C++",
    template:
      "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, Code Runner Hub!\\n\";\n    return 0;\n}\n",
    matcher: /^C\+\+\s*\(/i
  },
  java: {
    label: "Java",
    template:
      "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Code Runner Hub!\");\n    }\n}\n",
    matcher: /^Java\s*\(/i
  },
  javascript: {
    label: "JavaScript",
    template: "console.log('Hello, Code Runner Hub!');\n",
    matcher: /^JavaScript\s*\(/i
  },
  matlab: {
    label: "Matlab",
    template: "disp('Hello, Code Runner Hub!');\n",
    matcher: /^(Octave|MATLAB)\s*\(/i
  }
};

export const FALLBACK_LANGUAGES = {
  python: [{ id: 71, name: "Python (3.8.1)", versionLabel: "3.8.1" }],
  c: [{ id: 50, name: "C (GCC 9.2.0)", versionLabel: "GCC 9.2.0" }],
  "c++": [{ id: 54, name: "C++ (GCC 9.2.0)", versionLabel: "GCC 9.2.0" }],
  java: [{ id: 62, name: "Java (OpenJDK 13.0.1)", versionLabel: "OpenJDK 13.0.1" }],
  javascript: [
    { id: 102, name: "JavaScript (Node.js 22.08.0)", versionLabel: "Node.js 22.08.0" },
    { id: 97, name: "JavaScript (Node.js 20.17.0)", versionLabel: "Node.js 20.17.0" },
    { id: 93, name: "JavaScript (Node.js 18.15.0)", versionLabel: "Node.js 18.15.0" },
    { id: 63, name: "JavaScript (Node.js 12.14.0)", versionLabel: "Node.js 12.14.0" }
  ],
  matlab: [{ id: 66, name: "Octave (5.1.0)", versionLabel: "Octave 5.1.0" }]
};
