import { createHash } from 'node:crypto';
import net from 'node:net';

const EC_PROTOCOL_VERSION = 0x0204;
const EC_MAX_FRAME_SIZE = 16 * 1024 * 1024;
const EC_TIMEOUT_MS = 8000;

const OPCODE = {
  authRequest: 0x02,
  authFail: 0x03,
  authOk: 0x04,
  failed: 0x05,
  strings: 0x06,
  miscData: 0x07,
  getConnState: 0x0b,
  getServerList: 0x2c,
  serverList: 0x2d,
  serverDisconnect: 0x2e,
  serverConnect: 0x2f,
  serverAdd: 0x31,
  kadStart: 0x48,
  kadStop: 0x49,
  searchStart: 0x26,
  searchStop: 0x27,
  searchResults: 0x28,
  searchProgress: 0x29,
  authSalt: 0x4f,
  authPassword: 0x50,
};

const TAG = {
  string: 0x0000,
  passwordHash: 0x0001,
  protocolVersion: 0x0002,
  passwordSalt: 0x000b,
  canUtf8Numbers: 0x000d,
  canLargeTagCount: 0x0011,
  canUtf8Numbers: 0x000d,
  canLargeTagCount: 0x0011,
  clientName: 0x0100,
  clientVersion: 0x0101,
  connState: 0x0005,
  server: 0x0500,
  serverName: 0x0501,
  serverAddress: 0x0503,
  serverPing: 0x0504,
  serverUsers: 0x0505,
  serverUsersMax: 0x0506,
  serverFiles: 0x0507,
  serverFailed: 0x0509,
  partfileName: 0x0301,
  partfileHash: 0x0302,
  partfileSize: 0x0303,
  partfileStatus: 0x0308,
  sourceCount: 0x030a,
  searchFile: 0x0700,
  searchType: 0x0701,
  searchName: 0x0702,
  searchMinSize: 0x0703,
  searchMaxSize: 0x0704,
  searchFileType: 0x0705,
  searchExtension: 0x0706,
  searchAvailability: 0x0707,
  searchStatus: 0x0708,
};

function integerData(value, width) {
  const data = Buffer.alloc(width);
  if (width === 8) {
    data.writeBigUInt64BE(BigInt(value));
  } else {
    data.writeUIntBE(Number(value), 0, width);
  }
  return data;
}

function encodeWireNumber(value, width, utf8Numbers) {
  if (!utf8Numbers) {
    return integerData(value, width);
  }

  const number = Number(value);
  const limits = [0x7f, 0x7ff, 0xffff, 0x1fffff, 0x3ffffff, 0x7fffffff];
  const length = limits.findIndex((limit) => number <= limit) + 1;
  const widthMaximum = width === 1 ? 0xff : width === 2 ? 0xffff : 0x7fffffff;
  if (!Number.isSafeInteger(number) || number < 0 || !length || number > widthMaximum) {
    throw new RangeError('External Connections number is out of range.');
  }

  if (length === 1) {
    return Buffer.from([number]);
  }
  const data = Buffer.alloc(length);
  let valueBits = number;
  for (let index = length - 1; index > 0; index -= 1) {
    data[index] = 0x80 | (valueBits & 0x3f);
    valueBits >>>= 6;
  }
  const prefix = [0, 0, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc][length];
  const prefixBits = 7 - length;
  data[0] = prefix | valueBits;
  if ((data[0] & (0xff << prefixBits)) !== prefix) {
    throw new RangeError('External Connections number encoding failed.');
  }
  return data;
}

