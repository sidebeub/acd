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

console.log('=== Analyzing Comparison Instructions ===\n');

// Comparison opcode values
const compOpcodes = {
  0x10: 'EQU',
  0x11: 'NEQ',
  0x12: 'LES',
  0x13: 'LEQ',
  0x14: 'GRT',
  0x15: 'GEQ'
};

// Find addresses and check for comparison opcodes
const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi;
let match;
let compCount = 0;

console.log('First 15 comparison instructions with context:\n');

while ((match = addrPattern.exec(text)) !== null && compCount < 15) {
  const addr = match[0].toUpperCase();
  const pos = match.index;

  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];

        if (compOpcodes[opcode]) {
          compCount++;
          console.log(`#${compCount} ${compOpcodes[opcode]}:`);
          console.log(`   Address: ${addr} at position ${pos}`);

          // Show 40 bytes before and 20 after
          const beforeStart = Math.max(0, pos - 40);
          const before = programData.subarray(beforeStart, pos);
          const after = programData.subarray(pos, Math.min(pos + addr.length + 20, programData.length));

          console.log(`   Before (40 bytes): ${before.toString('hex')}`);
          console.log(`   Address+After: ${after.toString('hex')}`);

          // Try to find ASCII text in before region
          const beforeText = text.substring(beforeStart, pos);
          const visibleBefore = beforeText.replace(/[^\x20-\x7E]/g, '.');
          console.log(`   Before text: "${visibleBefore}"`);

          // Look for length-prefixed constants or addresses before the marker
          console.log('   Looking for Source B (constant or address):');

          // Check for constant (length-prefixed ASCII digits)
          for (let p = pos - 7; p >= beforeStart; p--) {
            const len = programData[p];
            if (len >= 1 && len <= 10 && p + len < pos - 5) {
              let isConstant = true;
              let value = '';
              for (let i = 1; i <= len; i++) {
                const c = programData[p + i];
                if (c >= 0x30 && c <= 0x39) {
                  value += String.fromCharCode(c);
                } else {
                  isConstant = false;
                  break;
                }
              }
              if (isConstant && value.length === len) {
                console.log(`     Found constant "${value}" at offset -${pos - p}`);
                break;
              }
            }
          }

          // Check for another address marker before this one
          for (let p = pos - 10; p >= beforeStart; p--) {
            if (programData[p] === 0x0b && programData[p + 1] === 0x80) {
              // Found another marker - check if it has an address
              const prevLen = programData[p + 4];
              if (prevLen > 0 && prevLen < 20) {
                const prevAddr = text.substring(p + 5, p + 5 + prevLen);
                if (/^[BIOTCRNFSAL]\d+/i.test(prevAddr)) {
                  console.log(`     Found address "${prevAddr}" at offset -${pos - (p + 5)}`);
                  break;
                }
              }
            }
          }

          console.log('');
        }
      }
    }
  }
}

// Now analyze the structure more carefully
console.log('\n=== Detailed Structure Analysis ===\n');

// Find a specific EQU instruction and decode its full structure
addrPattern.lastIndex = 0;
let equFound = false;

while ((match = addrPattern.exec(text)) !== null && !equFound) {
  const addr = match[0].toUpperCase();
  const pos = match.index;

  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];

        if (opcode === 0x10) { // EQU
          equFound = true;
          console.log('Detailed EQU analysis:');
          console.log(`Address: ${addr}`);

          // Full hex dump of region
          const start = Math.max(0, pos - 50);
          const end = Math.min(pos + 30, programData.length);

          console.log('\nHex dump (50 before, address, 30 after):');
          for (let i = start; i < end; i += 16) {
            const chunk = programData.subarray(i, Math.min(i + 16, end));
            const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
            const marker = (pos >= i && pos < i + 16) ? ' <-- address starts here' : '';
            console.log(`  ${i.toString().padStart(6)}: ${hex.padEnd(48)} ${ascii}${marker}`);
          }
        }
      }
    }
  }
}
