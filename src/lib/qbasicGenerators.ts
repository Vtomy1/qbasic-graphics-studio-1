import { RGBColor, BitDepth } from '../types/graphics';
import { rgbToVgaDac } from './palettes';

// Generate raw .BSV (BSAVE) file bytes
export function generateBsvFile(
  width: number,
  height: number,
  pixelIndices: Uint8Array,
  bitDepth: BitDepth
): Uint8Array {
  // QBasic GET/PUT Array Format:
  // Word 0: Width in bits (width * bitsPerPixel)
  // Word 1: Height in lines
  // Followed by pixel data words.
  const bitsPerPixel = bitDepth;
  const widthInBits = width * bitsPerPixel;

  let dataBytes: Uint8Array;

  if (bitDepth === 8) {
    // 1 byte per pixel
    dataBytes = new Uint8Array(width * height);
    dataBytes.set(pixelIndices);
  } else if (bitDepth === 4) {
    // 2 pixels per byte
    const totalBytes = Math.ceil((width * height) / 2);
    dataBytes = new Uint8Array(totalBytes);
    let idx = 0;
    for (let i = 0; i < pixelIndices.length; i += 2) {
      const p1 = pixelIndices[i] & 0x0f;
      const p2 = i + 1 < pixelIndices.length ? pixelIndices[i + 1] & 0x0f : 0;
      dataBytes[idx++] = (p1 << 4) | p2;
    }
  } else {
    // 1-bit: 8 pixels per byte
    const totalBytes = Math.ceil((width * height) / 8);
    dataBytes = new Uint8Array(totalBytes);
    let idx = 0;
    for (let i = 0; i < pixelIndices.length; i += 8) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pIdx = i + bit;
        if (pIdx < pixelIndices.length && pixelIndices[pIdx] > 0) {
          b |= 1 << (7 - bit);
        }
      }
      dataBytes[idx++] = b;
    }
  }

  // Header for GET/PUT array: 4 bytes (2 words: Width in bits, Height)
  const arrayPayloadSize = 4 + dataBytes.length;
  // BSAVE header: 7 bytes
  // Byte 0: &HFD (BSAVE marker)
  // Bytes 1-2: Segment (0x0000)
  // Bytes 3-4: Offset (0x0000)
  // Bytes 5-6: Length (arrayPayloadSize in bytes, 16-bit LE)
  const bsv = new Uint8Array(7 + arrayPayloadSize);

  bsv[0] = 0xfd; // Marker
  bsv[1] = 0x00; // Segment LE
  bsv[2] = 0x00;
  bsv[3] = 0x00; // Offset LE
  bsv[4] = 0x00;
  bsv[5] = arrayPayloadSize & 0xff;
  bsv[6] = (arrayPayloadSize >> 8) & 0xff;

  // Array header: Width in bits
  bsv[7] = widthInBits & 0xff;
  bsv[8] = (widthInBits >> 8) & 0xff;
  // Height in lines
  bsv[9] = height & 0xff;
  bsv[10] = (height >> 8) & 0xff;

  // Payload
  bsv.set(dataBytes, 11);

  return bsv;
}