function readWireNumber(buffer, offset, width, utf8Numbers, limit = buffer.length) {
  if (!utf8Numbers) {
    if (offset + width > limit) {
      throw new Error('Truncated External Connections number');
    }
    return {
      value: buffer.readUIntBE(offset, width),
      nextOffset: offset + width,
    };
  }

  if (offset >= limit) {
    throw new Error('Truncated External Connections number');
  }
  const first = buffer[offset];
  const length = first < 0x80 ? 1
    : first >= 0xc0 && first < 0xe0 ? 2
      : first >= 0xe0 && first < 0xf0 ? 3
        : first >= 0xf0 && first < 0xf8 ? 4
          : first >= 0xf8 && first < 0xfc ? 5
            : first >= 0xfc && first < 0xfe ? 6
              : 0;
  if (!length || offset + length > limit) {
    throw new Error('Invalid or truncated External Connections number');
  }

  let value = length === 1 ? first : first & (0x7f >> length);
  for (let index = 1; index < length; index += 1) {
    const byte = buffer[offset + index];
    if ((byte & 0xc0) !== 0x80) {
      throw new Error('Invalid External Connections number encoding');
    }
    value = value * 64 + (byte & 0x3f);
  }

  const minimum = [0, 0, 0x80, 0x800, 0x10000, 0x200000, 0x4000000][length];
  const maximum = width === 1 ? 0xff : width === 2 ? 0xffff : 0x7fffffff;
  if (value < minimum || value > maximum) {
    throw new Error('External Connections number is out of range');
  }
  return { value, nextOffset: offset + length };
}

function readTagCount(buffer, offset, options, limit = buffer.length) {
  const count = readWireNumber(buffer, offset, 2, options.utf8Numbers, limit);
  if (options.largeTagCount && count.value === 0xffff) {
    const extended = readWireNumber(buffer, count.nextOffset, 4, options.utf8Numbers, limit);
    return extended;
  }
  return count;
}

export function encodeEcTag(name, type, data, children = [], options = {}) {
  const { utf8Numbers = false, largeTagCount = false } = options;
  let childCountData = Buffer.alloc(0);
  if (children.length) {
    if (largeTagCount && children.length >= 0xffff) {
      childCountData = Buffer.concat([
        encodeWireNumber(0xffff, 2, utf8Numbers),
        encodeWireNumber(children.length, 4, utf8Numbers),
      ]);
    } else {
      childCountData = encodeWireNumber(children.length, 2, utf8Numbers);
    }
  }
  const childData = children.length
    ? Buffer.concat([
        childCountData,
        ...children,
      ])
    : Buffer.alloc(0);
  const childrenLength = children.reduce((length, childBuffer) => {
    const child = parseTag(childBuffer, 0, { utf8Numbers, largeTagCount });
    if (child.nextOffset !== childBuffer.length) {
      throw new Error('Invalid nested External Connections tag');
    }
    return length + child.declaredLength + 7 + child.childCountFieldSizeForParent;
  }, 0);
  const length = childrenLength + data.length;
  const header = Buffer.concat([
    encodeWireNumber((name << 1) | (children.length ? 1 : 0), 2, utf8Numbers),
    encodeWireNumber(type, 1, utf8Numbers),
    encodeWireNumber(length, 4, utf8Numbers),
  ]);
  return Buffer.concat([header, childData, data]);
}

function stringTag(name, value, options = {}) {
  return encodeEcTag(name, 6, Buffer.from(`${value}\0`, 'utf8'), [], options);
}

function integerTag(name, value, width, options = {}) {
  return encodeEcTag(name, width === 4 ? 4 : 5, integerData(value, width), [], options);
}

export function encodeEcPacket(opcode, tags = [], options = {}) {
  const { utf8Numbers = false, largeTagCount = false } = options;
  let tagCountData;
  if (largeTagCount && tags.length >= 0xffff) {
    tagCountData = Buffer.concat([
      encodeWireNumber(0xffff, 2, utf8Numbers),
      encodeWireNumber(tags.length, 4, utf8Numbers),
    ]);
  } else {
    tagCountData = encodeWireNumber(tags.length, 2, utf8Numbers);
  }
  const body = Buffer.concat([
    encodeWireNumber(opcode, 1, utf8Numbers),
    tagCountData,
    ...tags,
  ]);
  const frame = Buffer.alloc(8);
  frame.writeUInt32BE(
    0x20 | (utf8Numbers ? 0x02 : 0) | (largeTagCount ? 0x10 : 0),
    0,
  );
  frame.writeUInt32BE(body.length, 4);
  return Buffer.concat([frame, body]);
}

