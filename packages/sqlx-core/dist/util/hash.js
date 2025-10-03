"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = void 0;
const crypto = require("crypto");
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
exports.sha256 = sha256;
