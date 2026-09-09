// ================================
// AES CRYPTOGRAPHY MODULE
// ================================
const crypto = require('crypto');

class AES {
    /**
     * Tạo khóa AES ngẫu nhiên
     */
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Mã hóa message bằng AES-256-CBC
     */
    static encrypt(message, key) {
        try {
            const iv = crypto.randomBytes(16);
            const keyBuffer = Buffer.from(key, 'hex');
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
            
            let encrypted = cipher.update(message, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                encryptedData: encrypted
            };
        } catch (error) {
            console.error('Lỗi mã hóa AES:', error);
            throw error;
        }
    }
    
    /**
     * Giải mã message bằng AES-256-CBC
     */
    static decrypt(encryptedData, key) {
        try {
            const keyBuffer = Buffer.from(key, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
            
            let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Lỗi giải mã AES:', error);
            throw error;
        }
    }
    
    /**
     * Mã hóa tin nhắn hoàn chỉnh
     */
    static encryptMessage(message) {
        const aesKey = this.generateKey();
        const encryptedMessage = this.encrypt(message, aesKey);
        
        return {
            aesKey: aesKey,
            encryptedMessage: encryptedMessage
        };
    }
}

module.exports = AES;