function parseTag(buffer, offset, options, depth = 0, limit = buffer.length) {
  if (depth > 16) {
    throw new Error('Invalid External Connections tag');
  }

  const name = readWireNumber(buffer, offset, 2, options.utf8Numbers, limit);
  const type = readWireNumber(buffer, name.nextOffset, 1, options.utf8Numbers, limit);
  const tagLength = readWireNumber(buffer, type.nextOffset, 4, options.utf8Numbers, limit);
  const hasChildren = (name.value & 1) !== 0;
  let cursor = tagLength.nextOffset;
  let childCountFieldSizeForParent = 0;
  let childrenLength = 0;
  const children = [];
  if (hasChildren) {
    const childCount = readTagCount(buffer, cursor, options, limit);
    childCountFieldSizeForParent =
      options.largeTagCount && childCount.value >= 0xffff ? 6 : 2;
    cursor = childCount.nextOffset;
    const minTagLength = options.utf8Numbers ? 3 : 7;
    if (childCount.value > Math.floor((limit - cursor) / minTagLength)) {
      throw new Error('Invalid External Connections child count');
    }
    for (let index = 0; index < childCount.value; index += 1) {
      const child = parseTag(buffer, cursor, options, depth + 1, limit);
      children.push(child.tag);
      cursor = child.nextOffset;
      childrenLength += child.declaredLength + 7 + child.childCountFieldSizeForParent;
    }
  }

  const dataLength = tagLength.value - childrenLength;
  if (dataLength < 0) {
    throw new Error('Invalid External Connections tag length');
  }
  const end = cursor + dataLength;
  if (end > limit) {
    throw new Error(
      `Truncated External Connections tag ${name.value >> 1} type ${type.value} at byte ${offset}: declared ${dataLength} data bytes with ${limit - cursor} remaining.`,
    );
  }

  return {
    tag: {
      name: name.value >> 1,
      type: type.value,
      data: buffer.subarray(cursor, end),
      children,
    },
    nextOffset: end,
    declaredLength: tagLength.value,
    childCountFieldSizeForParent,
  };
}