// 1. QBasic BLOAD Loader Code Sample
export function generateBloadLoaderCode(
  width: number,
  height: number,
  palette: RGBColor[],
  bitDepth: BitDepth,
  filename: string = 'IMAGE.BSV'
): string {
  const qbScreen = bitDepth === 8 ? 13 : bitDepth === 4 ? 12 : 11;
  const bitsPerPixel = bitDepth;
  const arrayWords = Math.ceil((4 + (width * height * bitsPerPixel) / 8) / 2);

  let dacCode = '';
  if (bitDepth === 8 || bitDepth === 4) {
    const palCount = bitDepth === 8 ? 256 : 16;
    dacCode = `' --- Set VGA DAC Palette Registers (0-63) ---
OUT &H3C8, 0
`;
    // Batch palette in comments / loops or explicit DATA statements
    dacCode += `FOR i% = 0 TO ${Math.min(palette.length, palCount) - 1}
    READ r%, g%, b%
    OUT &H3C9, r%
    OUT &H3C9, g%
    OUT &H3C9, b%
NEXT i%
`;
  }

  let paletteData = '';
  if (bitDepth === 8 || bitDepth === 4) {
    const palCount = bitDepth === 8 ? 256 : 16;
    paletteData = `\n' --- Palette RGB Data (Values scaled 0-63 for VGA DAC) ---\n`;
    const rows: string[] = [];
    let curRow: number[] = [];
    for (let i = 0; i < Math.min(palette.length, palCount); i++) {
      const c = palette[i] || { r: 0, g: 0, b: 0 };
      curRow.push(rgbToVgaDac(c.r), rgbToVgaDac(c.g), rgbToVgaDac(c.b));
      if (curRow.length >= 12) {
        rows.push(`DATA ${curRow.join(', ')}`);
        curRow = [];
      }
    }
    if (curRow.length > 0) {
      rows.push(`DATA ${curRow.join(', ')}`);
    }
    paletteData += rows.join('\n');
  }

  return `' ====================================================================
' QBASIC / QB64 BLOAD IMAGE LOADER
' Mode: SCREEN ${qbScreen} | Resolution: ${width}x${height} | Bit Depth: ${bitDepth}-bit
' File Target: ${filename}
' ====================================================================

DEFINT A-Z
SCREEN ${qbScreen}
CLS

${dacCode}
' --- Allocate Image Array for QBasic GET/PUT Format ---
' Header is 4 bytes (width in bits & height), then pixel data.
DIM ImgArray%(${arrayWords})

' --- Load Binary Graphic with BLOAD ---
PRINT "Loading ${filename} into memory..."
DEF SEG = VARSEG(ImgArray%(0))
BLOAD "${filename}", VARPTR(ImgArray%(0))
DEF SEG ' Reset default data segment

CLS
' --- Blit Image Array to Screen at (0, 0) ---
PUT (0, 0), ImgArray%, PSET

LOCATE 1, 1: PRINT "Image Loaded Successfully! Press any key...";
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END
${paletteData}
`;
}

// 2. QBasic BSAVE Saver Code Sample
export function generateBsaveSaverCode(
  width: number,
  height: number,
  bitDepth: BitDepth,
  filename: string = 'IMAGE.BSV'
): string {
  const qbScreen = bitDepth === 8 ? 13 : bitDepth === 4 ? 12 : 11;
  const bitsPerPixel = bitDepth;
  const totalBytes = 4 + Math.ceil((width * height * bitsPerPixel) / 8);
  const arrayWords = Math.ceil(totalBytes / 2);

  return `' ====================================================================
' QBASIC / QB64 BSAVE IMAGE SAVER
' Mode: SCREEN ${qbScreen} | Coordinates: (0, 0) to (${width - 1}, ${height - 1})
' Target: ${filename} | Bit Depth: ${bitDepth}-bit
' ====================================================================

DEFINT A-Z
SCREEN ${qbScreen}
CLS

' (Your drawing routines or loaded image on screen here...)
CIRCLE (${Math.floor(width / 2)}, ${Math.floor(height / 2)}), 40, 15
LINE (0, 0)-(${width - 1}, ${height - 1}), 14, B

' --- Allocate Array and Capture Screen Region ---
DIM ImgBuffer%(${arrayWords})
GET (0, 0)-(${width - 1}, ${height - 1}), ImgBuffer%

' --- Save Array to Binary BSV File with BSAVE ---
PRINT "Saving ${width}x${height} region to ${filename}..."
DEF SEG = VARSEG(ImgBuffer%(0))
BSAVE "${filename}", VARPTR(ImgBuffer%(0)), ${totalBytes}
DEF SEG ' Restore segment

PRINT "File saved: ${filename} (${totalBytes} bytes)"
PRINT "Press any key to exit...";
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END
`;
}

