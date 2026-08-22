const fs = require('fs');
const path = require('path');

const replacements = [
  [/'Enterprise secur'/g, "'Enterprise Security'"],
  [/"Enterprise secur"/g, "\"Enterprise Security\""],
  [/'Please allow location access for enhanced security'/g, "'Please allow location access for enhanced security.'"],
  [/"Please allow location access for enhanced security"/g, "\"Please allow location access for enhanced security.\""],
  [/'Camera access denied. Please enable camera permissions'/g, "'Camera access denied. Please enable camera permissions.'"],
  [/"Camera access denied. Please enable camera permissions"/g, "\"Camera access denied. Please enable camera permissions.\""],
  [/'Please enter the full 6-digit OTP'/g, "'Please enter the full 6-digit OTP.'"],
  [/"Please enter the full 6-digit OTP"/g, "\"Please enter the full 6-digit OTP.\""],
  [/'Failed to generate passkey options'/g, "'Failed to generate passkey options.'"],
  [/'Failed to verify passkey'/g, "'Failed to verify passkey.'"],
  [/'Failed to remove passkey'/g, "'Failed to remove passkey.'"],
  [/'Send reset link'/gi, "'Send Reset Link'"],
  [/"Send reset link"/gi, "\"Send Reset Link\""],
  [/'Authenticate'/g, "'Sign In'"],
  [/"Authenticate"/g, "\"Sign In\""]
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [regex, replacement] of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Modified: ' + fullPath);
      }
    }
  }
}

processDir('./components');
processDir('./app');
console.log('Done.');
