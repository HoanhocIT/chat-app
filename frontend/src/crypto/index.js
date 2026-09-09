/* global BigInt */
/* eslint-disable no-undef */

import CryptoJS from 'crypto-js';

// ================================
// ELGAMAL + AES CRYPTOGRAPHY
// ================================

class ElGamal {
    static generateKeyPair() {
        const p = BigInt('10089848535856517349654153654767585844326952751049828864085404270735783189724701737551263795424378169385161028125903915464560108603438155543526125849259373');
        const g = BigInt(2);
        const x = this._generateRandomBigInt(BigInt(2), p - BigInt(2));
        const y = this._modPow(g, x, p);
        
        return {
            publicKey: { p: p.toString(), g: g.toString(), y: y.toString() },
            privateKey: { p: p.toString(), x: x.toString() }
        };
    }
    
    static encrypt(message, publicKey) {
        const p = BigInt(publicKey.p);
        const g = BigInt(publicKey.g);
        const y = BigInt(publicKey.y);
        const m = this._stringToBigInt(message);
        const k = this._generateRandomBigInt(BigInt(2), p - BigInt(2));
        const a = this._modPow(g, k, p);
        const b = (m * this._modPow(y, k, p)) % p;
        return { a: a.toString(), b: b.toString() };
    }
    
    static decrypt(cipherText, privateKey) {
        if (!privateKey || !privateKey.p || !privateKey.x) {
            throw new Error('Private key không hợp lệ');
        }
        
        const p = BigInt(privateKey.p);
        const x = BigInt(privateKey.x);
        const a = BigInt(cipherText.a);
        const b = BigInt(cipherText.b);
        
        const s = this._modPow(a, x, p);
        const sInv = this._modInverse(s, p);
        const m = (b * sInv) % p;
        
        return this._bigIntToString(m);
    }
    
    static _modPow(base, exponent, modulus) {
        if (modulus === BigInt(1)) return BigInt(0);
        let result = BigInt(1);
        base = base % modulus;
        while (exponent > BigInt(0)) {
            if (exponent % BigInt(2) === BigInt(1)) {
                result = (result * base) % modulus;
            }
            exponent = exponent / BigInt(2);
            base = (base * base) % modulus;
        }
        return result;
    }
    
    static _generateRandomBigInt(min, max) {
        const range = max - min;
        const bytes = Math.ceil(range.toString(2).length / 8);
        let randomBigInt;
        do {
            const randomBytes = CryptoJS.lib.WordArray.random(bytes).toString();
            randomBigInt = BigInt('0x' + randomBytes);
            randomBigInt = min + (randomBigInt % (range + BigInt(1)));
        } while (randomBigInt < min || randomBigInt > max);
        return randomBigInt;
    }
    
    static _modInverse(a, m) {
        let [old_r, r] = [a, m];
        let [old_s, s] = [BigInt(1), BigInt(0)];
        while (r !== BigInt(0)) {
            const quotient = old_r / r;
            [old_r, r] = [r, old_r - quotient * r];
            [old_s, s] = [s, old_s - quotient * s];
        }
        return (old_s + m) % m;
    }
    
    static _stringToBigInt(str) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        let hex = '';
        bytes.forEach(byte => {
            hex += byte.toString(16).padStart(2, '0');
        });
        return BigInt('0x' + hex);
    }
    
    static _bigIntToString(bigInt) {
        let hex = bigInt.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return new TextDecoder().decode(bytes);
    }
}

class AES {
    static generateKey() {
        return CryptoJS.lib.WordArray.random(32).toString();
    }
    
    static encrypt(message, key) {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(message, CryptoJS.enc.Hex.parse(key), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return { iv: iv.toString(), encryptedData: encrypted.toString() };
    }
    
    static decrypt(encryptedData, key) {
        const decrypted = CryptoJS.AES.decrypt(
            encryptedData.encryptedData,
            CryptoJS.enc.Hex.parse(key),
            {
                iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    }
}

// ================================
// CRYPTO CLASS TỔNG HỢP
// ================================
class Crypto {
    // Tạo cặp khóa
    static generateKeyPair() {
        return ElGamal.generateKeyPair();
    }
    
    // Mã hóa tin nhắn
    static encryptMessage(message) {
        const aesKey = AES.generateKey();
        const encryptedMessage = AES.encrypt(message, aesKey);
        return { aesKey, encryptedMessage };
    }
    
    // Mã hóa AES key
    static encryptAESKey(aesKey, publicKey) {
        return ElGamal.encrypt(aesKey, publicKey);
    }
    
    // Giải mã tin nhắn
    static decryptMessage(encryptedMessage, encryptedAESKey, privateKey) {
        const aesKey = ElGamal.decrypt(encryptedAESKey, privateKey);
        const content = AES.decrypt(encryptedMessage, aesKey);
        return content;
    }
}

export default Crypto;