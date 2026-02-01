# RSLogix 500 RSS File Number Mapping Research

## Summary

The RSLogix 500 RSS file **explicitly stores file numbers** in the `DATA FILES` stream. The file numbers are NOT sequential per type - they are explicitly assigned and stored alongside the file names.

## Key Finding: File Number Location

The file number is stored in a specific binary structure within the `DATA FILES/ObjectData` stream:

```
Pattern: XX 00 00 LL NAME 00 00 00 00 03 80 TT
         ^         ^  ^                    ^
         |         |  |                    Type code
         |         |  File name (length LL)
         |         Name length byte
         File number (1 byte, 0-255)
```

For files with descriptions:
```
Pattern: XX 00 DD DESCRIPTION DD' 00 00 LL NAME 00 00 00 00 03 80 TT
         ^     ^                            ^                    ^
         |     |                            |                    Type code
         |     Description length           File name
         File number
```

## Type Codes (03 80 XX)

The `03 80` marker is followed by a type code byte:

| Code | Prefix | Description     |
|------|--------|-----------------|
| 0x01 | O      | Output          |
| 0x02 | I      | Input           |
| 0x03 | S      | Status          |
| 0x04 | B      | Binary/Bit      |
| 0x05 | T      | Timer           |
| 0x06 | C      | Counter         |
| 0x07 | R      | Control         |
| 0x08 | N      | Integer         |
| 0x09 | F      | Float           |
| 0x0A | A      | ASCII           |
| 0x0E | ST     | String          |
| 0x10 | L      | Long Integer    |
| 0x13 | MG     | Message         |

## Complete File Directory (LANLOGIX_BR.RSS)

### System Files (0-6)
| File# | Type | Address | Name    |
|-------|------|---------|---------|
| 0     | O    | O0:     | OUTPUT  |
| 1     | I    | I1:     | INPUT   |
| 2     | S    | S2:     | STATUS  |
| 3     | B    | B3:     | BINARY  |
| 4     | T    | T4:     | TIMER   |
| 5     | C    | C5:     | COUNTER |
| 6     | R    | R6:     | CONTROL |

### User-Defined Integer/Float Files
| File# | Type | Address | Name     | Description |
|-------|------|---------|----------|-------------|
| 7     | N    | N7:     | INTEGER  | |
| 8     | N    | N8:     | FLOAT    | |
| 21    | N    | N21:    | PROFILES | |
| 25    | N    | N25:    | LONG     | |
| 111   | N    | N111:   | CDATA1   | Load Containment Data Array 1 |

### Control Files (R type)
| File# | Type | Address | Name        | Description |
|-------|------|---------|-------------|-------------|
| 13    | R    | R13:    | BINARY      | |
| 14    | R    | R14:    | LG          | |
| 15    | R    | R15:    | OPTIONS     | |
| 16    | R    | R16:    | SECURITY    | |
| 19    | R    | R19:    | TRACKING    | |
| 20    | R    | R20:    | FILM        | |
| 30    | R    | R30:    | DEFAULT     | Default Profile |
| 40    | R    | R40:    | CURRENT     | |
| 49    | R    | R49:    | PROFWARNCH  | |
| 80    | R    | R80:    | E_NET_IN    | |
| 92    | R    | R92:    | WARNCOPY    | |
| 94    | R    | R94:    | WARNINGS    | WARNINGS LIST |
| 96    | R    | R96:    | ALARMCOPY   | |
| 100   | R    | R100:   | ALARMS      | |
| 102   | R    | R102:   | MAINT1      | |
| 110   | R    | R110:   | CDATA       | Load Containment Data |
| 115   | R    | R115:   | PDATA       | Production Data Control |
| 116   | R    | R116:   | PDATA1      | Production Data Array 1 |
| 117   | R    | R117:   | PDATA2      | Production Data Array 2 |
| 118   | R    | R118:   | PDATA3      | Production Data Array 3 |
| 119   | R    | R119:   | PDATALPH    | Production Data Loads/Breaks Per Hour |
| 121   | R    | R121:   | PDATARPR    | Production Data Revolutions Per Film Rolls |

### Other Files
| File# | Type | Address | Name        | Description |
|-------|------|---------|-------------|-------------|
| 12    | S    | S12:    | BINARY      | |
| 17    | A    | A17:    | MESSAGING   | |
| 41    | A    | A41:    | PROFILECAL  | |
| 42    | ST   | ST42:   | PROFILENUM  | |
| 43    | A    | A43:    | PROFILESTR  | |
| 45    | ST   | ST45:   | PROFILES    | |
| 46    | A    | A46:    | PROFILES    | |
| 60    | A    | A60:    | FAULT       | Fault Overflow Trap |
| 81    | A    | A81:    | E_NET_OUT   | |
| 101   | L    | L101:   | MAINT       | |
| 103   | A    | A103:   | MAINT2      | |
| 112   | A    | A112:   | CDATA2      | Load Containment Data Array 2 |
| 120   | L    | L120:   | PDATALPR    | Production Data Loads Per Film Roll |
| 122   | A    | A122:   | PDATACHART  | Production Data Chart |
| 125   | A    | A125:   | PDATAT      | Production Data Timers |
| 200   | MG   | MG200:  | MODBUS      | |

## Important Observations

### 1. File Numbers are NOT Sequential Per Type
Looking at Integer (N) files: 7, 8, 21, 25, 111 - there are gaps (9, 10, 11 are NOT defined as N files).

### 2. Same Number, Different Types = Different Files
File number 40 exists as both:
- R40: CURRENT (Control file)
- The program also references N40 (Integer addresses)

These are DIFFERENT files - the type prefix + number combination is the unique identifier.

