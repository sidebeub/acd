/**
 * Verify hex patterns for timer/counter instruction encoding
 */

const fs = require('fs');
const CFB = require('cfb');
const { inflateSync } = require('zlib');

const buffer = fs.readFileSync('./LANLOGIX_BR.RSS');
const data = new Uint8Array(buffer);
const cfb = CFB.read(data, { type: 'array' });

let programData = null;
for (const path of cfb.FullPaths || []) {
  if (path === 'Root Entry/PROGRAM FILES/ObjectData') {
    const entry = CFB.find(cfb, path);
    if (entry && entry.content && entry.content.length > 0) {
      const content = Buffer.from(entry.content);
      programData = inflateSync(content.subarray(16));
    }
  }
}

const text = programData.toString('latin1');

console.log('='.repeat(80));
console.log('TIMER INSTRUCTION HEX PATTERN ANALYSIS');
console.log('='.repeat(80));

// Find a few timer instructions and analyze the full pattern
const timerPattern = /T4:\d+(?![.\/\[])/g;
let match;
let count = 0;

console.log('\nDetailed analysis of timer instruction encoding:\n');

while ((match = timerPattern.exec(text)) !== null && count < 8) {
  const addr = match[0];
  const pos = match.index;

  if (pos >= 6) {
    const lenByte = programData[pos - 1];
    if (lenByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80) {
        count++;
        console.log(`\n${'#'.repeat(50)}`);
        console.log(`Timer #${count}: ${addr}`);
        console.log(`${'#'.repeat(50)}`);

        // Show 40 bytes before and 30 bytes after
        const start = Math.max(0, pos - 40);
        const end = Math.min(programData.length, pos + addr.length + 30);

        // Annotated hex dump
        console.log('\nAnnotated hex dump:');
        console.log(`Position ${start} to ${end}:`);

        let line = '';
        let ascii = '';
        let annotation = '';
        let annotationLine = '';

        for (let i = start; i < end; i++) {
          const b = programData[i];
          const hex = b.toString(16).padStart(2, '0');
          line += hex + ' ';
          ascii += (b >= 32 && b < 127) ? String.fromCharCode(b) : '.';

          // Add annotations
          if (i === pos - 5) annotation = 'marker->';
          else if (i === pos - 4) annotation = '';
          else if (i === pos - 3) annotation = 'type->';
          else if (i === pos - 2) annotation = '';
          else if (i === pos - 1) annotation = 'len->';
          else if (i >= pos && i < pos + addr.length) {
            if (i === pos) annotation = 'addr->';
            else annotation = '';
          } else if (i === pos + addr.length) annotation = 'tb_len->';
          else annotation = '';

          if (annotation) {
            annotationLine += annotation.padStart(3 * (i - start) - annotationLine.length + annotation.length);
          }

          if ((i - start + 1) % 16 === 0 || i === end - 1) {
            console.log(`  ${(i - 15 + (16 - (i - start + 1) % 16) % 16).toString().padStart(6)}: ${line.padEnd(48)} ${ascii}`);
            if (annotationLine) {
              console.log(`         ${annotationLine}`);
            }
            line = '';
            ascii = '';
            annotationLine = '';
          }
        }

        // Parse the parameters
        const paramStart = pos + addr.length;
        console.log(`\nParameter parsing from position ${paramStart}:`);

        let scanPos = paramStart;
        const params = [];

        for (let p = 0; p < 3 && scanPos < paramStart + 20; ) {
          const len = programData[scanPos];
          console.log(`  Byte at ${scanPos}: 0x${len.toString(16)} (${len})`);

          if (len >= 1 && len <= 10) {
            let value = '';
            let valid = true;
            for (let i = 1; i <= len; i++) {
              const c = programData[scanPos + i];
              if ((c >= 0x30 && c <= 0x39) || c === 0x2e) {
                value += String.fromCharCode(c);
              } else {
                valid = false;
                break;
              }
            }

            if (valid && value.length === len) {
              params.push(value);
              console.log(`    -> Parameter ${p + 1}: "${value}"`);
              scanPos += len + 1;
              p++;
              continue;
            }
          }
          scanPos++;
        }

        console.log(`\nExtracted: TimeBase="${params[0]}", PRE="${params[1]}", ACC="${params[2]}"`);
      }
    }
  }
}

// Show the marker pattern summary
console.log('\n' + '='.repeat(80));
console.log('MARKER PATTERN SUMMARY');
console.log('='.repeat(80));

console.log(`
Timer/Counter Address Marker Pattern:
  0x0b 0x80 [type] 0x00 [len] [address_bytes...]

Where:
  0x0b 0x80 = Fixed marker identifying an address reference
  type     = Context byte (0x04 for timer instructions)
  0x00     = Separator
  len      = Length of address string
  address  = ASCII address (e.g., "T4:0", "C5:12")

Parameter Format (follows address):
  [len] [ASCII digits/decimal point...]

Example T4:14 encoding:
  0b 80 04 00 05 54 34 3a 31 34  04 30 2e 30 31  03 33 30 30  01 30
  ^^^^^ marker  ^^ type  ^^ len ^^^^^ "T4:14"   ^^ len ^^^^ "0.01"  ^^ len ^^^ "300" ^^ len ^ "0"
                                                 (timebase)          (preset)        (accum)
`);

// Also check for any counter patterns in the file
console.log('\n' + '='.repeat(80));
console.log('SEARCHING FOR COUNTER INSTRUCTIONS');
console.log('='.repeat(80));

// Look for any C file references
const allCounterRefs = text.match(/C\d+:\d+/g) || [];
const uniqueCounterRefs = [...new Set(allCounterRefs)];
console.log(`\nAll C file references found: ${uniqueCounterRefs.length}`);
if (uniqueCounterRefs.length > 0) {
  console.log(uniqueCounterRefs.slice(0, 20).join(', '));
}

// Check if any are actual counter instructions (vs bit references)
const counterInstrPattern = /C\d+:\d+(?![.\/\[])/g;
let counterMatch;
let counterInstrCount = 0;

while ((counterMatch = counterInstrPattern.exec(text)) !== null) {
  const addr = counterMatch[0];
  const pos = counterMatch.index;

  if (pos >= 6) {
    const lenByte = programData[pos - 1];
    if (lenByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        counterInstrCount++;
        console.log(`Found counter instruction: ${addr} at ${pos}`);

        // Show context
        const context = programData.subarray(pos - 10, pos + 20).toString('hex');
        console.log(`  Context: ${context}`);
      }
    }
  }
}

if (counterInstrCount === 0) {
  console.log('\nNo CTU/CTD counter instructions found in this program.');
  console.log('(Counter bit references like C5:0.DN may still exist for examining counter status)');
}
