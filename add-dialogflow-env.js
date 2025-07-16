const fs = require('fs');
const path = require('path');

// Read the dialogflow key file
const keyPath = path.join(__dirname, 'dialogflow-key.json');
const envPath = path.join(__dirname, '.env');

try {
    const credentials = fs.readFileSync(keyPath, 'utf8');
    const parsedCredentials = JSON.parse(credentials);
    
    // Read current .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Add Dialogflow credentials to .env
    const dialogflowEnv = `\n# Google Dialogflow Credentials\nGOOGLE_APPLICATION_CREDENTIALS_JSON=${JSON.stringify(parsedCredentials)}`;
    
    // Check if already exists
    if (!envContent.includes('GOOGLE_APPLICATION_CREDENTIALS_JSON')) {
        fs.appendFileSync(envPath, dialogflowEnv);
        console.log('Đã thêm Dialogflow credentials vào file .env');
        console.log('Bây giờ bạn cần:');
        console.log('1. Copy giá trị GOOGLE_APPLICATION_CREDENTIALS_JSON từ file .env');
        console.log('2. Thêm vào Environment Variables trên Vercel');
        console.log('3. Redeploy ứng dụng');
    } else {
        console.log('Dialogflow credentials đã tồn tại trong file .env');
    }
    
} catch (error) {
    console.error('Lỗi:', error.message);
} 