export function decodeEcPacket(frame) {
  const flags = frame.readUInt32BE(0);
  const length = frame.readUInt32BE(4);
  if (length > EC_MAX_FRAME_SIZE || frame.length !== length + 8) {
    throw new Error('Invalid External Connections frame length');
  }
  if (flags & 0x01) {
    throw new Error('External Connections negotiated unsupported compression');
  }

  const options = {
    utf8Numbers: (flags & 0x02) !== 0,
    largeTagCount: (flags & 0x10) !== 0,
  };
  const body = frame.subarray(8);
  if (body.length < (options.utf8Numbers ? 2 : 3)) {
    throw new Error('Invalid External Connections packet');
  }
  const opcode = readWireNumber(body, 0, 1, options.utf8Numbers).value;
  const tagCount = readTagCount(body, 1, options);
  let cursor = tagCount.nextOffset;
  const tags = [];
  const minTagLength = options.utf8Numbers ? 3 : 7;
  if (tagCount.value > Math.floor((body.length - cursor) / minTagLength)) {
    throw new Error('Invalid External Connections packet tag count');
  }
  try {
    for (let index = 0; index < tagCount.value; index += 1) {
      const tag = parseTag(body, cursor, options);
      tags.push(tag.tag);
      cursor = tag.nextOffset;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Malformed EC packet opcode 0x${opcode.toString(16)} flags 0x${flags.toString(16)} at byte ${cursor}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
  if (cursor !== body.length) {
    throw new Error('Unexpected trailing data in External Connections packet');
  }
  return { opcode, tags, flags };
}

function getTag(tags, name) {
  return tags.find((tag) => tag.name === name);
}

function tagInteger(tag) {
  if (!tag || tag.data.length === 0 || tag.data.length > 8) {
    throw new Error('Missing or invalid External Connections integer');
  }
  return tag.data.length === 8
    ? tag.data.readBigUInt64BE()
    : BigInt(tag.data.readUIntBE(0, tag.data.length));
}

function tagString(tag) {
  if (!tag) {
    return '';
  }
  const end = tag.data.indexOf(0);
  return tag.data.subarray(0, end === -1 ? tag.data.length : end).toString('utf8');
}

function searchError(packet, fallback) {
  const message = tagString(getTag(packet.tags, TAG.string));
  return message || fallback;
}

class EcTransport {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.pendingReaders = [];
    this.error = null;
    this.wireOptions = { utf8Numbers: false, largeTagCount: false };
    socket.setTimeout(EC_TIMEOUT_MS);
    socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.flushReaders();
    });
    socket.on('timeout', () => socket.destroy(new Error('External Connections request timed out')));
    socket.on('error', (error) => this.fail(error));
    socket.on('close', () => this.fail(new Error('External Connections connection closed')));
  }

  fail(error) {
    this.error ||= error;
    for (const reader of this.pendingReaders.splice(0)) {
      reader.reject(this.error);
    }
  }

  flushReaders() {
    while (this.pendingReaders.length && this.buffer.length >= 8) {
      const length = this.buffer.readUInt32BE(4);
      if (length > EC_MAX_FRAME_SIZE) {
        this.fail(new Error('External Connections frame exceeds the size limit'));
        this.socket.destroy();
        return;
      }
      if (this.buffer.length < length + 8) {
        return;
      }
      const frame = this.buffer.subarray(0, length + 8);
      this.buffer = this.buffer.subarray(length + 8);
      const reader = this.pendingReaders.shift();
      try {
        reader.resolve(decodeEcPacket(frame));
      } catch (error) {
        reader.reject(error);
        this.fail(error);
        this.socket.destroy();
        return;
      }
    }
  }

  readPacket() {
    return new Promise((resolve, reject) => {
      if (this.error) {
        reject(this.error);
        return;
      }
      this.pendingReaders.push({ resolve, reject });
      this.flushReaders();
    });
  }

  async sendPacket(opcode, tags = [], options = this.wireOptions) {
    const frame = encodeEcPacket(opcode, tags, options);
    await new Promise((resolve, reject) => {
      this.socket.write(frame, (error) => error ? reject(error) : resolve());
    });
  }

  async request(opcode, tags = [], options = this.wireOptions) {
    await this.sendPacket(opcode, tags, options);
    return this.readPacket();
  }
}

async function withAmuleEc(callback) {
  const password = process.env.AMULE_EC_PASSWORD;
  if (!password) {
    throw new Error('Set AMULE_EC_PASSWORD in api-server/.env or the API server environment to enable aMule External Connections.');
  }

  const host = process.env.AMULE_EC_HOST || '127.0.0.1';
  const port = Number(process.env.AMULE_EC_PORT || 4712);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('AMULE_EC_PORT must be a valid TCP port.');
  }

  const socket = net.createConnection({ host, port });
  const transport = new EcTransport(socket);
  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    await authenticate(transport, password);
    return await callback(transport);
  } finally {
    socket.destroy();
  }
}

async function authenticate(transport, password) {
  const initialOptions = { utf8Numbers: false, largeTagCount: false };
  const saltPacket = await transport.request(OPCODE.authRequest, [
    stringTag(TAG.clientName, 'aMule Modern UI'),
    stringTag(TAG.clientVersion, '1.0'),
    integerTag(TAG.protocolVersion, EC_PROTOCOL_VERSION, 8),
    encodeEcTag(TAG.canUtf8Numbers, 1, Buffer.alloc(0)),
    encodeEcTag(TAG.canLargeTagCount, 1, Buffer.alloc(0)),
  ], initialOptions);
  if (saltPacket.opcode !== OPCODE.authSalt) {
    throw new Error(searchError(saltPacket, 'aMule rejected the External Connections handshake.'));
  }
  transport.wireOptions = {
    utf8Numbers: (saltPacket.flags & 0x02) !== 0,
    largeTagCount: (saltPacket.flags & 0x10) !== 0,
  };

  const salt = tagInteger(getTag(saltPacket.tags, TAG.passwordSalt));
  const saltHash = createHash('md5')
    .update(salt.toString(16).toUpperCase(), 'utf8')
    .digest('hex');
  const passwordHash = createHash('md5')
    .update(password.toLowerCase() + saltHash, 'utf8')
    .digest();
  const authPacket = await transport.request(OPCODE.authPassword, [
    encodeEcTag(TAG.passwordHash, 9, passwordHash, [], transport.wireOptions),
  ]);
  if (authPacket.opcode !== OPCODE.authOk) {
    throw new Error(searchError(authPacket, 'aMule External Connections authentication failed.'));
  }
  transport.wireOptions = {
    utf8Numbers: (authPacket.flags & 0x02) !== 0,
    largeTagCount: (authPacket.flags & 0x10) !== 0,
  };
}

