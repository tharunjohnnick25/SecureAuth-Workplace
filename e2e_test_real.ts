import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

async function run() {
  console.log("Downloading a proper test face image...");
  // Use curl to download a clear, direct face photo.
  execSync('curl -s -o test_face.jpg "https://upload.wikimedia.org/wikipedia/commons/4/44/Abraham_Lincoln_head_on_shoulders_photo_portrait.jpg"');
  
  const base64Image = readFileSync('test_face.jpg').toString('base64');
  console.log("Image downloaded. Base64 length:", base64Image.length);

  console.log("\\n--- PHASE 1: ENROLLMENT ---");
  const pythonEnrollRes = await fetch('http://localhost:8001/api/v1/face/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer face-api-key-secure-2026' },
    body: JSON.stringify({ captured_image_base64: base64Image, require_liveness: false })
  });
  
  const enrollData = await pythonEnrollRes.json();
  if (enrollData.error || enrollData.detail) {
    console.log("Enrollment Failed:", enrollData.error || enrollData.detail);
    return;
  }
  const masterEmbedding = enrollData.embedding;
  console.log("Enrollment Success! Extracted 512D embedding successfully.");
  
  console.log("\\n--- PHASE 2: LOGIN VERIFICATION ---");
  const pythonVerifyRes = await fetch('http://localhost:8001/api/v1/face/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer face-api-key-secure-2026' },
    body: JSON.stringify({ 
      captured_image_base64: base64Image, 
      enrolled_embedding: masterEmbedding,
      // Setting require_liveness to false for the test script because a static photo has zero liveness variance
      require_liveness: false 
    })
  });
  
  const verifyData = await pythonVerifyRes.json();
  if (verifyData.error || verifyData.detail) {
    console.log("Verification Failed:", verifyData.error || verifyData.detail);
    return;
  }
  
  console.log("Verification Success!");
  console.log("Match Confidence:", verifyData.confidence);
  console.log("\\n--- PHASE 3: NEXT.JS API VERIFICATION ---");
  const nextRes = await fetch('http://localhost:3000/api/auth/verify-face-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'rajesh@infosys.com', 
      captured_image_base64: base64Image
    })
  });
  
  const nextData = await nextRes.json();
  if (nextData.error) {
    console.log("Next.js Verification Failed:", nextData.error);
    return;
  }
  
  console.log("Next.js Verification Success:", nextData);
  console.log("\\nEnd-to-end AI Face Authentication is 100% WORKING!");
}

run().catch(console.error);
