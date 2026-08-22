const lt = require('localtunnel');
(async () => {
  const tunnel = await lt({ port: 3000 });
  require('fs').writeFileSync('tunnel_url.txt', tunnel.url);
  console.log('Tunnel started at:', tunnel.url);
  
  // Keep alive
  setInterval(() => {}, 1000 * 60 * 60);
})();
