# RSLogix 500 RSS PROGRAM FILES Stream Binary Structure

## Overview

This document details the binary structure of the PROGRAM FILES stream within RSLogix 500 (.RSS) files, based on analysis of LANLOGIX_BR.RSS. The RSS file format is an OLE compound document with zlib-compressed program data.

## File Structure

### OLE Compound Document
- Magic bytes: `D0 CF 11 E0 A1 B1 1A E1`
- Key streams:
  - `Root Entry/PROGRAM FILES/ObjectData` - Ladder logic (165,405 bytes compressed, 569,038 bytes decompressed)
  - `Root Entry/DATA FILES/ObjectData` - Data table values
  - `Root Entry/MEM DATABASE/ObjectData` - Symbol table
  - `Root Entry/COMPILER/ObjectData` - Compiler information

### PROGRAM FILES Stream Header
```
Offset  Size  Description
0x00    4     Version (typically 0x02)
0x04    4     Header size (0x10 = 16 bytes)
0x08    4     Compressed size
0x0C    4     Uncompressed size
0x10    ...   zlib-compressed data
```

## Decompressed Data Structure

### Class Object Markers

The decompressed data begins with class object definitions:

| Offset | Pattern | Class Name | Description |
|--------|---------|------------|-------------|
| 0x0000 | `FFFF 8000 0B00` | `CProgHolder` | Program container |
| 0x0015 | `FFFF 8000 0800` | `CLadFile` | Ladder file/routine |
| 0x006A | `FFFF 8000 0500` | `CRung` | Rung marker |
| 0x0077 | `FFFF 8000 0A00` | `CBranchLeg` | Parallel branch leg |
| 0x0085 | `FFFF 8000 0400` | `CIns` | Instruction |
| 0x0189 | `FFFF 8000 0700` | `CBranch` | Branch structure end |

### Routine/Ladder File Markers

Routine names appear after `0380` markers:
```
Pattern: 03 80 XX 00 01 00 [NAME] 00
         ^^ ^^ ^^ ^^ ^^ ^^ ^^^^^^
         |  |  |  |  |  |  Null-terminated routine name
         |  |  |  |  |  Marker
         |  |  |  |  Marker
         |  |  |  Marker
         |  |  File number (e.g., 0x45 = file 69 = MAIN)
         |  Marker byte
         Marker byte

Example: 03 80 45 00 01 00 4D 41 49 4E 00
         = File 69, routine name "MAIN"
```

## Rung Boundary Markers

### Rung Start Pattern
Each rung begins with `07 80 09 80`:
```
07 80 09 80 XX
^^ ^^ ^^ ^^ ^^
|  |  |  |  Branch/instruction count for this rung
|  |  |  Marker
|  |  Marker
|  Marker
Marker
```

The byte after `0980` indicates the number of parallel branches or serial instructions in the rung.

**Examples from LANLOGIX_BR.RSS:**
| Offset | Pattern | Branch Count |
|--------|---------|--------------|
| 0x00CA | `0780 0980 06` | 6 branches |
| 0x016E | `0780 0980 03` | 3 branches |
| 0x0739 | `0780 0980 0E` | 14 branches |
| 0x0CEE | `0780 0980 15` | 21 branches |

### Rung End Pattern
Rungs end with:
```
00 00 00 XX 03 00 00 07 80
         ^^
         Rung number (0x89 = 137, 0x8A = 138, etc.)
```

### Branch Level Markers
Parallel branch nesting uses `1A 80 XX`:
```
1A 80 04 - Branch level 4 (most common in analyzed file)
1A 80 05 - Branch level 5
1A 80 06 - Branch level 6
```

## Instruction Encoding

### Instruction Marker Pattern
```
0B 80 TT XX LL [ADDRESS] [PARAMS...]
^^ ^^ ^^ ^^ ^^ ^^^^^^^^^
|  |  |  |  |  ASCII address string (e.g., "B3:0/15", "T4:14")
|  |  |  |  Address length byte
|  |  |  Always 0x00
|  |  Instruction type byte
|  Marker
Marker
```

### Instruction Type Bytes (TT)

| Type Byte | Count | Instruction Type | Description |
|-----------|-------|------------------|-------------|
| 0x00 | 14,168 | Structural | Non-instruction markers |
| 0x01 | 5,533 | XIC/XIO/OTE/OTL | Bit-level instructions |
| 0x04 | 2,223 | TON/TOF/MOV | Timer or Move instructions |
| 0x06 | 317 | ADD/SUB | Math operations |
| 0x03 | 189 | MUL/DIV | Multiplication/Division |
| 0x02 | 165 | CLR/Other | Clear or other |
| 0x0C | 51 | CPT/Other | Compute or complex |

#### Type 0x01 - Bit Instructions (XIC/XIO/OTE/OTL/OTU)