// 3. GIF Header Loader Code Sample in QBasic
export function generateGifHeaderLoaderCode(
  width: number,
  height: number,
  bitDepth: BitDepth,
  filename: string = 'IMAGE.GIF'
): string {
  return `' ====================================================================
' QBASIC / QB64 GIF HEADER INSPECTOR & LOADER ROUTINE
' Reads GIF87a/GIF89a signature, Logical Screen Descriptor,
' Global Color Table, and reprograms VGA DAC hardware registers.
' ====================================================================

TYPE GifHeaderType
    Sig         AS STRING * 3   ' "GIF"
    Ver         AS STRING * 3   ' "87a" or "89a"
    ScrWidth    AS INTEGER      ' Logical Screen Width (little-endian)
    ScrHeight   AS INTEGER      ' Logical Screen Height (little-endian)
    Packed      AS STRING * 1   ' Color table flags & resolution
    BgColor     AS STRING * 1   ' Background color index
    Aspect      AS STRING * 1   ' Pixel aspect ratio
END TYPE

TYPE ImageDescType
    Sep         AS STRING * 1   ' Image Separator (&H2C = ",")
    ImgLeft     AS INTEGER      ' Image Left coordinate
    ImgTop      AS INTEGER      ' Image Top coordinate
    ImgWidth    AS INTEGER      ' Image Width
    ImgHeight   AS INTEGER      ' Image Height
    ImgPacked   AS STRING * 1   ' Local color table & interlace
END TYPE

DEFINT A-Z
DIM Header AS GifHeaderType
DIM ImgDesc AS ImageDescType

fileName$ = "${filename}"
fileNum% = FREEFILE

OPEN fileName$ FOR BINARY AS #fileNum%
IF LOF(fileNum%) < 13 THEN
    PRINT "Error: File too small or not found."
    CLOSE #fileNum%: END
END IF

' --- Step 1: Read 13-Byte Logical Screen Descriptor ---
GET #fileNum%, 1, Header

' Validate Signature
IF Header.Sig <> "GIF" OR (Header.Ver <> "87a" AND Header.Ver <> "89a") THEN
    PRINT "Error: Invalid GIF signature: "; Header.Sig; Header.Ver
    CLOSE #fileNum%: END
END IF

PRINT "================ GIF HEADER INSPECTION ================"
PRINT "Signature:          "; Header.Sig; Header.Ver
PRINT "Logical Dimensions: "; Header.ScrWidth; "x"; Header.ScrHeight

packed% = ASC(Header.Packed)
hasGCT% = (packed% AND 128) \\ 128
colorRes% = ((packed% AND 112) \\ 16) + 1
sortFlag% = (packed% AND 8) \\ 8
gctExp% = (packed% AND 7) + 1
gctColors% = 2 ^ gctExp%

PRINT "Global Color Table: ";
IF hasGCT% = 1 THEN PRINT "YES ("; gctColors%; " colors)" ELSE PRINT "NO"
PRINT "Color Resolution:   "; colorRes%; " bits per channel"
PRINT "Background Index:   "; ASC(Header.BgColor)
PRINT "======================================================="

' --- Step 2: Initialize DOS Graphics Screen ---
IF gctColors% <= 2 THEN
    SCREEN 11: PRINT "Active Screen: SCREEN 11 (640x480 1-bit Mono)"
ELSEIF gctColors% <= 16 THEN
    SCREEN 12: PRINT "Active Screen: SCREEN 12 (640x480 4-bit 16-color)"
ELSE
    SCREEN 13: PRINT "Active Screen: SCREEN 13 (320x200 8-bit 256-color)"
END IF

' --- Step 3: Read Global Color Table & Program VGA DAC ---
IF hasGCT% = 1 THEN
    OUT &H3C8, 0 ' Reset DAC address register to color index 0
    FOR i% = 0 TO gctColors% - 1
        rgb$ = "   "
        GET #fileNum%, , rgb$
        r% = ASC(MID$(rgb$, 1, 1)) \\ 4 ' Scale 0-255 down to 6-bit VGA DAC 0-63
        g% = ASC(MID$(rgb$, 2, 1)) \\ 4
        b% = ASC(MID$(rgb$, 3, 1)) \\ 4
        OUT &H3C9, r%
        OUT &H3C9, g%
        OUT &H3C9, b%
    NEXT i%
    PRINT "VGA DAC Palette initialized successfully."
END IF

' --- Step 4: Locate Image Descriptor (0x2C) ---
filePos& = 14 + (gctColors% * 3)
DO WHILE NOT EOF(fileNum%)
    blockByte$ = " "
    GET #fileNum%, filePos&, blockByte$
    IF blockByte$ = CHR$(&H2C) THEN EXIT DO ' Found Image Descriptor
    filePos& = filePos& + 1
LOOP

GET #fileNum%, filePos&, ImgDesc
PRINT "Image Block at offset &H"; HEX$(filePos&)
PRINT "Dimensions: "; ImgDesc.ImgWidth; "x"; ImgDesc.ImgHeight

CLOSE #fileNum%
PRINT "GIF Header parsed cleanly. Press any key...";
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END
`;
}

