# RSLogix 500 RSS File - Timer and Counter Structure

## Overview

This document describes the structure of Timer (T) and Counter (C) files in RSLogix 500 RSS files. RSS files are OLE Compound Document (CFB) files containing zlib-compressed data streams.

## CFB Streams Containing Timer/Counter Data

| Stream | Purpose |
|--------|---------|
| `Root Entry/DATA FILES/ObjectData` | Runtime data table values |
| `Root Entry/Extensional DATA FILES/ObjectData` | Extended data table values |
| `Root Entry/PROGRAM FILES/ObjectData` | Ladder logic with instruction parameters |
| `Root Entry/ONLINEIMAGE/DATA FILES/ObjectData` | Online image snapshot |

All streams use zlib compression with a 16-byte header that must be skipped before decompression:
```javascript
const decompressed = inflateSync(content.subarray(16));
```

---

## Timer File Structure (T4:x)

### Memory Layout

Each timer element consists of **3 consecutive 16-bit words (6 bytes total)**:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| +0 | 2 bytes | Control Word | Status bits (EN, TT, DN) |
| +2 | 2 bytes | PRE | Preset value (16-bit signed integer) |
| +4 | 2 bytes | ACC | Accumulated value (16-bit signed integer) |

### Control Word Bit Flags

```
Bit 15 (0x8000): EN - Enable bit
                 Set when timer instruction rung input is TRUE

Bit 14 (0x4000): TT - Timer Timing bit
                 Set when timer is actively timing (ACC < PRE and rung TRUE)

Bit 13 (0x2000): DN - Done bit
                 Set when ACC >= PRE (timer has completed)

Bits 0-12:       Reserved/internal use
```

### Extracting Timer Control Bits (JavaScript)

```javascript
const controlWord = buffer.readUInt16LE(baseOffset);
const preset = buffer.readInt16LE(baseOffset + 2);
const accum = buffer.readInt16LE(baseOffset + 4);

const en = !!(controlWord & 0x8000);  // Timer enabled
const tt = !!(controlWord & 0x4000);  // Timer timing
const dn = !!(controlWord & 0x2000);  // Timer done
```

### Timer Types

| Type | Name | Behavior |
|------|------|----------|
| TON | Timer On-Delay | Times when input is TRUE. Resets when input goes FALSE |
| TOF | Timer Off-Delay | Times when input is FALSE. Resets when input goes TRUE |
| RTO | Retentive Timer | Times when input is TRUE. Maintains ACC when input goes FALSE |

### Time Base Values

The time base determines how fast ACC increments:

| Time Base | Resolution | ACC increment |
|-----------|------------|---------------|
| 0.001 | 1 millisecond | 1 per ms |
| 0.01 | 10 milliseconds | 1 per 10ms |
| 0.1 | 100 milliseconds | 1 per 100ms |
| 1.0 | 1 second | 1 per second |

**Example:** Timer with PRE=300 and time base 0.01 = 3 second delay

---

## Counter File Structure (C5:x)

### Memory Layout

Each counter element consists of **3 consecutive 16-bit words (6 bytes total)**:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| +0 | 2 bytes | Control Word | Status bits (CU, CD, DN, OV, UN) |
| +2 | 2 bytes | PRE | Preset value (16-bit signed integer) |
| +4 | 2 bytes | ACC | Accumulated value (16-bit signed integer) |

### Control Word Bit Flags

```
Bit 15 (0x8000): CU - Count Up enable
                 Set when CTU instruction rung is TRUE

Bit 14 (0x4000): CD - Count Down enable
                 Set when CTD instruction rung is TRUE

Bit 13 (0x2000): DN - Done bit
                 Set when ACC >= PRE (for CTU)
                 Set when ACC < 0 (for CTD)

Bit 12 (0x1000): OV - Overflow bit
                 Set when ACC > 32767

Bit 11 (0x0800): UN - Underflow bit
                 Set when ACC < -32768

Bit 10 (0x0400): UA - Update Accumulator (HSC counters)

Bits 0-9:        Reserved/internal use
```

### Extracting Counter Control Bits (JavaScript)

```javascript
const controlWord = buffer.readUInt16LE(baseOffset);
const preset = buffer.readInt16LE(baseOffset + 2);
const accum = buffer.readInt16LE(baseOffset + 4);

const cu = !!(controlWord & 0x8000);  // Count up enabled
const cd = !!(controlWord & 0x4000);  // Count down enabled
const dn = !!(controlWord & 0x2000);  // Done
const ov = !!(controlWord & 0x1000);  // Overflow
const un = !!(controlWord & 0x0800);  // Underflow
```

### Counter Types

| Type | Name | Behavior |
|------|------|----------|
| CTU | Count Up | Increments ACC on rising edge. DN set when ACC >= PRE |
| CTD | Count Down | Decrements ACC on rising edge. DN set when ACC < 0 |
| RES | Reset | Resets ACC to 0 and clears all status bits |

