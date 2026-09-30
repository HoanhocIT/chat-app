// ================================
// ELGAMAL CRYPTOGRAPHY MODULE
// ================================
const crypto = require('crypto');

class ElGamal {
    /**
     * Tạo cặp khóa ElGamal (public key + private key)
     */
    static generateKeyPair() {
        // Sử dụng số nguyên tố 512-bit an toàn
        const p = BigInt('10089848535856517349654153654767585844326952751049828864085404270735783189724701737551263795424378169385161028125903915464560108603438155543526125849259373');
        const g = BigInt(2); // Generator
        
        // Tạo private key x ngẫu nhiên
        const x = this._generateRandomBigInt(BigInt(2), p - BigInt(2));
        
        // Tính public key y = g^x mod p
        const y = this._modPow(g, x, p);
        
        return {
            publicKey: {
                p: p.toString(),
                g: g.toString(),
                y: y.toString()
            },
            privateKey: {
                p: p.toString(),
                x: x.toString()
            }
        };
    }
    
    /**
     * Mã hóa message bằng public key ElGamal
     */
    static encrypt(message, publicKey) {
        try {
            const p = BigInt(publicKey.p);
            const g = BigInt(publicKey.g);
            const y = BigInt(publicKey.y);
            
            // Chuyển message sang BigInt (giới hạn độ dài)
            const m = this._stringToBigInt(message);
            
            // Tạo số ngẫu nhiên k
            const k = this._generateRandomBigInt(BigInt(2), p - BigInt(2));
            
            // Tính a = g^k mod p
            const a = this._modPow(g, k, p);
            
            // Tính b = m * y^k mod p
            const b = (m * this._modPow(y, k, p)) % p;
            
            return {
                a: a.toString(),
                b: b.toString()
            };
        } catch (error) {
            console.error('Lỗi mã hóa ElGamal:', error);
            throw error;
        }
    }
    
    /**
     * Giải mã cipher text bằng private key
     */
    static decrypt(cipherText, privateKey) {
        try {
            const p = BigInt(privateKey.p);
            const x = BigInt(privateKey.x);
            const a = BigInt(cipherText.a);
            const b = BigInt(cipherText.b);
            
            // Tính s = a^x mod p
            const s = this._modPow(a, x, p);
            
            // Tính nghịch đảo modular: s^-1 mod p
            const sInv = this._modInverse(s, p);
            
            // Tính m = b * s^-1 mod p
            const m = (b * sInv) % p;
            
            // Chuyển BigInt về string
            return this._bigIntToString(m);
        } catch (error) {
            console.error('Lỗi giải mã ElGamal:', error);
            throw error;
        }
    }
    
    // ========== HELPER FUNCTIONS ==========
    
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
            const randomBytes = crypto.randomBytes(bytes);
            randomBigInt = BigInt('0x' + randomBytes.toString('hex'));
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
        const hex = Buffer.from(str, 'utf8').toString('hex');
        return BigInt('0x' + hex);
    }
    
    static _bigIntToString(bigInt) {
        let hex = bigInt.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        return Buffer.from(hex, 'hex').toString('utf8');
    }
}

module.exports = ElGamal;