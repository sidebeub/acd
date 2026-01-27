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

if (!programData) process.exit(1);
const text = programData.toString('latin1');

console.log('=== RSS Parser Status Check ===\n');

// 1. Check for branching markers
const cbranch = (text.match(/CBranch[^L]/g) || []).length;
const cbranchLeg = (text.match(/CBranchLeg/g) || []).length;
console.log('1. BRANCHING:');
console.log('   CBranch markers:', cbranch);
console.log('   CBranchLeg markers:', cbranchLeg);
console.log('   Status:', cbranch > 0 ? 'NOT IMPLEMENTED - parallel branches exist but not parsed' : 'N/A');

// 2. Check instruction variety by opcode
const instructions = {
  XIC: 0, XIO: 0, OTE: 0, OTL: 0, OTU: 0,
  MOV: 0, ADD: 0, SUB: 0, MUL: 0, DIV: 0,
  EQU: 0, NEQ: 0, LES: 0, LEQ: 0, GRT: 0, GEQ: 0,
  ONS: 0
};

const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi;
let match;
while ((match = addrPattern.exec(text)) !== null) {
  const pos = match.index;
  if (pos >= 6) {
    const lengthByte = programData[pos - 1];
    if (lengthByte === match[0].length) {
      const marker = programData.subarray(pos - 5, pos - 1);
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
        const opcode = programData[pos - 6];
        if (opcode === 0x09) instructions.MOV++;
        else if (opcode === 0x0A) instructions.ADD++;
        else if (opcode === 0x0B) instructions.SUB++;
        else if (opcode === 0x0C) instructions.MUL++;
        else if (opcode === 0x0D) instructions.DIV++;
        else if (opcode === 0x10) instructions.EQU++;
        else if (opcode === 0x11) instructions.NEQ++;
        else if (opcode === 0x12) instructions.LES++;
        else if (opcode === 0x13) instructions.LEQ++;
        else if (opcode === 0x14) instructions.GRT++;
        else if (opcode === 0x15) instructions.GEQ++;
        else if (opcode === 0x05) instructions.OTU++;
        else if (opcode === 0x06) instructions.ONS++;
        else if ((opcode & 0x03) === 0x00) instructions.XIC++;
        else if ((opcode & 0x03) === 0x01) instructions.XIO++;
        else if ((opcode & 0x03) === 0x02) instructions.OTL++;
        else if ((opcode & 0x03) === 0x03) instructions.OTE++;
      }
    }
  }
}

console.log('\n2. INSTRUCTION COUNTS (by opcode):');
for (const [inst, count] of Object.entries(instructions)) {
  if (count > 0) console.log('   ' + inst + ': ' + count);
}

// 3. Things that need source operands (like MOV)
console.log('\n3. MULTI-OPERAND INSTRUCTIONS NEEDING SOURCE VALUES:');
const compCount = instructions.EQU + instructions.NEQ + instructions.LES + instructions.LEQ + instructions.GRT + instructions.GEQ;
const mathCount = instructions.ADD + instructions.SUB + instructions.MUL + instructions.DIV;
console.log('   EQU/NEQ/LES/GRT/etc:', compCount, 'total');
console.log('   ADD/SUB/MUL/DIV:', mathCount, 'total');
console.log('   Status: Need to extract source operands like we did for MOV');

// 4. Timer structure
console.log('\n4. TIMERS:');
const t4Matches = text.match(/T4:\d+(?![./\d])/g) || [];
const uniqueTimers = [...new Set(t4Matches)];
console.log('   Bare timer addresses (TON/TOF/RTO):', uniqueTimers.length);
console.log('   Status: TON detected, but preset value and time base not shown in instruction');

// 5. Counter structure
console.log('\n5. COUNTERS:');
const c5Matches = text.match(/C5:\d+(?![./\d])/g) || [];
const uniqueCounters = [...new Set(c5Matches)];
console.log('   Bare counter addresses (CTU/CTD):', uniqueCounters.length);
console.log('   Status: CTU detected, but preset not shown');

// 6. XIO detection check
console.log('\n6. XIO (Examine If Open) DETECTION:');
console.log('   XIO by opcode:', instructions.XIO);
console.log('   Status:', instructions.XIO > 0 ? 'Working' : 'May need verification');

// 7. OTL/OTU detection
console.log('\n7. OTL/OTU (Latch/Unlatch) DETECTION:');
console.log('   OTL by opcode:', instructions.OTL);
console.log('   OTU by opcode:', instructions.OTU);

// 8. Rung comments
console.log('\n8. RUNG COMMENTS:');
const crungCount = (text.match(/CRung/g) || []).length;
console.log('   CRung markers:', crungCount);
console.log('   Status: Comments may exist but not extracted');

// 9. Summary of what needs work
console.log('\n=== SUMMARY: ITEMS NEEDING WORK ===');
console.log('');
console.log('1. PARALLEL BRANCHES (' + cbranch + ' branches found)');
console.log('   - CBranch/CBranchLeg markers exist but not parsed');
console.log('   - Rungs with branches display as linear instead of parallel');
console.log('');
console.log('2. COMPARISON INSTRUCTIONS (' + compCount + ' found)');
console.log('   - EQU, NEQ, LES, LEQ, GRT, GEQ need Source A and Source B');
console.log('   - Currently only showing one operand');
console.log('');
console.log('3. MATH INSTRUCTIONS (' + mathCount + ' found)');
console.log('   - ADD, SUB, MUL, DIV need Source A, Source B, and Dest');
console.log('   - Currently only showing destination');
console.log('');
console.log('4. TIMER/COUNTER PARAMETERS');
console.log('   - TON should show: Timer, Time Base, Preset, Accum');
console.log('   - CTU should show: Counter, Preset, Accum');
console.log('   - Currently only showing timer/counter address');
