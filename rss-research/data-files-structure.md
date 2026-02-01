# RSLogix 500 RSS DATA FILES Binary Structure

## Overview

RSLogix 500 project files (.RSS) are Microsoft Compound Document Files (CFB/OLE format). The data files are stored in the `DATA FILES/ObjectData` stream, compressed using zlib starting at offset 16.

## Stream Extraction

```javascript
const CFB = require('cfb');
const zlib = require('zlib');
const fs = require('fs');

const data = fs.readFileSync('project.RSS');
const cfb = CFB.read(data, {type: 'buffer'});

// Find the DATA FILES/ObjectData entry
let entry = null;
for (let i = 0; i < cfb.FileIndex.length; i++) {
  if (cfb.FullPaths[i] === 'Root Entry/DATA FILES/ObjectData') {
    entry = cfb.FileIndex[i];
    break;
  }
}

// Decompress (zlib starts at offset 16)
const compressed = Buffer.from(entry.content);
const decompressed = zlib.inflateSync(compressed.slice(16));
```

## Compressed Stream Header

| Offset | Size | Description |
|--------|------|-------------|
| 0-3 | 4 | Version/magic (0x00000002) |
| 4-7 | 4 | Compression offset (0x10 = 16) |
| 8-11 | 4 | Compressed size |
| 12-15 | 4 | Decompressed size |
| 16+ | var | zlib compressed data |

## Data File Marker: 0x03 0x80

Each data file section within the decompressed stream begins with the marker `0x03 0x80`. This marker is preceded by the file's name.

### Name Structure (before 0x03 0x80)

| Offset | Size | Description |
|--------|------|-------------|
| -N-4 | 2 | Name length (uint16 LE) |
| -N-2 | 2 | Flags (typically 0) |
| -N | N | ASCII name (null-padded to 4-byte alignment) |

Example for "INTEGER" (7 characters):
```
00 07 00 00 07 49 4e 54 45 47 45 52 00 00 00 00 03 80 ...
   ^len    ^len ^I  ^N  ^T  ^E  ^G  ^E  ^R  padding   ^marker
```

### Data File Header (at 0x03 0x80)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0-1 | 2 | Marker | Always 0x03 0x80 (little-endian: 0x8003) |
| 2 | 1 | FileNum | Data file number (e.g., 7 for N7, 8 for N8) |
| 3-9 | 7 | Reserved | Always zeros |
| 10-11 | 2 | ElementCount | Number of elements (uint16 LE) |
| 12-13 | 2 | WordsPerElement | Words (16-bit) per element |
| 14-15 | 2 | Flags | Typically 0x0000 |
| 16-17 | 2 | Separator | Always 0xFFFF |
| 18+ | var | Data | Raw element data |

## Words Per Element

The `WordsPerElement` field determines how data is stored:

| Words | Bytes | File Types | Storage Format |
|-------|-------|------------|----------------|
| 1 | 2 | O (Output), I (Input), S (Status), B (Binary), R (Control) | 16-bit integer |
| 2 | 4 | N (Integer), F (Float) | 32-bit value |
| 3 | 6 | T (Timer), C (Counter) | 3-word structure |
| Other | Varies | MG, PD, specialized | Custom structures |

## The "2 Words Per Element" Mystery

### Why N (Integer) files show 2 words per element

RSLogix 500 stores N-file (Integer) values using 32 bits (4 bytes = 2 words), not 16 bits as the name might suggest. This allows:

1. **32-bit integer storage** - Values from -2,147,483,648 to 2,147,483,647
2. **Float storage** - IEEE 754 single-precision floats (common in practice)
3. **32-bit bitwise operations**

### Structure of 32-bit values

Each 32-bit value is stored as two 16-bit words in little-endian format:

```
Word 1 (offset +0): Lower 16 bits (mantissa for floats)
Word 2 (offset +2): Upper 16 bits (sign + exponent for floats)
```

## Interpreting the "Suspicious Values": 16256, 16634, 17414

These values appear in Word 2 (upper 16 bits) and are **IEEE 754 float exponent patterns**.

### IEEE 754 Single-Precision Float Structure

```
Bit 31:    Sign (0 = positive, 1 = negative)
Bits 30-23: Exponent (biased by 127)
Bits 22-0:  Mantissa (fractional part)
```

### Value Breakdown

| Word 2 | Hex | Binary | Sign | Exp | Meaning |
|--------|-----|--------|------|-----|---------|
| 16256 | 0x3F80 | 0011 1111 1000 0000 | 0 | 127 | 1.0 exactly |
| 16320 | 0x3FC0 | 0011 1111 1100 0000 | 0 | 127 | 1.5 exactly |
| 16384 | 0x4000 | 0100 0000 0000 0000 | 0 | 128 | 2.0 exactly |
| 16544 | 0x40A0 | 0100 0000 1010 0000 | 0 | 129 | 5.0 exactly |
| 16608 | 0x40E0 | 0100 0000 1110 0000 | 0 | 129 | 7.0 exactly |
| 16634 | 0x40FA | 0100 0000 1111 1010 | 0 | 129 | ~7.83 |
| 16640 | 0x4100 | 0100 0001 0000 0000 | 0 | 130 | 8.0 exactly |
| 17157 | 0x4305 | 0100 0011 0000 0101 | 0 | 134 | ~133.3 |
| 17414 | 0x4406 | 0100 0100 0000 0110 | 0 | 136 | ~538.9 |

### Example: Value 538.9222

```
Stored bytes: 05 bb 06 44
Word 1: 0xBB05 = 47877 (lower mantissa bits)
Word 2: 0x4406 = 17414 (sign + exponent + upper mantissa)

Combined as uint32: 0x4406BB05
As IEEE 754 float:  538.9222412109375
```

