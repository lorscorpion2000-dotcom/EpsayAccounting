// تولید JWT secret قوی
import crypto from 'node:crypto';
console.log('JWT_SECRET:            ' + crypto.randomBytes(48).toString('base64url'));
console.log('JWT_REFRESH_SECRET:    ' + crypto.randomBytes(48).toString('base64url'));