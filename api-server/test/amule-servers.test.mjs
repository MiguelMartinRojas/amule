import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';
import {
  addAmuleServer,
  connectAmuleServer,
  decodeEcPacket,
  disconnectAmuleServer,
  encodeEcPacket,
  encodeEcTag,
  getAmuleServers,
  startAmuleKad,
  stopAmuleKad,
} from '../src/amule-ec-client.mjs';

const password = 'TestPassword';
const salt = 0xA1B2n;
const utf8Options = { utf8Numbers: true, largeTagCount: true };
const u32 = (value) => {
  const data = Buffer.alloc(4);
  data.writeUInt32BE(value);
  return data;
};
const u64 = (value) => {
  const data = Buffer.alloc(8);
  data.writeBigUInt64BE(BigInt(value));
  return data;
};
const stringTag = (name, value, options = {}) =>
  encodeEcTag(name, 6, Buffer.from(`${value}\0`, 'utf8'), [], options);

test('reads the server list and sends server connection commands', async () => {
  const protocolErrors = [];
  const receivedCommands = [];
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const frameLength = buffer.readUInt32BE(4);
        if (buffer.length < frameLength + 8) {
          return;
        }
        const frame = buffer.subarray(0, frameLength + 8);
        buffer = buffer.subarray(frameLength + 8);

        try {
          const packet = decodeEcPacket(frame);
          if (packet.opcode === 0x02) {
            assert.ok(packet.tags.some((tag) => tag.name === 0x000d));
            assert.ok(packet.tags.some((tag) => tag.name === 0x0011));
            socket.write(encodeEcPacket(
              0x4f,
              [encodeEcTag(0x000b, 5, u64(salt), [], utf8Options)],
              utf8Options,
            ));
          } else if (packet.opcode === 0x50) {
            socket.write(encodeEcPacket(0x04, [], utf8Options));
          } else {
            receivedCommands.push(packet);
            if (packet.opcode === 0x0b) {
              const currentServer = encodeEcTag(
                0x0500,
                8,
                Buffer.from([1, 2, 3, 4, 0x12, 0x34]),
                [stringTag(0x0501, 'Current server', utf8Options)],
                utf8Options,
              );
              socket.write(encodeEcPacket(0x07, [
                encodeEcTag(0x0005, 2, Buffer.from([0x05]), [currentServer], utf8Options),
              ], utf8Options));
            } else if (packet.opcode === 0x2c) {
              const listedServer = encodeEcTag(
                0x0500,
                8,
                Buffer.from([5, 6, 7, 8, 0x13, 0x88]),
                [
                  stringTag(0x0501, 'Listed server', utf8Options),
                  encodeEcTag(0x0504, 4, u32(42), [], utf8Options),
                  encodeEcTag(0x0505, 4, u32(120), [], utf8Options),
                  encodeEcTag(0x0506, 4, u32(500), [], utf8Options),
                  encodeEcTag(0x0507, 4, u32(1000), [], utf8Options),
                  encodeEcTag(0x0509, 2, Buffer.from([2]), [], utf8Options),
                ],
                utf8Options,
              );
              socket.write(encodeEcPacket(0x2d, [listedServer], utf8Options));
            } else if (packet.opcode === 0x2f) {
              assert.equal(packet.tags[0].name, 0x0500);
              assert.deepEqual(packet.tags[0].data, Buffer.from([5, 6, 7, 8, 0x13, 0x88]));
              socket.write(encodeEcPacket(0x01, [], utf8Options));
            } else if (packet.opcode === 0x2e) {
              assert.equal(packet.tags.length, 0);
              socket.write(encodeEcPacket(0x01, [], utf8Options));
            } else if (packet.opcode === 0x31) {
              assert.equal(
                packet.tags.find((tag) => tag.name === 0x0503).data.toString('utf8').replace(/\0$/, ''),
                'server.example.org:4661',
              );
              assert.equal(
                packet.tags.find((tag) => tag.name === 0x0501).data.toString('utf8').replace(/\0$/, ''),
                'New server',
              );
              socket.write(encodeEcPacket(0x01, [], utf8Options));
            } else if (packet.opcode === 0x48 || packet.opcode === 0x49) {
              socket.write(encodeEcPacket(0x01, [], utf8Options));
            } else {
              throw new Error(`Unexpected EC opcode ${packet.opcode}`);
            }
          }
        } catch (error) {
          protocolErrors.push(error);
          socket.destroy();
          return;
        }
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const previousEnvironment = {
    password: process.env.AMULE_EC_PASSWORD,
    host: process.env.AMULE_EC_HOST,
    port: process.env.AMULE_EC_PORT,
  };
  process.env.AMULE_EC_PASSWORD = password;
  process.env.AMULE_EC_HOST = '127.0.0.1';
  process.env.AMULE_EC_PORT = String(address.port);

  try {
    const snapshot = await getAmuleServers();
    assert.deepEqual(snapshot, {
      connected: true,
      connecting: false,
      kadConnected: true,
      kadRunning: false,
      currentServer: {
        ip: '1.2.3.4',
        port: 0x1234,
        name: 'Current server',
        ping: 0,
        users: 0,
        usersMax: 0,
        files: 0,
        failed: 0,
      },
      servers: [{
        ip: '5.6.7.8',
        port: 5000,
        name: 'Listed server',
        ping: 42,
        users: 120,
        usersMax: 500,
        files: 1000,
        failed: 2,
      }],
    });

    await connectAmuleServer({ address: '5.6.7.8', port: 5000 });
    await disconnectAmuleServer();
    await addAmuleServer({ address: 'server.example.org', port: 4661, name: 'New server' });
    await startAmuleKad();
    await stopAmuleKad();
    assert.deepEqual(receivedCommands.map((packet) => packet.opcode), [
      0x0b, 0x2c, 0x2f, 0x2e, 0x31, 0x48, 0x49,
    ]);
    assert.deepEqual(protocolErrors, []);
  } finally {
    if (previousEnvironment.password === undefined) delete process.env.AMULE_EC_PASSWORD;
    else process.env.AMULE_EC_PASSWORD = previousEnvironment.password;
    if (previousEnvironment.host === undefined) delete process.env.AMULE_EC_HOST;
    else process.env.AMULE_EC_HOST = previousEnvironment.host;
    if (previousEnvironment.port === undefined) delete process.env.AMULE_EC_PORT;
    else process.env.AMULE_EC_PORT = previousEnvironment.port;
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