The low 2 bits encode the base instruction:
- 0x00 = XIC (Examine If Closed)
- 0x01 = XIO (Examine If Open)
- 0x02 = OTL (Output Latch)
- 0x03 = OTE (Output Energize)

**After-address bytes for type 0x01:**
```
01 00 XX 00 00 00 00 07 00 XX 17 08 YY 00
      ^                    ^        ^^
      File type code       |        Bit number encoding
                           File type (repeated)
```

The byte at position +2 after address indicates file type:
- `0x2F` = "/" (bit address like B3:2/0)
- `0x39` = "9" (integer N file)
- `0x3A` = ":" (other address)

#### Type 0x04 - Timer/Counter/Move Instructions

Timers have operands stored after the address:
```
0B 80 04 XX LL [TIMER_ADDR] [TIME_BASE] [PRESET] [ACCUM]
                            ^           ^        ^
                            Length-prefixed ASCII values

Example: T4:14 with 0.01s time base, 300 preset, 0 accumulated:
         0B 80 04 XX 05 54 34 3A 31 34  04 30 2E 30 31  03 33 30 30  01 30
                     T  4  :  1  4     [len=4] 0.01  [len=3] 300 [len=1] 0
```

**Timer parameters format:**
| Byte | Content | Example |
|------|---------|---------|
| len1 | Length of time base | 04 |
| ... | ASCII time base | "0.01" |
| len2 | Length of preset | 03 |
| ... | ASCII preset | "300" |
| len3 | Length of accum | 01 |
| ... | ASCII accumulated | "0" |

**Observed timer presets:** 0.01, 25, 40, 50, 100, 160, 200, 250, 300, 500, 1000, 5000

#### Type 0x06 - ADD/SUB Instructions

Format: `0B 80 06 XX LL [DEST] [SRC_A] [SRC_B] [CONST_A] [SRC_A_AGAIN] [CONST_B]`

**Example analysis:**
```
Type0x06 Dest="T4:5.ACC" Operands: [0, 10, 10, N14:0, 10]
    -> ADD instruction: ADD(10, N14:0, T4:5.ACC)

Type0x06 Dest="F8:36" Operands: [20.0, F9:34, 4.0, F9:37, 16.0]
    -> Complex math with floating point values
```

#### Type 0x03 - MUL/DIV Instructions

Format includes expression text after numeric values:
```
Type0x03 Dest="F8:27" Operands: [240.9639,  60000.0 | F8:39 ]
    raw: 083234302e39363339112036303030302e30207c2046383a33392001008a

The ASCII content after the numeric values contains expression text like:
    "( N51:14 - F9:36 ) + N40:9"
```

### Address Types

| Prefix | File Type | Example |
|--------|-----------|---------|
| B | Binary/Bit | B3:0/15 |
| N | Integer (16-bit) | N11:59/1 |
| T | Timer | T4:14, T4:14.DN |
| C | Counter | C5:0, C5:0.DN |
| F | Float | F8:36, F22:5 |
| I | Input | I:0/0 |
| O | Output | O:0/0 |
| R | Control | R6:0 |
| MG | Message | MG201:0.NOD |
| HSC | High-Speed Counter | HSC0, HSC1 |
| U | User/Subroutine | U:4 (JSR target) |

### Indirect Addressing

Indirect addresses use bracket notation:
```
N200:[N200:35]/1   - Indirect through N200:35
N210:[N200:40]     - Indirect through N200:40
#N210:[N200:40]    - Indirect with # prefix
```

## Branch Structure

### Parallel Branch Detection

Branch regions are marked by:
1. `CBranchLeg` (0x43 0x42 0x72 0x61 0x6E 0x63 0x68 0x4C 0x65 0x67) - Start of branch leg
2. `CBranch` (0x43 0x42 0x72 0x61 0x6E 0x63 0x68) - End of all parallel legs

**Structure:**
```
CBranchLeg (leg 1)
  [instructions for leg 1]
CBranchLeg (leg 2)
  [instructions for leg 2]
CBranch (end of parallel structure)
```

### New Parallel Path Detection

A new parallel path within a rung has the pattern:
```
00 00 00 00 01 00 XX 0B 80 TT 00 LL [ADDRESS]
^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^
Clean pattern    |  |  |  |  |  Address length
                 |  |  |  |  Type marker
                 |  |  |  Instruction marker
                 |  |  Marker
                 |  Varies
                 Instruction type
```

## Parser Gaps Identified

### 1. Source Operand Extraction
The current parser doesn't fully extract source operands for:
- **MOV instructions**: Source constants come AFTER the destination address
- **Math instructions (ADD/SUB/MUL/DIV)**: Multiple operands follow the destination

### 2. Timer/Counter Parameters
Timer parameters (time base, preset, accumulator) are stored as length-prefixed ASCII AFTER the timer address. The parser partially extracts these but may miss some.

### 3. Branch Level Detection
The `1A 80 XX` pattern for branch level nesting isn't fully utilized. This affects proper grouping of nested parallel branches.