function getOptionalInteger(tags, name) {
  const tag = getTag(tags, name);
  return tag ? Number(tagInteger(tag)) : 0;
}

function parseServerTag(tag) {
  if (tag.type !== 8 || tag.data.length !== 6) {
    throw new Error('aMule returned an invalid server address.');
  }
  const ip = [...tag.data.subarray(0, 4)].join('.');
  const port = tag.data.readUInt16BE(4);
  const name = tagString(getTag(tag.children, TAG.serverName)) || ip;
  return {
    ip,
    port,
    name,
    ping: getOptionalInteger(tag.children, TAG.serverPing),
    users: getOptionalInteger(tag.children, TAG.serverUsers),
    usersMax: getOptionalInteger(tag.children, TAG.serverUsersMax),
    files: getOptionalInteger(tag.children, TAG.serverFiles),
    failed: getOptionalInteger(tag.children, TAG.serverFailed),
  };
}

function ipv4Tag(name, ip, port, options) {
  const octets = ip.split('.').map(Number);
  const data = Buffer.alloc(6);
  octets.forEach((octet, index) => data.writeUInt8(octet, index));
  data.writeUInt16BE(port, 4);
  return encodeEcTag(name, 8, data, [], options);
}

function ecCommandError(packet, fallback) {
  return searchError(packet, fallback);
}

export async function getAmuleServers() {
  return withAmuleEc(async (transport) => {
    const statePacket = await transport.request(OPCODE.getConnState);
    if (statePacket.opcode !== OPCODE.miscData) {
      throw new Error(ecCommandError(statePacket, 'Could not read aMule connection state.'));
    }
    const stateTag = getTag(statePacket.tags, TAG.connState);
    if (!stateTag) {
      throw new Error('aMule returned no connection state.');
    }

    const listPacket = await transport.request(OPCODE.getServerList);
    if (listPacket.opcode !== OPCODE.serverList) {
      throw new Error(ecCommandError(listPacket, 'Could not read the aMule server list.'));
    }

    const flags = Number(tagInteger(stateTag));
    const currentTag = getTag(stateTag.children, TAG.server);
    return {
      connected: (flags & 0x01) !== 0,
      connecting: (flags & 0x02) !== 0,
      kadConnected: (flags & 0x04) !== 0,
      kadRunning: (flags & 0x10) !== 0,
      currentServer: currentTag?.type === 8 ? parseServerTag(currentTag) : null,
      servers: listPacket.tags
        .filter((tag) => tag.name === TAG.server)
        .map(parseServerTag),
    };
  });
}

export async function connectAmuleServer(server) {
  return withAmuleEc(async (transport) => {
    const tags = server
      ? [ipv4Tag(TAG.server, server.address, server.port, transport.wireOptions)]
      : [];
    const response = await transport.request(OPCODE.serverConnect, tags);
    if (response.opcode !== 0x01) {
      throw new Error(ecCommandError(response, 'aMule could not connect to the server.'));
    }
  });
}

export async function disconnectAmuleServer() {
  return withAmuleEc(async (transport) => {
    const response = await transport.request(OPCODE.serverDisconnect);
    if (response.opcode !== 0x01) {
      throw new Error(ecCommandError(response, 'aMule could not disconnect from the server.'));
    }
  });
}