## Correct Offsets for Reading Values

### 2-Word-Per-Element Files (N, F)

```javascript
// Data starts at offset 18 (relative to 0x03 0x80 marker)
const dataStart = markerOffset + 18;
const elementSize = 4; // bytes

// Read element N
const offset = dataStart + (elementIndex * elementSize);
const floatValue = buffer.readFloatLE(offset);
const int32Value = buffer.readInt32LE(offset);

// Or as individual words
const word1 = buffer.readUInt16LE(offset);     // Lower 16 bits
const word2 = buffer.readUInt16LE(offset + 2); // Upper 16 bits
```

### 1-Word-Per-Element Files (O, I, S, B, R)

```javascript
const dataStart = markerOffset + 18;
const elementSize = 2; // bytes

// Read element N
const offset = dataStart + (elementIndex * elementSize);
const int16Value = buffer.readInt16LE(offset);
```

### 3-Word-Per-Element Files (T, C)

```javascript
const dataStart = markerOffset + 18;
const elementSize = 6; // bytes

// Read Timer/Counter element N
const offset = dataStart + (elementIndex * elementSize);
const controlWord = buffer.readUInt16LE(offset);     // Status bits
const presetValue = buffer.readUInt16LE(offset + 2); // PRE
const accumulator = buffer.readUInt16LE(offset + 4); // ACC
```

## Real-World Observations from LANLOGIX_BR.RSS

### File Types Found

| Name | File# | Elements | Words/Elem | Actual Storage |
|------|-------|----------|------------|----------------|
| OUTPUT | 1 | 11 | 1 | 16-bit integers |
| INPUT | 2 | 66 | 1 | 16-bit integers |
| STATUS | 3 | 110 | 1 | 16-bit integers |
| BINARY | 4 | 251 | 3 | 3-word structures |
| TIMER | 5 | 1 | 3 | Timer structure |
| COUNTER | 6 | 1 | 3 | Counter structure |
| CONTROL | 7 | 210 | 1 | 16-bit integers |
| INTEGER | 8 | 40 | 2 | IEEE 754 floats! |
| FLOAT | 8 | 50 | 2 | IEEE 754 floats |
| MAINT | 16 | 5 | 2 | 32-bit integers |

### Key Insight

The file labeled "INTEGER" in this project actually stores **IEEE 754 floats**, not integers. This is valid because:

1. RSLogix allows flexible use of N-files for any 32-bit data
2. The ladder logic may use MOV instructions to treat these as floats
3. HMI systems often store floating-point parameters in N-files

**Always check the actual data values** rather than assuming from the file name. If Word 2 values fall in the 0x3F00-0x4700 range, the data is likely IEEE 754 floats.

## Distinguishing N (Integer) vs F (Float) File Types

### No Binary Type Code

There is **no binary type code** in the header that distinguishes N-files from F-files. Both share:
- Same marker (0x03 0x80)
- Same `WordsPerElement` value (2)
- Same 32-bit data storage format

The only difference is the **file NAME** (e.g., "INTEGER" vs "FLOAT") which indicates the programmer's intended use.

### Heuristic for Float Detection

To determine if a 2-word-per-element file contains floats or integers:

```javascript
function isLikelyFloat(word2) {
  // Extract the exponent from upper word
  const exp = (word2 >> 7) & 0xFF;

  // IEEE 754 floats for reasonable values (0.0001 to 65000)
  // have exponents between ~113 (2^-14) and ~143 (2^16)
  return exp >= 100 && exp <= 150;
}

function analyzeFile(buffer, markerOffset) {
  const elementCount = buffer.readUInt16LE(markerOffset + 10);
  let floatLike = 0, intLike = 0;

  for (let i = 0; i < Math.min(elementCount, 20); i++) {
    const offset = markerOffset + 18 + i * 4;
    const word2 = buffer.readUInt16LE(offset + 2);
    const int32 = buffer.readInt32LE(offset);

    if (word2 === 0 && int32 === 0) continue; // Skip zeros

    if (isLikelyFloat(word2)) {
      floatLike++;
    } else if (Math.abs(int32) < 1000000 && word2 < 20) {
      intLike++;
    }
  }

  return floatLike > intLike ? 'float' : 'integer';
}
```

## Timer/Counter Structure Detail

For 3-word-per-element files (T, C):

| Word | Offset | Description |
|------|--------|-------------|
| 0 | +0 | Control bits (EN, TT, DN, etc.) |
| 1 | +2 | Preset value (PRE) |
| 2 | +4 | Accumulator value (ACC) |

### Timer Control Bits (Word 0)

| Bit | Name | Description |
|-----|------|-------------|
| 15 | EN | Timer Enable |
| 14 | TT | Timer Timing |
| 13 | DN | Timer Done |

### Counter Control Bits (Word 0)

| Bit | Name | Description |
|-----|------|-------------|
| 15 | CU | Count Up Enable |
| 14 | CD | Count Down Enable |
| 13 | DN | Counter Done |
| 12 | OV | Overflow |
| 11 | UN | Underflow |

## Summary

1. **Find 0x03 0x80 markers** to locate data file sections
2. **Read header at offset 10-13** to get element count and words per element
3. **Data starts at offset 18** from the marker
4. **Interpret based on words per element**:
   - 1 word: `readInt16LE()`
   - 2 words: `readFloatLE()` or `readInt32LE()` depending on context
   - 3 words: Timer/Counter structure
5. **Validate interpretation** by checking if values make sense in context
6. **Use heuristics** to detect float vs integer storage in N-files