### 4. Expression Text in Math Instructions
Type 0x03 instructions contain embedded expression text that describes the full formula, e.g., `( N51:14 - F9:36 ) + N40:9`. This could be parsed for display.

### 5. Rung Numbering
The `XX 03 00 00 07 80` pattern at rung boundaries contains the rung number, but this isn't currently used for ordering.

## Binary Data Samples

### Sample Instruction Sequences

**XIC Instruction (B3:0/15):**
```
0B 80 01 00 07 42 33 3A 30 2F 31 35 01 00 2F 00 00 00 00 00 07 00 2F 17 08 F3 00
         ^^ ^^ ^^^^^^^^^^^^^^^^^^^^^^^
         |  |  B3:0/15 (length 7)
         |  Address length
         Instruction type (0x01 = XIC/XIO)
```

**Timer Instruction (T4:14):**
```
0B 80 04 XX 05 54 34 3A 31 34 04 30 2E 30 31 03 33 30 30 01 30
         ^^ ^^^^^^^^^^^^^^^^^^
         |  T4:14 (length 5)
         Address length

         Followed by: "0.01" (time base), "300" (preset), "0" (accum)
```

**MOV Instruction with Source:**
```
Dest="T4:15.ACC" Source operands: [0, N50:18, 0]
    -> MOV(N50:18, T4:15.ACC) with initial value 0
```

## Statistics from LANLOGIX_BR.RSS

- **Total decompressed size:** 569,038 bytes
- **Unique addresses found:** 7,580
- **Rung boundaries detected:** 1,021
- **Branch regions:** Multiple CBranchLeg markers found
- **Ladder files/routines:** Multiple including "MAIN", "HSC PFN"

### Instruction Distribution

| Type | Count | Notes |
|------|-------|-------|
| Bit instructions (0x01) | 5,533 | XIC, XIO, OTE, OTL, OTU |
| Timer/MOV (0x04) | 2,223 | TON, TOF, MOV |
| Math-ADD/SUB (0x06) | 317 | ADD, SUB |
| Math-MUL/DIV (0x03) | 189 | MUL, DIV |
| Other (0x02, 0x0C) | 216 | CLR, CPT, etc. |

## JSR (Jump to Subroutine) Instructions

JSR instructions use the `U:X` address format where X is the subroutine file number:

```
0B 80 01 00 03 55 3A 34 01 00 15 00 00 00 00
               U  :  4
```

**Observed JSR targets from LANLOGIX_BR.RSS:**
- U:4 through U:13 (subroutine files 4-13)
- U:34 through U:39 (subroutine files 34-39)
- U:10, U:11, U:12, U:13 (4-character addresses)

The after-address pattern `01 00 15 00 00 00 00` appears consistent for JSR instructions.

## Message (MSG) Instructions

Message instructions use the `MG` prefix with element and subfield:

```
Address formats:
- MG201:0.NOD - Node subfield
- MG201:0/DN  - Done bit
- MG201:0/ER  - Error bit
- MG201:0/EN  - Enable bit
- MG201:0/TO  - Timeout bit
```

**After MSG/DN address pattern:**
```
01 00 39 00 00 00 00 07 00 39 9F 00 53 8B C9 00
                                   ^^ ^^ ^^ ^^
                                   MSG-specific encoding
```

MSG instructions include embedded text descriptions like:
- "03 Read Holding Registers (4xxxxx)"
- "16 Write Multiple Registers (4xxxxx)"
- "CLIENT              :502" (IP/port)

## After-Address Byte Pattern Analysis

The bytes immediately following an address provide additional metadata:

| Pattern (first 3 bytes) | Count | Description |
|-------------------------|-------|-------------|
| `01 00 39` | 2,922 | N file bit addresses (most common) |
| `01 00 3A` | 1,240 | Timer/other file addresses |
| `01 00 2F` | 901 | B file bit addresses |
| `01 00 31` | 172 | Alternative N file pattern |
| `01 00 AB` | 105 | B12 file addresses |
| `01 00 30` | 61 | B3/B6 file addresses |
| `01 00 13` | 24 | Timer status addresses |

The byte at position +12 after address encodes bit position information:
- `0x08` - Primary bit field
- `0x28` - Alternative bit field encoding

## Recommendations for Parser Improvements

1. **Extract operands AFTER destination address** for MOV/Math instructions
2. **Parse timer parameters** more robustly using length-prefixed ASCII pattern
3. **Use rung number** from `XX 03 00 00` pattern for proper ordering
4. **Track branch nesting** via `1A 80 XX` pattern
5. **Consider expression text** extraction for type 0x03 instructions
6. **Handle indirect addressing** patterns like `N200:[N200:35]`
7. **Parse JSR targets** - Extract U:X file references for subroutine calls
8. **Extract MSG configuration** - Parse embedded Modbus command descriptions
9. **Decode after-address patterns** - Use file type bytes for validation
