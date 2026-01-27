const fs = require('fs');
const CFB = require('cfb');
const { inflateSync } = require('zlib');

const buffer = fs.readFileSync('./LANLOGIX_BR.RSS');
const data = new Uint8Array(buffer);
const cfb = CFB.read(data, { type: 'array' });

let programData = null;
for (const path of cfb.FullPaths || []) {
  if (path.includes('PROGRAM FILES') && path.indexOf('ONLINEIMAGE') === -1) {
    const entry = CFB.find(cfb, path);
    if (entry && entry.content && entry.content.length > 0) {
      const content = Buffer.from(entry.content);
      if (content.length > 16) {
        programData = inflateSync(content.subarray(16));
      }
      break;
    }
  }
}

const text = programData.toString('latin1');

// Comparison opcode values
const compOpcodes = {
  0x10: 'EQU',
  0x11: 'NEQ',
  0x12: 'LES',
  0x13: 'LEQ',
  0x14: 'GRT',
  0x15: 'GEQ'
};

function extractSourceAOperand(currentAddrPos, maxSearchBytes = 50) {
  const searchStart = Math.max(0, currentAddrPos - maxSearchBytes);

  // First, look for another address marker (0b 80 XX 00) before this one
  for (let pos = currentAddrPos - 10; pos >= searchStart; pos--) {
    if (programData[pos] === 0x0b && programData[pos + 1] === 0x80 && programData[pos + 3] === 0x00) {
      // Found a marker - extract the address
      const addrLength = programData[pos + 4];
      if (addrLength > 0 && addrLength < 20 && pos + 5 + addrLength <= currentAddrPos) {
        const addrText = text.substring(pos + 5, pos + 5 + addrLength);
        // Validate it looks like an SLC address
        if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
          return addrText.toUpperCase();
        }
      }
    }
  }

  // If no address found, look for a constant
  for (let pos = currentAddrPos - 6; pos >= searchStart; pos--) {
    const len = programData[pos];
    if (len >= 1 && len <= 10 && pos + len < currentAddrPos - 5) {
      let isConstant = true;
      let value = '';
      for (let i = 1; i <= len; i++) {
        const c = programData[pos + i];
        if (c >= 0x30 && c <= 0x39) {
          value += String.fromCharCode(c);
        } else {
          isConstant = false;
          break;
        }
      }
      if (isConstant && value.length === len) {
        return value;
      }
    }
  }

  return null;
}

// Find comparison instructions and extract both operands
const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi;
let match;
let count = 0;

console.log('=== Testing Comparison Instruction Extraction ===\n');

while ((match = addrPattern.exec(text)) !== null && count < 20) {
  const addr = match[0].toUpperCase();
  const pos = match.index;

  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];

        if (compOpcodes[opcode]) {
          const sourceA = extractSourceAOperand(pos);
          count++;

          if (sourceA) {
            console.log(`${compOpcodes[opcode]}(${sourceA}, ${addr})`);
          } else {
            console.log(`${compOpcodes[opcode]}(?, ${addr}) - Source A not found`);
          }
        }
      }
    }
  }
}

console.log(`\nTotal comparison instructions checked: ${count}`);
