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
  0x09: 'MOV',  // 2 operands: Source, Dest
  0x0A: 'ADD',  // 3 operands: Source A, Source B, Dest
  0x0B: 'SUB',  // 3 operands
  0x0C: 'MUL',  // 3 operands
  0x0D: 'DIV'   // 3 operands
};

console.log('=== Analyzing Math Instructions ===\n');

// Find math instructions and show context
const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi;
let match;
let count = 0;

console.log('First 10 ADD/SUB/MUL/DIV instructions with context:\n');

while ((match = addrPattern.exec(text)) !== null && count < 10) {
  const addr = match[0].toUpperCase();
  const pos = match.index;

  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];

        // Only ADD, SUB, MUL, DIV (not MOV)
        if (opcode >= 0x0A && opcode <= 0x0D) {
          count++;
          console.log(`#${count} ${mathOpcodes[opcode]}:`);
          console.log(`   Destination: ${addr} at position ${pos}`);

          // Show 60 bytes before
          const beforeStart = Math.max(0, pos - 60);
          const before = programData.subarray(beforeStart, pos);

          console.log(`   Before (60 bytes): ${before.toString('hex')}`);

          // Try to find ASCII text in before region
          const beforeText = text.substring(beforeStart, pos);
          const visibleBefore = beforeText.replace(/[^\x20-\x7E]/g, '.');
          console.log(`   Before text: "${visibleBefore}"`);

          // Look for address markers and constants
          console.log('   Looking for Source A and Source B:');

          // Find all 0b 80 markers in the before region
          const markers = [];
          for (let p = beforeStart; p < pos - 5; p++) {
            if (programData[p] === 0x0b && programData[p + 1] === 0x80 && programData[p + 3] === 0x00) {
              const len = programData[p + 4];
              if (len > 0 && len < 20) {
                const addrText = text.substring(p + 5, p + 5 + len);
                if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
                  markers.push({ pos: p + 5, addr: addrText.toUpperCase() });
                }
              }
            }
          }

          // Look for constants (length-prefixed ASCII digits)
          const constants = [];
          for (let p = beforeStart; p < pos - 5; p++) {
            const len = programData[p];
            if (len >= 1 && len <= 10) {
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
                // Make sure this isn't part of an address
                const nextByte = programData[p + len + 1];
                if (nextByte !== 0x3a && nextByte !== 0x2f) { // Not : or /
                  constants.push({ pos: p, value });
                }
              }
            }
          }

          if (markers.length > 0) {
            console.log(`     Address markers found: ${markers.map(m => m.addr).join(', ')}`);
          }
          if (constants.length > 0) {
            // Filter out duplicates and likely false positives
            const uniqueConstants = [...new Set(constants.map(c => c.value))];
            console.log(`     Constants found: ${uniqueConstants.join(', ')}`);
          }

          // Full hex dump
          console.log('\n   Hex dump:');
          const start = Math.max(0, pos - 50);
          const end = Math.min(pos + 20, programData.length);
          for (let i = start; i < end; i += 16) {
            const chunk = programData.subarray(i, Math.min(i + 16, end));
            const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
            console.log(`     ${i.toString().padStart(6)}: ${hex.padEnd(48)} ${ascii}`);
          }

          console.log('');
        }
      }
    }
  }
}
