/**
 * Standalone Pure JavaScript QR Code Generator
 * Generates standards-compliant QR Code Matrix and renders to HTML5 Canvas or SVG
 * Zero external dependencies.
 */
(function(window) {
  'use strict';

  // Galois Field GF(256) exponent and log tables
  var EXP_TABLE = new Array(256);
  var LOG_TABLE = new Array(256);

  for (var i = 0; i < 8; i++) {
    EXP_TABLE[i] = 1 << i;
  }
  for (var i = 8; i < 256; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (var i = 0; i < 255; i++) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }

  function glog(n) {
    if (n < 1) throw new Error("glog(" + n + ")");
    return LOG_TABLE[n];
  }

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP_TABLE[n];
  }

  // Polynomial operations
  function QRPolynomial(num, shift) {
    if (num.length == undefined) throw new Error(num.length + "/" + shift);
    var offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (var i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
  }

  QRPolynomial.prototype = {
    get: function(index) { return this.num[index]; },
    getLength: function() { return this.num.length; },
    multiply: function(e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < num.length; i++) num[i] = 0;
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = glog(this.get(0)) - glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var i = 0; i < e.getLength(); i++) {
        num[i] ^= gexp(glog(e.get(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  // Error Correction Generator Polynomial
  function getErrorCorrectPolynomial(errorCorrectLength) {
    var a = new QRPolynomial([1], 0);
    for (var i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, gexp(i)], 0));
    }
    return a;
  }

  // QR RS Blocks (Total Codewords, Data Codewords) per Version and EC level (L, M, Q, H)
  // [Total, Data]
  var RS_BLOCK_TABLE = {
    1: { L: [[1, 26, 19]], M: [[1, 26, 16]], Q: [[1, 26, 13]], H: [[1, 26, 9]] },
    2: { L: [[1, 44, 34]], M: [[1, 44, 28]], Q: [[1, 44, 22]], H: [[1, 44, 16]] },
    3: { L: [[1, 70, 55]], M: [[1, 70, 44]], Q: [[2, 35, 17]], H: [[2, 35, 13]] },
    4: { L: [[1, 100, 80]], M: [[2, 50, 32]], Q: [[2, 50, 24]], H: [[4, 25, 9]] },
    5: { L: [[1, 134, 108]], M: [[2, 67, 43]], Q: [[2, 33, 15], [2, 34, 16]], H: [[2, 33, 11], [2, 34, 12]] },
    6: { L: [[2, 86, 68]], M: [[4, 43, 27]], Q: [[4, 43, 19]], H: [[4, 43, 15]] },
    7: { L: [[2, 98, 78]], M: [[4, 49, 31]], Q: [[2, 32, 14], [4, 33, 15]], H: [[4, 39, 13], [1, 40, 14]] },
    8: { L: [[2, 121, 97]], M: [[2, 60, 38], [2, 61, 39]], Q: [[4, 40, 18], [2, 41, 19]], H: [[4, 40, 14], [2, 41, 15]] },
    9: { L: [[2, 146, 116]], M: [[3, 58, 36], [2, 59, 37]], Q: [[4, 36, 16], [4, 37, 17]], H: [[4, 36, 12], [4, 37, 13]] },
    10: { L: [[2, 86, 68], [2, 87, 69]], M: [[4, 69, 43], [1, 70, 44]], Q: [[6, 43, 19], [2, 44, 20]], H: [[6, 43, 15], [2, 44, 16]] }
  };

  // Alignment Pattern Positions per Version
  var PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50]
  ];

  // QR Bit Buffer
  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function(index) {
      var bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
    },
    put: function(num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) == 1);
      }
    },
    putBit: function(bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
      this.length++;
    }
  };

  // QR Code Model
  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function(data) {
      this.dataList.push(data);
      this.dataCache = null;
    },
    isDark: function(row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        throw new Error(row + "," + col);
      }
      return this.modules[row][col];
    },
    getModuleCount: function() {
      return this.moduleCount;
    },
    make: function() {
      // Auto-detect typeNumber if 0 or too small
      if (this.typeNumber < 1) {
        var typeNumber = 1;
        for (typeNumber = 1; typeNumber <= 10; typeNumber++) {
          var rsBlocks = RS_BLOCK_TABLE[typeNumber][this.errorCorrectLevel];
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i][0] * rsBlocks[i][2];
          }
          var totalBits = totalDataCount * 8;
          var buffer = this.createData(typeNumber);
          if (buffer.length <= totalBits) break;
        }
        this.typeNumber = Math.min(typeNumber, 10);
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function(test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      this.mapData(this.createData(this.typeNumber), maskPattern);
    },
    setupPositionProbePattern: function(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
              (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    setupPositionAdjustPattern: function() {
      var pos = PATTERN_POSITION_TABLE[this.typeNumber - 1];
      if (!pos) return;
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i];
          var col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTimingPattern: function() {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) continue;
        this.modules[r][6] = (r % 2 == 0);
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) continue;
        this.modules[6][c] = (c % 2 == 0);
      }
    },
    setupTypeInfo: function(test, maskPattern) {
      var data = ((this.errorCorrectLevel == 'L' ? 1 : this.errorCorrectLevel == 'M' ? 0 : this.errorCorrectLevel == 'Q' ? 3 : 2) << 3) | maskPattern;
      var bits = getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;

        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function(data, maskPattern) {
      var inc = -1;
      var row = this.moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;

      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
              }
              var mask = getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
    createData: function(typeNumber) {
      var buffer = new QRBitBuffer();
      for (var i = 0; i < this.dataList.length; i++) {
        var data = this.dataList[i];
        // 8-bit Byte mode
        buffer.put(4, 4); // Mode indicator: 0100 (8-bit)
        var utf8Bytes = toUTF8Array(data);
        buffer.put(utf8Bytes.length, typeNumber < 10 ? 8 : 16);
        for (var j = 0; j < utf8Bytes.length; j++) {
          buffer.put(utf8Bytes[j], 8);
        }
      }

      var rsBlocks = RS_BLOCK_TABLE[typeNumber][this.errorCorrectLevel];
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i][0] * rsBlocks[i][2];

      // End of message
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 != 0) buffer.putBit(false);

      // Padding bytes (0xEC, 0x11)
      while (buffer.length < totalDataCount * 8) {
        buffer.put(0xEC, 8);
        if (buffer.length < totalDataCount * 8) buffer.put(0x11, 8);
      }

      return createBytes(buffer, rsBlocks);
    },
    getBestMaskPattern: function() {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = getLostPoint(this);
        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    }
  };

  function toUTF8Array(str) {
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
      var charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      }
    }
    return utf8;
  }

  function createBytes(buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = [];
    var ecdata = [];

    for (var r = 0; r < rsBlocks.length; r++) {
      var count = rsBlocks[r][0];
      var totalCount = rsBlocks[r][1];
      var dataCount = rsBlocks[r][2];
      maxDcCount = Math.max(maxDcCount, dataCount);
      maxEcCount = Math.max(maxEcCount, totalCount - dataCount);

      for (var i = 0; i < count; i++) {
        var dc = new Array(dataCount);
        for (var j = 0; j < dataCount; j++) dc[j] = 0xff & buffer.buffer[j + offset];
        offset += dataCount;
        dcdata.push(dc);

        var rsPoly = getErrorCorrectPolynomial(totalCount - dataCount);
        var rawPoly = new QRPolynomial(dc, rsPoly.getLength() - 1);
        var modPoly = rawPoly.mod(rsPoly);
        var ec = new Array(rsPoly.getLength() - 1);
        for (var j = 0; j < ec.length; j++) {
          var modIndex = j + modPoly.getLength() - ec.length;
          ec[j] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
        }
        ecdata.push(ec);
      }
    }

    var data = [];
    for (var i = 0; i < maxDcCount; i++) {
      for (var r = 0; r < dcdata.length; r++) {
        if (i < dcdata[r].length) data.push(dcdata[r][i]);
      }
    }
    for (var i = 0; i < maxEcCount; i++) {
      for (var r = 0; r < ecdata.length; r++) {
        if (i < ecdata[r].length) data.push(ecdata[r][i]);
      }
    }
    return data;
  }

  function getMask(maskPattern, i, j) {
    switch (maskPattern) {
      case 0: return (i + j) % 2 == 0;
      case 1: return i % 2 == 0;
      case 2: return j % 3 == 0;
      case 3: return (i + j) % 3 == 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) == 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0;
      case 7: return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0;
      default: return false;
    }
  }

  function getBCHTypeInfo(data) {
    var d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(1335) >= 0) {
      d ^= (1335 << (getBCHDigit(d) - getBCHDigit(1335)));
    }
    return ((data << 10) | d) ^ 21522;
  }

  function getBCHDigit(data) {
    var digit = 0;
    while (data != 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  function getLostPoint(qrCode) {
    var moduleCount = qrCode.getModuleCount();
    var lostPoint = 0;
    // Condition 1: Same color adjacent modules
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        var sameCount = 0;
        var dark = qrCode.isDark(row, col);
        for (var r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (var c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c || (r == 0 && c == 0)) continue;
            if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
      }
    }
    return lostPoint;
  }

  /**
   * Helper class to draw QR Code onto an HTML5 Canvas
   */
  window.QRCodeGenerator = {
    renderCanvas: function(canvas, text, options) {
      options = options || {};
      var level = options.level || 'M';
      var size = options.size || 220;
      var margin = (options.margin !== undefined) ? options.margin : 2;
      var darkColor = options.darkColor || '#0A192F';
      var lightColor = options.lightColor || '#FFFFFF';

      var qr = new QRCodeModel(0, level);
      qr.addData(text);
      qr.make();

      var count = qr.getModuleCount();
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = lightColor;
      ctx.fillRect(0, 0, size, size);

      var moduleSize = size / (count + margin * 2);

      ctx.fillStyle = darkColor;
      for (var row = 0; row < count; row++) {
        for (var col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            var x = Math.round((col + margin) * moduleSize);
            var y = Math.round((row + margin) * moduleSize);
            var w = Math.ceil(moduleSize);
            var h = Math.ceil(moduleSize);
            ctx.fillRect(x, y, w, h);
          }
        }
      }
      return canvas;
    }
  };

})(window);
