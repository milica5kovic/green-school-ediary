const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '../assets/DejaVuSans.ttf');
const font = fs.readFileSync(fontPath);
const base64 = font.toString('base64');

console.log('Copy this base64 string:');
console.log(base64);