---

## Data File Header Structure

Timer and counter files in the DATA FILES stream have a 16-byte header:

```
Offset  Size  Description
------  ----  -----------
0-1     2     File marker: 0x03 0x80
2       1     File type code
3-9     7     Reserved (usually zeros)
10-11   2     Element count (16-bit LE)
12-13   2     Words per element (16-bit LE)
14-15   2     Reserved
```

### File Type Codes

| Code | Type | Description |
|------|------|-------------|
| 0x01 | O | Output |
| 0x02 | I | Input |
| 0x03 | S | Status |
| 0x04 | B | Binary |
| 0x05 | T | Timer |
| 0x06 | C | Counter |
| 0x07 | R | Control |
| 0x08 | N | Integer |
| 0x09 | F | Float |
| 0x0A | ST | String |
| 0x0D | L | Long Integer |

### Default File Numbers

| Type | Default File # |
|------|---------------|
| O | 0 |
| I | 1 |
| S | 2 |
| B | 3 |
| T | 4 |
| C | 5 |
| R | 6 |
| N | 7 |
| F | 8 |

---

## Extracting Initial PRE/ACC Values from Program Files

The DATA FILES stream contains **runtime values** which may be 0 or outdated. The **programmed initial values** are stored in the PROGRAM FILES stream as part of the timer/counter instruction encoding.

### Instruction Encoding Format

Timer/counter instructions follow this binary pattern:

```
[opcode area] [0x0b 0x80] [type] [0x00] [len] [address] [len] [param1] [len] [param2] ...
```

Where:
- `0x0b 0x80` - Address marker
- `type` - Instruction type byte (0x04 for timers)
- `len` - Length byte for following ASCII string
- `address` - ASCII timer/counter address (e.g., "T4:0")
- `param1/2/3` - Length-prefixed ASCII parameters

### Timer Instruction Parameters

```
Timer: [address] [timebase] [preset] [accum]
Example: T4:0 -> "0.01" "300" "0"
         Means: 10ms time base, PRE=300, ACC=0
```

### Counter Instruction Parameters

```
Counter: [address] [preset] [accum]
Example: C5:0 -> "100" "0"
         Means: PRE=100, ACC=0
```

### Extraction Algorithm (JavaScript)

```javascript
function extractTimerParams(programData, timerAddrPos, timerAddrLen) {
  const params = [];
  let pos = timerAddrPos + timerAddrLen;

  while (params.length < 3 && pos < timerAddrPos + timerAddrLen + 30) {
    const len = programData[pos];
    if (len >= 1 && len <= 10 && pos + len < programData.length) {
      let value = '';
      let isValid = true;

      for (let i = 1; i <= len; i++) {
        const c = programData[pos + i];
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e) { // digits and decimal
          value += String.fromCharCode(c);
        } else {
          isValid = false;
          break;
        }
      }

      if (isValid && value.length === len) {
        params.push(value);
        pos += len + 1;
        continue;
      }
    }
    pos++;
  }

  return {
    timeBase: params[0] || null,
    preset: params[1] || null,
    accum: params[2] || null
  };
}
```

---

## Example: Complete Timer Extraction

```javascript
const fs = require('fs');
const CFB = require('cfb');
const { inflateSync } = require('zlib');

// Read RSS file
const buffer = fs.readFileSync('program.RSS');
const cfb = CFB.read(new Uint8Array(buffer), { type: 'array' });

// Get program data
const entry = CFB.find(cfb, 'Root Entry/PROGRAM FILES/ObjectData');
const content = Buffer.from(entry.content);
const programData = inflateSync(content.subarray(16));
const text = programData.toString('latin1');

// Find timer instructions
const timerPattern = /T\d+:\d+(?![.\/\[])/g;
let match;

while ((match = timerPattern.exec(text)) !== null) {
  const addr = match[0];
  const pos = match.index;

  // Verify it's a timer instruction (not a bit reference)
  if (pos >= 6) {
    const lenByte = programData[pos - 1];
    if (lenByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80) {
        // Extract parameters
        const params = extractTimerParams(programData, pos, addr.length);
        console.log(`${addr}: TimeBase=${params.timeBase}, PRE=${params.preset}, ACC=${params.accum}`);
      }
    }
  }
}
```

---

## Sample Timer Data from LANLOGIX_BR.RSS