export async function addAmuleServer(server) {
  return withAmuleEc(async (transport) => {
    const options = transport.wireOptions;
    const response = await transport.request(OPCODE.serverAdd, [
      stringTag(TAG.serverAddress, `${server.address}:${server.port}`, options),
      stringTag(TAG.serverName, server.name, options),
    ]);
    if (response.opcode !== 0x01) {
      throw new Error(ecCommandError(response, 'aMule could not add the server.'));
    }
  });
}

export async function startAmuleKad() {
  return withAmuleEc(async (transport) => {
    const response = await transport.request(OPCODE.kadStart);
    if (response.opcode !== 0x01) {
      throw new Error(ecCommandError(response, 'aMule could not start Kad.'));
    }
  });
}

export async function stopAmuleKad() {
  return withAmuleEc(async (transport) => {
    const response = await transport.request(OPCODE.kadStop);
    if (response.opcode !== 0x01) {
      throw new Error(ecCommandError(response, 'aMule could not stop Kad.'));
    }
  });
}

export async function startAmuleSearch(search) {
  return withAmuleEc(async (transport) => {
    const options = transport.wireOptions;
    const children = [
      stringTag(TAG.searchName, search.query, options),
      stringTag(TAG.searchFileType, search.fileType || '', options),
    ];
    if (search.extension) {
      children.push(stringTag(TAG.searchExtension, search.extension, options));
    }
    if (search.availability > 0) {
      children.push(integerTag(TAG.searchAvailability, search.availability, 4, options));
    }
    if (search.minSize > 0) {
      children.push(integerTag(TAG.searchMinSize, search.minSize, 8, options));
    }
    if (search.maxSize > 0) {
      children.push(integerTag(TAG.searchMaxSize, search.maxSize, 8, options));
    }

    const searchType = { local: 0, global: 1, kad: 2 }[search.network];
    const request = encodeEcTag(
      TAG.searchType,
      4,
      integerData(searchType, 4),
      children,
      options,
    );
    const response = await transport.request(OPCODE.searchStart, [request]);
    if (response.opcode !== OPCODE.strings) {
      throw new Error(searchError(response, 'aMule could not start the search.'));
    }
    return { message: searchError(response, 'Search started.') };
  });
}

export async function getAmuleSearchResults() {
  return withAmuleEc(async (transport) => {
    const progressPacket = await transport.request(OPCODE.searchProgress);
    if (progressPacket.opcode !== OPCODE.searchProgress) {
      throw new Error(searchError(progressPacket, 'Could not read aMule search progress.'));
    }
    const rawProgress = getTag(progressPacket.tags, TAG.searchStatus);
    const progressValue = rawProgress ? Number(tagInteger(rawProgress)) : null;
    const progress = progressValue !== null && progressValue <= 100 ? progressValue : null;

    const resultsPacket = await transport.request(OPCODE.searchResults);
    if (resultsPacket.opcode !== OPCODE.searchResults) {
      throw new Error(searchError(resultsPacket, 'Could not read aMule search results.'));
    }
    const results = resultsPacket.tags
      .filter((tag) => tag.name === TAG.searchFile)
      .map((tag, index) => {
        const name = tagString(getTag(tag.children, TAG.partfileName));
        const size = tagInteger(getTag(tag.children, TAG.partfileSize));
        const hash = getTag(tag.children, TAG.partfileHash)?.data.toString('hex');
        const extension = name.includes('.') ? name.split('.').pop() : '';
        return {
          id: hash || `${index}:${name}`,
          name,
          sizeBytes: size.toString(),
          type: extension?.toUpperCase() || '—',
          sources: Number(tagInteger(getTag(tag.children, TAG.sourceCount))),
        };
      });

    return { progress, results };
  });
}

export async function stopAmuleSearch() {
  return withAmuleEc(async (transport) => {
    const response = await transport.request(OPCODE.searchStop);
    if (response.opcode !== OPCODE.miscData) {
      throw new Error(searchError(response, 'Could not stop the aMule search.'));
    }
  });
}
