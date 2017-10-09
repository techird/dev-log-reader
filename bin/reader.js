#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const child_process = require('child_process');
const WebSocket = require('ws');

/** @type {WebSocket[]} */
const clients = [];
const logs = [];

let lastLineTial = {}, lastLineSendTimer = {};
const produce = (data, source) => {
  clearTimeout(lastLineSendTimer[source]);
  const chunk = (lastLineTial[source] || '') + data;
  const lines = chunk.split(/\r?\n/g);
  lastLineTial[source] = lines.pop();
  for (let line of lines) {
    console.log(line);
    logs.push(line);
  }
  consume();
  lastLineSendTimer[source] = setTimeout(() => {
    if (lastLineTial[source]) {
      logs.push(lastLineTial[source]);
      lastLineTial[source] = '';
      consume();
    }
  }, 100);
}

const consume = () => {
  if (clients.length) {
    for (let client of clients) {
      while (logs.length) {
        client.send(logs.shift());
      }
    }
  }
};

const usage = () => {
  console.log('Usage: dlr [-p,--port=number] [-t,--title=title] -- command');
  process.exit(-1);
};
const args = process.argv.slice(2);
const splitIndex = args.indexOf('--');

if (splitIndex === -1) usage();

const bootArgs = args.slice(0, splitIndex);
const [taskCommand, ...taskArgs] = args.slice(splitIndex + 1);

let port = 1234, title = 'LogReader';

while (arg = bootArgs.shift()) {
  let value;
  if (arg === '-p' && (value = bootArgs.shift()) || /--port=(\d+)/.test(arg)) {
    port = parseInt(value || RegExp.$1, 10);
    if (isNaN(port)) {
      usage();
      break;
    }
    continue;
  }
  if (arg === '-t' && (value = bootArgs.shift()) || /--title=(.+)/.test(arg)) {
    title = value || RegExp.$1;
    if (!title) {
      usage();
      break;
    }
    continue;
  }
}

const task = child_process.spawn(taskCommand, taskArgs);

task.stdout.on('data', data => produce(data.toString('utf8'), 'stdout'));
task.stderr.on('data', data => produce(data.toString('utf8'), 'stderr'));

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
  });
  res.write(fs.readFileSync(path.join(__dirname, '../static/index.html'), { encoding: 'utf8' }));
  res.end();
});

const ws = new WebSocket.Server({ server });

ws.on('connection', client => {
  clients.push(client);
  client.on('close', () => {
    const index = clients.indexOf(client);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
  consume();
});

server.listen(port);
console.log(`Read logs in http://127.0.0.1:${port}?title=${encodeURIComponent(title)}`);