| Timer | Time Base | PRE | ACC | Description |
|-------|-----------|-----|-----|-------------|
| T4:0 | 0.01 (10ms) | 50 | 0 | 0.5 second delay |
| T4:1 | 0.01 (10ms) | 1000 | 0 | 10 second delay |
| T4:14 | 0.01 (10ms) | 300 | 0 | 3 second delay |
| T4:30 | 0.01 (10ms) | 5000 | 5000 | 50 second delay (pre-loaded) |
| T4:41 | 1.0 (1sec) | 5994 | 0 | ~100 minute delay |
| T4:62 | 1.0 (1sec) | 3600 | 1216 | 1 hour with partial count |
| T4:76 | 0.01 (10ms) | 32000 | 0 | 320 second (max ~5.3 min) |

**Note:** The maximum PRE/ACC value is 32767 (16-bit signed integer limit).

---

## Key Insights

1. **Two Sources of Values**: Runtime values in DATA FILES, initial/programmed values in PROGRAM FILES.

2. **Element Allocation**: The DATA FILES stream may show fewer elements than actually used. Timer/counter elements beyond the allocated range still work but use default/zero values.

3. **Time Calculation**: Actual time = PRE x TimeBase. A timer with PRE=300 and TimeBase=0.01 delays for 3.0 seconds.

4. **Control Word State**: The control word in DATA FILES reflects the last runtime state. In offline files, this may show 0xFFFF (all bits set) or 0x0000 depending on when the file was saved.

5. **Instruction vs Data**: Timer/counter instructions in ladder logic contain the programmed parameters. The DATA FILES values are updated during PLC execution.

---

## Verified Binary Encoding Examples

### Timer Instruction Hex Pattern

The following is a verified hex dump of the T4:14 timer instruction from LANLOGIX_BR.RSS:

```
Position 1324-1349:
01 00 04 0b 80 04 00 05 54 34 3a 31 34 04 30 2e 30 31 03 33 30 30 01 30
         ^^^^^       ^^ ^^^^^^^^^^^^^ ^^ ^^^^^^^^^ ^^ ^^^^^^^ ^^ ^^
         marker   type len "T4:14"   len "0.01"   len "300"  len "0"
```

Breakdown:
- `0b 80` - Address marker (always this pattern)
- `04` - Type byte (indicates timer instruction context)
- `00` - Separator
- `05` - Length of address string (5 characters)
- `54 34 3a 31 34` - ASCII "T4:14"
- `04` - Length of timebase (4 characters)
- `30 2e 30 31` - ASCII "0.01" (10ms time base)
- `03` - Length of preset (3 characters)
- `33 30 30` - ASCII "300" (PRE value)
- `01` - Length of accumulator (1 character)
- `30` - ASCII "0" (ACC value)

### Another Example: T4:26 with Non-Zero ACC

```
T4:26: TimeBase="0.01", PRE="250", ACC="250"

Hex at position 8326-8347:
0b 80 04 00 05 54 34 3a 32 36 04 30 2e 30 31 03 32 35 30 03 32 35 30
^^^^^       ^^ ^^^^^^^^^^^^^ ^^ ^^^^^^^^^ ^^ ^^^^^^^ ^^ ^^^^^^^
marker   type len "T4:26"   len "0.01"   len "250"  len "250"
```

### Timer with 1-Second Time Base: T4:41

```
T4:41: TimeBase="1.0", PRE="5994", ACC="0"

Pattern shows:
- TimeBase "1.0" (3 characters) = 1 second resolution
- PRE "5994" (4 characters) = 5994 seconds = ~100 minutes
```

---

## Address Detection Algorithm

To distinguish timer/counter **instructions** (TON, TOF, CTU, CTD) from **bit references** (T4:0.DN, C5:0.CU):

1. Timer/counter instructions use bare addresses: `T4:0`, `C5:12`
2. Bit references include subfields: `T4:0.DN`, `T4:0/13`, `C5:0.CU`
3. Use regex pattern: `/T\d+:\d+(?![.\/\[])/` to match only instructions
4. Verify the address marker `0x0b 0x80` precedes the address
5. Check that the length byte matches the address string length

```javascript
// Pattern to match timer instructions (not bit references)
const timerInstrPattern = /T\d+:\d+(?![.\/\[])/g;

// Pattern to match timer bit references
const timerBitPattern = /T\d+:\d+(\.\w+|\/\d+)/g;
```

---

## Complete Timer List from LANLOGIX_BR.RSS

The analyzed file contains **127 unique timer addresses** with **151 total timer instructions**:

| Timer Range | Count | Typical PRE Values |
|-------------|-------|-------------------|
| T4:0-T4:30 | 28 | 25-5000 (0.25s - 50s at 10ms) |
| T4:35-T4:48 | 14 | 150-5994 (varies) |
| T4:51-T4:76 | 17 | 30-32000 |
| T4:80-T4:93 | 12 | 5-32000 |
| T4:100-T4:112 | 12 | 25-600 |
| T4:120-T4:153 | 28 | 0-1000 |
| T4:167-T4:250 | 16 | 100-9999 |

**Note:** This program does not use any counter (CTU/CTD) instructions.
