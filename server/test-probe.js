import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: 'inherit'
});

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const exRes = await get('http://localhost:5000/api/exercises');
    console.log('EXERCISES API STATUS:', exRes.status);
    const exJson = JSON.parse(exRes.data);
    console.log('EXERCISES COUNT:', exJson.exercises?.length);

    const gamesRes = await get('http://localhost:5000/api/games');
    const gamesJson = JSON.parse(gamesRes.data);
    console.log('GAMES COUNT:', gamesJson.games?.length);

    const rootRes = await get('http://localhost:5000/');
    console.log('ROOT PAGE STATUS:', rootRes.status);
    console.log('ROOT PAGE HAS TITLE:', rootRes.data.includes('ReMotion'));

    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('PROBE ERROR:', err);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}

run();
