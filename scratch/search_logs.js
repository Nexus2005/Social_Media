const fs = require('fs');

const logPath = 'C:\\Users\\Omkar Ahirrao\\.gemini\\antigravity-ide\\brain\\3f73cc37-1235-49c2-96dc-5a640670ede8\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  const line = fs.readFileSync(logPath, 'utf8').split('\n')[11373]; // 11374th line is index 11373
  const obj = JSON.parse(line);
  fs.writeFileSync('scratch/full_spec.txt', obj.content, 'utf8');
  console.log('Written to scratch/full_spec.txt');
}

run();
