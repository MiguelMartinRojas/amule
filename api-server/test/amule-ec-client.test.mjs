import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import test from 'node:test';
import {
  decodeEcPacket,
  encodeEcPacket,
  encodeEcTag,
  getAmuleSearchResults,
  startAmuleSearch,
} from '../src/amule-ec-client.mjs';

const password = 'TestPassword';
const salt = 0xA1B2n;
const legacyOptions = { utf8Numbers: false, largeTagCount: false };
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

test('authenticates, starts an EC search, and parses its results', { concurrency: false }, async () => {
  const protocolErrors = [];
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let authenticated = false;

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
            const protocolVersion = packet.tags.find((tag) => tag.name === 0x0002);
            assert.equal(protocolVersion.data.readBigUInt64BE(), 0x0204n);
            assert.ok(packet.tags.some((tag) => tag.name === 0x000d));
            assert.ok(packet.tags.some((tag) => tag.name === 0x0011));
            socket.write(encodeEcPacket(0x4f, [
              encodeEcTag(0x000b, 5, u64(salt), [], legacyOptions),
            ], legacyOptions));
          } else if (packet.opcode === 0x50) {
            const saltHash = createHash('md5')
              .update(salt.toString(16).toUpperCase())
              .digest('hex');
            const expectedHash = createHash('md5')
              .update(password.toLowerCase() + saltHash)
              .digest();
            assert.deepEqual(packet.tags[0].data, expectedHash);
            authenticated = true;
            socket.write(encodeEcPacket(0x04, [], legacyOptions));
          } else if (packet.opcode === 0x26) {
            assert.equal(authenticated, true);
            const search = packet.tags[0];
            assert.equal(search.name, 0x0701);
            assert.equal(search.data.readUInt32BE(), 1);
            assert.equal(search.children.find((tag) => tag.name === 0x0702).data.toString('utf8').replace(/\0$/, ''), 'linux iso');
            assert.equal(search.children.find((tag) => tag.name === 0x0705).data.toString('utf8').replace(/\0$/, ''), 'Iso');
            assert.equal(search.children.find((tag) => tag.name === 0x0707).data.readUInt32BE(), 3);
            assert.equal(search.children.find((tag) => tag.name === 0x0703).data.readBigUInt64BE(), 1048576n);
            socket.write(encodeEcPacket(0x06, [stringTag(0x0000, 'Search started.', legacyOptions)], legacyOptions));
          } else if (packet.opcode === 0x29) {
            assert.equal(authenticated, true);
            socket.write(encodeEcPacket(0x29, [
              encodeEcTag(0x0708, 4, u32(100), [], legacyOptions),
            ], legacyOptions));
          } else if (packet.opcode === 0x28) {
            assert.equal(authenticated, true);
            const result = encodeEcTag(0x0700, 4, u32(1), [
              stringTag(0x0301, 'linux.iso', legacyOptions),
              encodeEcTag(0x0302, 9, Buffer.alloc(16, 0x11), [], legacyOptions),
              encodeEcTag(0x0303, 5, u64(1048576), [], legacyOptions),
              encodeEcTag(0x030a, 4, u32(7), [], legacyOptions),
            ], legacyOptions);
            socket.write(encodeEcPacket(0x28, [result], legacyOptions));
          } else {
            throw new Error(`Unexpected EC opcode ${packet.opcode}`);
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
    const started = await startAmuleSearch({
      query: 'linux iso',
      network: 'global',
      fileType: 'Iso',
      extension: '',
      availability: 3,
      minSize: 1048576,
      maxSize: 0,
    });
    assert.equal(started.message, 'Search started.');

    const snapshot = await getAmuleSearchResults();
    assert.equal(snapshot.progress, 100);
    assert.deepEqual(snapshot.results, [{
      id: '11111111111111111111111111111111',
      name: 'linux.iso',
      sizeBytes: '1048576',
      type: 'ISO',
      sources: 7,
    }]);
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
