import { handleSecurityIncident } from './alertService.js';

/**
 * Known Malware, Virus Signatures & Exploit Patterns
 */
export const ANTIVIRUS_SIGNATURES = [
  // Standard EICAR Antivirus Test Signature (Industry Standard)
  {
    id: 'AV_EICAR_TEST_VIRUS',
    name: 'EICAR Standard Antivirus Test Virus Signature',
    severity: 'CRITICAL',
    pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/i
  },

  // PHP Webshell & Remote Code Execution (RCE) Payloads
  {
    id: 'AV_WEBSHELL_PHP_RCE',
    name: 'PHP Remote Command Execution / Webshell Payload',
    severity: 'CRITICAL',
    pattern: /(eval\s*\(\s*(base64_decode|gzinflate|str_rot13|gzuncompress)|passthru\s*\(|shell_exec\s*\(|system\s*\(|proc_open\s*\(|popen\s*\(|assert\s*\(\s*\$_)/i
  },

  // Common Webshell Brand Signatures (c99, r57, WSO, b374k, FilesMan)
  {
    id: 'AV_KNOWN_WEBSHELL_FAMILY',
    name: 'Known Malicious Webshell Backdoor Signature',
    severity: 'CRITICAL',
    pattern: /(\bc99shell\b|\br57shell\b|\bb374k\b|\bFilesMan\b|\bWSO\s+shell\b|WSO\s+version|\bAlarg\s+Shell\b|\bAngel\s+Shell\b)/i
  },

  // Interactive Reverse Shell Commands
  {
    id: 'AV_REVERSE_SHELL_COMMAND',
    name: 'Reverse Interactive Shell Command Pattern',
    severity: 'CRITICAL',
    pattern: /(\/bin\/sh\s+-i|\/bin\/bash\s+-i|nc\s+-e\s+\/bin\/|bash\s+-c\s+['"]bash\s+-i|cmd\.exe\s+\/c\s+powershell|powershell(\.exe)?\s+(-enc|-encodedcommand|-nop|-w\s+hidden))/i
  },

  // Suspicious Shellcode / NOP Sled Execution
  {
    id: 'AV_SHELLCODE_NOP_SLED',
    name: 'Buffer Overflow / NOP Sled Shellcode Pattern',
    severity: 'HIGH',
    pattern: /(\\x90\\x90\\x90\\x90\\x90|0x90,0x90,0x90,0x90|\x90\x90\x90\x90\x90)/
  },

  // Encoded JavaScript Malicious Droppers
  {
    id: 'AV_OBFUSCATED_JS_DROPPER',
    name: 'Obfuscated JavaScript Payload / Script Dropper',
    severity: 'HIGH',
    pattern: /(String\.fromCharCode\s*\(\s*(\d+\s*,\s*){8,}\d+\s*\)|unescape\s*\(\s*['"]%u[0-9a-fA-F]{4})/i
  },

  // Dangerous Windows Executable / PE Header binary blobs
  {
    id: 'AV_PE_EXECUTABLE_BINARY',
    name: 'Embedded Windows Executable / PE Binary Header in Data Payload',
    severity: 'HIGH',
    pattern: /^TVqQAAMAAAAEAAAA/ // Base64 representation of MZ binary header
  },

  // Linux ELF Executable Header
  {
    id: 'AV_ELF_BINARY_HEADER',
    name: 'Embedded Linux ELF Executable Binary Header in Data Payload',
    severity: 'HIGH',
    pattern: /^f0VMRg/ // Base64 representation of ELF header
  }
];

// Dangerous file extensions often used in attack uploads
const DISALLOWED_FILE_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.bin', '.vbs', '.ps1', 
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.phar',
  '.asp', '.aspx', '.jsp', '.jspx', '.cgi', '.pl', '.py', '.jar', '.scr'
];

/**
 * Deep recursive scanner to test any value, object, string, or file buffer for viruses
 */
export function scanForMalware(data, originContext = 'Request Payload') {
  if (data === null || data === undefined) {
    return { isClean: true };
  }

  // Handle String scanning
  if (typeof data === 'string') {
    // Skip base64 image data URLs from false-positive extension checks
    if (data.startsWith('data:image/')) {
      return { isClean: true };
    }

    // 1. Check for Virus / Malware Signatures
    for (const sig of ANTIVIRUS_SIGNATURES) {
      if (sig.pattern.test(data)) {
        return {
          isClean: false,
          threatType: 'MALWARE_VIRUS_DETECTED',
          signatureId: sig.id,
          threatName: sig.name,
          severity: sig.severity,
          matchedSnippet: data.substring(0, 120),
          context: originContext
        };
      }
    }

    // 2. Check for dangerous extension mentions in upload filenames only
    const isFileContext = originContext.toLowerCase().includes('file') || 
                          originContext.toLowerCase().includes('filename') || 
                          originContext.toLowerCase().includes('attachment');
    if (isFileContext) {
      for (const ext of DISALLOWED_FILE_EXTENSIONS) {
        if (data.toLowerCase().endsWith(ext) || data.toLowerCase().includes(`${ext}.`)) {
          return {
            isClean: false,
            threatType: 'DANGEROUS_FILE_EXTENSION',
            signatureId: 'AV_UNAUTHORIZED_EXECUTABLE_NAME',
            threatName: `Disallowed Executable File Extension (${ext})`,
            severity: 'HIGH',
            matchedSnippet: data,
            context: originContext
          };
        }
      }
    }
  }

  // Handle Object / Array scanning recursively
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    for (const key of keys) {
      // Check for object pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return {
          isClean: false,
          threatType: 'PROTOTYPE_POLLUTION_ATTACK',
          signatureId: 'AV_PROTO_POLLUTION',
          threatName: 'JavaScript Prototype Pollution Exploit Attempt',
          severity: 'HIGH',
          matchedSnippet: key,
          context: `${originContext} -> Key: ${key}`
        };
      }

      const val = data[key];
      const scanResult = scanForMalware(val, `${originContext} -> ${key}`);
      if (!scanResult.isClean) {
        return scanResult;
      }
    }
  }

  return { isClean: true };
}

/**
 * Direct file upload buffer scanner
 */
export function scanFileBuffer(fileBuffer, originalFilename = '') {
  if (!fileBuffer) return { isClean: true };

  const ext = originalFilename ? originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase() : '';
  if (DISALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      isClean: false,
      threatType: 'DISALLOWED_EXECUTABLE_FILE',
      signatureId: 'AV_EXEC_EXT',
      threatName: `Executable file extension blocked: ${ext}`,
      severity: 'CRITICAL',
      matchedSnippet: originalFilename
    };
  }

  const textSample = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 50000));
  return scanForMalware(textSample, `Uploaded File: ${originalFilename}`);
}

export default {
  scanForMalware,
  scanFileBuffer,
  ANTIVIRUS_SIGNATURES
};