### 3. Default/Unnamed Files Can Exist
The PROGRAM FILES stream references many addresses that don't have explicit entries in DATA FILES:
- N10:, N11:, N14:, N15:, N16:, etc.
- F8:, F9:, F22:, F26: (Float files)
- B12:, B13:, B48: (Binary files)

These are likely "default" files that were created without custom names.

### 4. RSS File Structure (OLE/CFB Format)

The RSS file is an OLE Compound Document (same as old Office .doc/.xls) containing streams:

| Stream | Purpose |
|--------|---------|
| `DATA FILES/ObjectData` | File directory with names, numbers, and types |
| `Extensional DATA FILES/ObjectData` | Extended file info (seems identical) |
| `PROGRAM FILES/ObjectData` | Compiled ladder logic |
| `COMPILER/ObjectData` | Compiler data |
| `PROCESSOR/ObjectData` | Processor configuration |
| `MEM DATABASE/ObjectData` | Address symbol database |

All ObjectData streams are zlib-compressed with a 16-byte header:
```
02 00 00 00 10 00 00 00 [4 bytes uncompressed size] [4 bytes unknown] [zlib data]
```

## Parsing Algorithm

To extract the file name-to-number mapping:

```python
1. Open RSS file as OLE document
2. Read "DATA FILES/ObjectData" stream
3. Skip 16-byte header, decompress remaining data with zlib
4. Search for pattern: 00 00 00 00 03 80 XX (type marker)
5. Work backwards from each marker to find:
   - File name (preceded by length byte)
   - File number (3 bytes before name length: XX 00 00 LL)
   - Optional description (between file number and name)
6. The type code XX after 03 80 identifies the file type
```

## Working Python Code Example

```python
import olefile
import zlib

def parse_rss_file_directory(rss_path):
    """Extract file number to name mapping from RSLogix 500 RSS file."""

    TYPE_MAP = {
        0x01: 'O',   # Output
        0x02: 'I',   # Input
        0x03: 'S',   # Status
        0x04: 'B',   # Binary/Bit
        0x05: 'T',   # Timer
        0x06: 'C',   # Counter
        0x07: 'R',   # Control
        0x08: 'N',   # Integer
        0x09: 'F',   # Float
        0x0A: 'A',   # ASCII
        0x0E: 'ST',  # String
        0x10: 'L',   # Long Integer
        0x13: 'MG',  # Message
    }

    ole = olefile.OleFileIO(rss_path)
    data = ole.openstream("DATA FILES/ObjectData").read()
    ole.close()

    # Skip 16-byte header and decompress
    decompressed = zlib.decompress(data[16:])

    entries = []
    i = 0

    while i < len(decompressed) - 20:
        # Look for type marker: 00 00 00 00 03 80 XX
        if (decompressed[i:i+4] == b'\x00\x00\x00\x00' and
            decompressed[i+4] == 0x03 and
            decompressed[i+5] == 0x80):

            type_code = decompressed[i+6]
            name_end = i

            # Find name by working backwards
            for j in range(name_end - 1, max(0, name_end - 30), -1):
                name_len = decompressed[j]
                if 2 <= name_len <= 20:
                    name_start = j + 1
                    if name_end - name_start == name_len:
                        try:
                            name = decompressed[name_start:name_end].decode('ascii')
                            if all(c.isalnum() or c == '_' for c in name) and name[0].isalpha():
                                # Find file number
                                file_num = None
                                if j >= 3 and decompressed[j-2] == 0 and decompressed[j-1] == 0:
                                    file_num = decompressed[j-3]
                                else:
                                    # Search for description pattern
                                    for k in range(j - 1, max(0, j - 100), -1):
                                        if k >= 2:
                                            pot_file_num = decompressed[k-2]
                                            pot_zero = decompressed[k-1]
                                            pot_desc_len = decompressed[k]
                                            if pot_zero == 0 and 5 <= pot_desc_len <= 50:
                                                desc_end = k + 1 + pot_desc_len
                                                if desc_end <= j:
                                                    try:
                                                        desc = decompressed[k+1:desc_end].decode('ascii')
                                                        if desc.isprintable() and ' ' in desc:
                                                            file_num = pot_file_num
                                                            break
                                                    except:
                                                        pass

                                if file_num is not None:
                                    prefix = TYPE_MAP.get(type_code, '?')
                                    entries.append({
                                        'file_num': file_num,
                                        'name': name,
                                        'type_code': type_code,
                                        'type_prefix': prefix,
                                        'address': f"{prefix}{file_num}:"
                                    })
                                break
                        except:
                            pass
            i += 7
        else:
            i += 1

    # Remove duplicates
    seen = set()
    unique = []
    for e in entries:
        key = (e['file_num'], e['name'], e['type_code'])
        if key not in seen:
            seen.add(key)
            unique.append(e)

    return sorted(unique, key=lambda x: (x['type_prefix'], x['file_num']))


# Usage example:
if __name__ == '__main__':
    files = parse_rss_file_directory('LANLOGIX_BR.RSS')
    for f in files:
        print(f"{f['address']:<12} {f['name']}")
```

## Conclusion

**The file number IS explicitly stored** in the RSS file, not derived or sequential. Each data file entry contains:
1. File number (1 byte, stored 3 positions before name length)
2. Optional description (variable length)
3. File name (length-prefixed string)
4. Type code (after 03 80 marker)

To resolve an address like "N7:0":
- Extract "N" (type prefix = Integer) and "7" (file number)
- Look up file number 7 with type code 0x08 (Integer)
- Result: "INTEGER" file

Files can also exist without explicit names (default files) - these are addressed directly by number but won't appear in the DATA FILES directory.
