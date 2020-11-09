'use strict';

const bodyParser = require('body-parser');
const browserify = require('browserify-middleware');
const express = require('express');
const WebRtcConnectionManager = require('./lib/server/connections/webrtcconnectionmanager');


const app = express();

app.use(bodyParser.json());
app.use('/record-audio-video-stream/index.js', browserify(`${__dirname}/examples/record-audio-video-stream/client.js`));
app.get('/record-audio-video-stream/index.html', (req, res) => {
  res.sendFile(`${__dirname}/html/index.html`);
});

const connectionManager = WebRtcConnectionManager.create();

app.get(`/record-audio-video-stream/connections`, (req, res) => {
  console.log('GET Connections')
  res.send(connectionManager.getConnections());
});

app.post(`/record-audio-video-stream/connections`, async (req, res) => {
  try {
    const connection = await connectionManager.createConnection();
    console.log('POST Connections', JSON.stringify(connection));
    res.json(connection);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete(`/record-audio-video-stream/connections/:id`, (req, res) => {
  const { id } = req.params;
  console.log('DELETE Connections')
  const connection = connectionManager.getConnection(id);
  if (!connection) {
    res.sendStatus(404);
    return;
  }
  connection.close();
  res.send(connection);
});

app.get(`/record-audio-video-stream/connections/:id`, (req, res) => {
  const { id } = req.params;
  console.log('GET Connection')
  const connection = connectionManager.getConnection(id);
  if (!connection) {
    res.sendStatus(404);
    return;
  }
  res.send(connection);
});

app.get(`/record-audio-video-stream/connections/:id/local-description`, (req, res) => {
  const { id } = req.params;
  console.log('GET Connection local-description')
  const connection = connectionManager.getConnection(id);
  if (!connection) {
    res.sendStatus(404);
    return;
  }
  res.send(connection.toJSON().localDescription);
});

app.get(`/record-audio-video-stream/connections/:id/remote-description`, (req, res) => {
  const { id } = req.params;
  console.log('GET Connection remote-description')
  const connection = connectionManager.getConnection(id);
  if (!connection) {
    res.sendStatus(404);
    return;
  }
  res.send(connection.toJSON().remoteDescription);
});

app.post(`/record-audio-video-stream/connections/:id/remote-description`, async (req, res) => {
  const { id } = req.params;
  console.log('POST Connection remote-description')
  const connection = connectionManager.getConnection(id);
  if (!connection) {
    res.sendStatus(404);
    return;
  }
  try {
    console.log('REMPTE DESC: ', req.body)
    await connection.applyAnswer(req.body);
    res.send(connection.toJSON().remoteDescription);
  } catch (error) {
    res.sendStatus(400);
  }
});
app.get('/', (req, res) => res.redirect('record-audio-video-stream/index.html'));

const server = app.listen(3000, () => {
  server.once('close', () => {
    connectionManager.close();
  });
});
