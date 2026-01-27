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

console.log('=== Analyzing MOV 300 -> T4:14.PRE ===\n');

// Find T4:14.PRE
const t414PrePos = text.indexOf('T4:14.PRE');
console.log('T4:14.PRE found at position:', t414PrePos);

// Show 50 bytes before and 20 after
const before = programData.subarray(Math.max(0, t414PrePos - 50), t414PrePos);
const addr = programData.subarray(t414PrePos, t414PrePos + 9);
const after = programData.subarray(t414PrePos + 9, t414PrePos + 30);

console.log('\n50 bytes BEFORE T4:14.PRE:');
console.log('Hex:', before.toString('hex'));

// Look for 300 encoded as bytes
// 300 decimal = 0x012C
console.log('\nLooking for 300 (0x012C) in the bytes before:');
for (let i = 0; i < before.length - 1; i++) {
  // Little-endian check
  if (before[i] === 0x2C && before[i+1] === 0x01) {
    console.log('  Found 300 (LE) at offset -' + (before.length - i) + ' from address');
  }
  // Big-endian check
  if (before[i] === 0x01 && before[i+1] === 0x2C) {
    console.log('  Found 300 (BE) at offset -' + (before.length - i) + ' from address');
  }
}

console.log('\nAddress bytes (T4:14.PRE):');
console.log('Hex:', addr.toString('hex'));

console.log('\n20 bytes AFTER T4:14.PRE:');
console.log('Hex:', after.toString('hex'));

// Look for 300 in after bytes
console.log('\nLooking for 300 in bytes after:');
for (let i = 0; i < after.length - 1; i++) {
  if (after[i] === 0x2C && after[i+1] === 0x01) {
    console.log('  Found 300 (LE) at offset +' + (9 + i) + ' from address start');
  }
}

// Full hex dump
console.log('\n=== Full Region Hex Dump ===');
const fullRegion = programData.subarray(t414PrePos - 30, t414PrePos + 40);
for (let i = 0; i < fullRegion.length; i += 16) {
  const chunk = fullRegion.subarray(i, Math.min(i + 16, fullRegion.length));
  const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
  const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
  console.log('  ' + hex.padEnd(48) + ' ' + ascii);
}

// Check the structure pattern
console.log('\n=== Pattern Analysis ===');
console.log('Looking at bytes immediately before address marker (0b 80):');
const markerPos = t414PrePos - 5;
console.log('Bytes at pos-10 to pos-1:', programData.subarray(t414PrePos - 10, t414PrePos).toString('hex'));
console.log('Opcode byte (pos-6):', '0x' + programData[t414PrePos - 6].toString(16));