// 4. QBasic Self-Contained DATA / READ / PSET Source Generator
export function generateSelfContainedDataBas(
  width: number,
  height: number,
  palette: RGBColor[],
  pixelIndices: Uint8Array,
  bitDepth: BitDepth
): string {
  const qbScreen = bitDepth === 8 ? 13 : bitDepth === 4 ? 12 : 11;
  const palCount = bitDepth === 8 ? 256 : bitDepth === 4 ? 16 : 2;

  // Format Palette DATA statements
  let paletteSection = `' --- Palette DAC Setup (OUT &H3C8 / &H3C9) ---\nOUT &H3C8, 0\n`;
  paletteSection += `FOR i% = 0 TO ${palCount - 1}
    READ r%, g%, b%
    OUT &H3C9, r%
    OUT &H3C9, g%
    OUT &H3C9, b%
NEXT i%
`;

  const palDataLines: string[] = [];
  let curPalLine: number[] = [];
  for (let i = 0; i < palCount; i++) {
    const c = palette[i] || { r: 0, g: 0, b: 0 };
    curPalLine.push(rgbToVgaDac(c.r), rgbToVgaDac(c.g), rgbToVgaDac(c.b));
    if (curPalLine.length >= 12) {
      palDataLines.push(`DATA ${curPalLine.join(', ')}`);
      curPalLine = [];
    }
  }
  if (curPalLine.length > 0) {
    palDataLines.push(`DATA ${curPalLine.join(', ')}`);
  }

  // RLE (Run Length Encoded) compression for pixel DATA statements
  // Keeps QBasic source code compact and avoids "Out of memory" or line length overflow
  const rleTokens: { count: number; val: number }[] = [];
  let curVal = pixelIndices[0];
  let curCount = 1;

  for (let i = 1; i < pixelIndices.length; i++) {
    const p = pixelIndices[i];
    if (p === curVal && curCount < 255) {
      curCount++;
    } else {
      rleTokens.push({ count: curCount, val: curVal });
      curVal = p;
      curCount = 1;
    }
  }
  rleTokens.push({ count: curCount, val: curVal });

  const rleDataLines: string[] = [];
  let curTokens: string[] = [];

  for (const t of rleTokens) {
    curTokens.push(`${t.count},${t.val}`);
    if (curTokens.length >= 16) {
      rleDataLines.push(`DATA ${curTokens.join(',')}`);
      curTokens = [];
    }
  }
  if (curTokens.length > 0) {
    rleDataLines.push(`DATA ${curTokens.join(',')}`);
  }

  return `' ====================================================================
' STANDALONE QBASIC GRAPHIC RENDERER (RUNS DIRECTLY IN QBASIC 1.1 / 4.5 / QB64)
' Resolution: ${width}x${height} | Screen: SCREEN ${qbScreen} | Bits: ${bitDepth}-bit
' Uses Run-Length Encoded (RLE) DATA statements for compact execution.
' ====================================================================

DEFINT A-Z
SCREEN ${qbScreen}
CLS

${paletteSection}

' --- Render Image via RLE Stream ---
totalPixels& = ${width * height}&
curPixel& = 0
x% = 0
y% = 0

DO WHILE curPixel& < totalPixels&
    READ runLen%, col%
    FOR k% = 1 TO runLen%
        PSET (x%, y%), col%
        x% = x% + 1
        IF x% >= ${width} THEN
            x% = 0
            y% = y% + 1
        END IF
    NEXT k%
    curPixel& = curPixel& + runLen%
LOOP

WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END

' --- Palette Data (VGA 6-bit 0-63) ---
${palDataLines.join('\n')}

' --- RLE Pixel Data (Count, ColorIndex) ---
${rleDataLines.slice(0, 150).join('\n')}
${rleDataLines.length > 150 ? `' ... and ${rleDataLines.length - 150} more RLE DATA lines (truncated for view, full download available)` : ''}
`;
}

// 5. Custom Packed Binary Loader & Saver Routine
export function generateBinaryLoaderSaverCode(
  width: number,
  height: number,
  bitDepth: BitDepth,
  filename: string = 'IMAGE.BIN'
): string {
  const qbScreen = bitDepth === 8 ? 13 : bitDepth === 4 ? 12 : 11;
  const packedBytes =
    bitDepth === 8
      ? width * height
      : bitDepth === 4
      ? Math.ceil((width * height) / 2)
      : Math.ceil((width * height) / 8);

  return `' ====================================================================
' QBASIC / QB64 PACKED BINARY FILE SAVER AND LOADER (1, 4, 8-BIT)
' Screen: SCREEN ${qbScreen} | Dimensions: ${width}x${height} | Depth: ${bitDepth}-bit
' Format: Header "QBGRPH" (6 bytes) + BitDepth% (2) + Width% (2) + Height% (2)
' followed by packed byte raster.
' ====================================================================

DEFINT A-Z
SCREEN ${qbScreen}
CLS

' Demonstration: Save and Load
CALL SavePackedImage("${filename}", ${width}, ${height}, ${bitDepth})
CLS: PRINT "Saved! Press key to reload...";
WHILE INKEY$ = "": WEND

CLS
CALL LoadPackedImage("${filename}")
PRINT "Loaded successfully! Press any key...";
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END

SUB LoadPackedImage(fileName$)
    fileNum% = FREEFILE
    OPEN fileName$ FOR BINARY AS #fileNum%
    IF LOF(fileNum%) = 0 THEN
        PRINT "File not found!": CLOSE #fileNum%: EXIT SUB
    END IF

    ' Read 12-byte Header
    magic$ = SPACE$(6)
    GET #fileNum%, , magic$
    IF magic$ <> "QBGRPH" THEN
        PRINT "Invalid Magic Header: "; magic$
        CLOSE #fileNum%: EXIT SUB
    END IF

    depth% = 0: imgW% = 0: imgH% = 0
    GET #fileNum%, , depth%
    GET #fileNum%, , imgW%
    GET #fileNum%, , imgH%

    x% = 0: y% = 0
    chunk$ = " "

    IF depth% = 8 THEN
        ' 8-bit: 1 pixel per byte
        FOR i& = 1 TO CLNG(imgW%) * imgH%
            GET #fileNum%, , chunk$
            PSET (x%, y%), ASC(chunk$)
            x% = x% + 1
            IF x% >= imgW% THEN x% = 0: y% = y% + 1
        NEXT i&
    ELSEIF depth% = 4 THEN
        ' 4-bit: 2 pixels per byte (High nibble, Low nibble)
        totalBytes& = ((CLNG(imgW%) * imgH%) + 1) \\ 2
        FOR b& = 1 TO totalBytes&
            GET #fileNum%, , chunk$
            val% = ASC(chunk$)
            p1% = val% \\ 16
            p2% = val% AND 15
            PSET (x%, y%), p1%
            x% = x% + 1
            IF x% >= imgW% THEN x% = 0: y% = y% + 1
            IF y% < imgH% THEN
                PSET (x%, y%), p2%
                x% = x% + 1
                IF x% >= imgW% THEN x% = 0: y% = y% + 1
            END IF
        NEXT b&
    ELSEIF depth% = 1 THEN
        ' 1-bit: 8 pixels per byte (MSB leftmost)
        totalBytes& = ((CLNG(imgW%) * imgH%) + 7) \\ 8
        FOR b& = 1 TO totalBytes&
            GET #fileNum%, , chunk$
            val% = ASC(chunk$)
            FOR bit% = 7 TO 0 STEP -1
                p% = (val% \\ (2 ^ bit%)) AND 1
                PSET (x%, y%), p% * 15
                x% = x% + 1
                IF x% >= imgW% THEN x% = 0: y% = y% + 1
                IF y% >= imgH% THEN EXIT FOR
            NEXT bit%
        NEXT b&
    END IF

    CLOSE #fileNum%
END SUB

SUB SavePackedImage(fileName$, w%, h%, bpp%)
    fileNum% = FREEFILE
    OPEN fileName$ FOR OUTPUT AS #fileNum%: CLOSE #fileNum% ' Truncate
    OPEN fileName$ FOR BINARY AS #fileNum%

    magic$ = "QBGRPH"
    PUT #fileNum%, , magic$
    PUT #fileNum%, , bpp%
    PUT #fileNum%, , w%
    PUT #fileNum%, , h%

    x% = 0: y% = 0
    IF bpp% = 8 THEN
        FOR y% = 0 TO h% - 1
            FOR x% = 0 TO w% - 1
                c% = POINT(x%, y%)
                b$ = CHR$(c% AND 255)
                PUT #fileNum%, , b$
            NEXT x%
        NEXT y%
    ELSEIF bpp% = 4 THEN
        FOR y% = 0 TO h% - 1
            FOR x% = 0 TO w% - 1 STEP 2
                c1% = POINT(x%, y%) AND 15
                IF x% + 1 < w% THEN
                    c2% = POINT(x% + 1, y%) AND 15
                ELSE
                    c2% = 0
                END IF
                packed% = (c1% * 16) OR c2%
                b$ = CHR$(packed%)
                PUT #fileNum%, , b$
            NEXT x%
        NEXT y%
    ELSEIF bpp% = 1 THEN
        FOR y% = 0 TO h% - 1
            FOR x% = 0 TO w% - 1 STEP 8
                packed% = 0
                FOR bit% = 0 TO 7
                    IF x% + bit% < w% THEN
                        c% = POINT(x% + bit%, y%)
                        IF c% > 0 THEN packed% = packed% OR (2 ^ (7 - bit%))
                    END IF
                NEXT bit%
                b$ = CHR$(packed%)
                PUT #fileNum%, , b$
            NEXT x%
        NEXT y%
    END IF

    CLOSE #fileNum%
END SUB
`;
}

// 6. Direct VGA Mode 13h VRAM Blit Code (&HA000 POKE)
export function generateVramPokeCode(
  width: number,
  height: number,
  filename: string = 'IMAGE.BIN'
): string {
  return `' ====================================================================
' DIRECT VGA VRAM FAST BLASTER (DEF SEG = &HA000)
' Ultra-fast Mode 13h screen blit technique used in 90s DOS games.
' ====================================================================

DEFINT A-Z
SCREEN 13 ' 320x200 256 colors linear frame buffer
CLS

PRINT "Loading raster directly into VRAM (&HA000)..."
fileNum% = FREEFILE
OPEN "${filename}" FOR BINARY AS #fileNum%
' Skip 12-byte header
SEEK #fileNum%, 13

DEF SEG = &HA000 ' Point to VGA Video RAM linear memory
vramOffset& = 0

' Read chunks of 4096 bytes for speed
chunkSize% = 4096
buffer$ = SPACE$(chunkSize%)
bytesRemaining& = CLNG(${width}) * ${height}

DO WHILE bytesRemaining& > 0
    IF bytesRemaining& < chunkSize% THEN
        chunkSize% = bytesRemaining&
        buffer$ = SPACE$(chunkSize%)
    END IF
    GET #fileNum%, , buffer$
    FOR i% = 1 TO chunkSize%
        POKE vramOffset&, ASC(MID$(buffer$, i%, 1))
        vramOffset& = vramOffset& + 1
    NEXT i%
    bytesRemaining& = bytesRemaining& - chunkSize%
LOOP

DEF SEG ' Restore segment
CLOSE #fileNum%

LOCATE 1, 1: PRINT "VRAM Blit Complete. Press any key...";
WHILE INKEY$ = "": WEND
SCREEN 0: WIDTH 80, 25
END
`;
}

// 7. QBasic / QuickBASIC Hardware Palette Cycling (Waterfalls, Plasma, Fire)
export function generatePaletteCyclingCode(
  width: number,
  height: number,
  bitDepth: BitDepth,
  rangeStart: number = 0,
  rangeEnd: number = 15
): string {
  const qbScreen = bitDepth === 8 ? 13 : bitDepth === 4 ? 12 : 11;
  const palCount = bitDepth === 8 ? 256 : bitDepth === 4 ? 16 : 2;
  const start = Math.min(rangeStart, palCount - 2);
  const end = Math.min(rangeEnd, palCount - 1);

  return `' ====================================================================
' QBASIC / QB64 HARDWARE VGA PALETTE CYCLING DEMO
' Mode: SCREEN ${qbScreen} | Resolution: ${width}x${height}
' Generates smooth cascading water, fire, plasma, and neon flow effects
' by rotating VGA DAC hardware registers with ZERO pixel redraws!
' ====================================================================

DEFINT A-Z
SCREEN ${qbScreen}
CLS

' --- Draw Concentric Test Rings / Water Cascade ---
cx% = ${Math.floor(width / 2)}: cy% = ${Math.floor(height / 2)}
FOR r% = 120 TO 1 STEP -2
    col% = ${start} + (r% MOD (${end - start + 1}))
    CIRCLE (cx%, cy%), r%, col%
    PAINT (cx%, cy%), col%, col%
NEXT r%

LOCATE 1, 1: PRINT "Press ESC to stop palette cycling...";

' --- Palette Rotation Range ---
cycleStart% = ${start}
cycleEnd%   = ${end}
cycleCount% = cycleEnd% - cycleStart% + 1
dir% = 1 ' 1 = Forward (Waterfall flow), -1 = Reverse

' --- Main Real-Time Animation Loop ---
DO
    ' Read current VGA DAC values in the range
    DIM r%(cycleCount%), g%(cycleCount%), b%(cycleCount%)
    OUT &H3C7, cycleStart% ' Read Index Port
    FOR i% = 0 TO cycleCount% - 1
        r%(i%) = INP(&H3C9)
        g%(i%) = INP(&H3C9)
        b%(i%) = INP(&H3C9)
    NEXT i%

    ' Shift palette entries in memory (Circular Ring Buffer)
    DIM sr%(cycleCount%), sg%(cycleCount%), sb%(cycleCount%)
    FOR i% = 0 TO cycleCount% - 1
        IF dir% = 1 THEN
            src% = (i% - 1 + cycleCount%) MOD cycleCount%
        ELSE
            src% = (i% + 1) MOD cycleCount%
        END IF
        sr%(i%) = r%(src%)
        sg%(i%) = g%(src%)
        sb%(i%) = b%(src%)
    NEXT i%

    ' Wait for VGA Vertical Retrace (&H3DA) to prevent flicker and tearing
    WAIT &H3DA, 8
    WAIT &H3DA, 8, 8

    ' Write shifted RGB entries back to hardware DAC
    OUT &H3C8, cycleStart% ' Write Index Port
    FOR i% = 0 TO cycleCount% - 1
        OUT &H3C9, sr%(i%)
        OUT &H3C9, sg%(i%)
        OUT &H3C9, sb%(i%)
    NEXT i%

    ' Frame rate delay control (~30 FPS)
    t! = TIMER
    DO: LOOP WHILE TIMER - t! < 0.03

    k$ = INKEY$
    IF k$ = CHR$(27) THEN EXIT DO ' ESC exits
    IF k$ = " " THEN dir% = -dir% ' SPACE toggles direction
LOOP

SCREEN 0: WIDTH 80, 25
END
`;
}

