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

// Math opcode values
const mathOpcodes = {
  0x0A: 'ADD',
  0x0B: 'SUB',
  0x0C: 'MUL',
  0x0D: 'DIV'
};

function extractMathOperands(destAddrPos, maxSearchBytes = 80) {
  const searchStart = Math.max(0, destAddrPos - maxSearchBytes);
  const foundAddresses = [];
  const foundConstants = [];

  // Find all address markers
  for (let pos = searchStart; pos < destAddrPos - 5; pos++) {
    if (programData[pos] === 0x0b && programData[pos + 1] === 0x80 && programData[pos + 3] === 0x00) {
      const addrLength = programData[pos + 4];
      if (addrLength > 0 && addrLength < 20 && pos + 5 + addrLength <= destAddrPos) {
        const addrText = text.substring(pos + 5, pos + 5 + addrLength);
        if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
          foundAddresses.push({ pos: pos + 5, addr: addrText.toUpperCase() });
        }
      }
    }
  }

  // Find constants (including floating point)
  for (let pos = searchStart; pos < destAddrPos - 5; pos++) {
    const len = programData[pos];
    if (len >= 1 && len <= 12 && pos + len < destAddrPos) {
      let isNumeric = true;
      let value = '';
      for (let i = 1; i <= len; i++) {
        const c = programData[pos + i];
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e) {
          value += String.fromCharCode(c);
        } else {
          isNumeric = false;
          break;
        }
      }
      if (isNumeric && value.length === len && /^\d+\.?\d*$/.test(value)) {
        const nextByte = programData[pos + len + 1];
        if (nextByte !== 0x3a && nextByte !== 0x2f) {
          foundConstants.push({ pos, value });
        }
      }
    }
  }

  // Combine and sort
  const allOperands = [
    ...foundAddresses.map(a => ({ pos: a.pos, value: a.addr })),
    ...foundConstants.map(c => ({ pos: c.pos, value: c.value }))
  ].sort((a, b) => a.pos - b.pos);

  if (allOperands.length >= 2) {
    return {
      sourceA: allOperands[allOperands.length - 2].value,
      sourceB: allOperands[allOperands.length - 1].value
    };
  } else if (allOperands.length === 1) {
    return {
      sourceA: allOperands[0].value,
      sourceB: allOperands[0].value
    };
  }
  return { sourceA: null, sourceB: null };
}

// Find math instructions
const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi;
let match;
let count = 0;

console.log('=== Testing Math Instruction Extraction ===\n');

while ((match = addrPattern.exec(text)) !== null && count < 15) {
  const addr = match[0].toUpperCase();
  const pos = match.index;

  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];

        if (mathOpcodes[opcode]) {
          const operands = extractMathOperands(pos);
          count++;

          if (operands.sourceA && operands.sourceB) {
            console.log(`${mathOpcodes[opcode]}(${operands.sourceA}, ${operands.sourceB}, ${addr})`);
          } else {
            console.log(`${mathOpcodes[opcode]}(?, ?, ${addr}) - operands not found`);
          }
        }
      }
    }
  }
}

console.log(`\nTotal math instructions checked: ${count}`);
