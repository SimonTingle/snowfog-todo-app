const http = require('http');
const { handleRequest } = require('./server');

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
