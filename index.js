#!/usr/bin/env node
'use strict'

const makePlugin = require('ilp-plugin')
const crypto = require('crypto')
const IlpPacket = require('ilp-packet')
const ILDCP = require('ilp-protocol-ildcp')
const { Writer } = require('oer-utils')

const DEFAULT_NUM_PREPARE = 4;

let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class Ping {
  constructor (deps) {
    this.conditionMap = new Map()
    this.plugin = makePlugin()
  }

  async init () {
    await this.plugin.connect()

    this.plugin.registerDataHandler(data => {
      const { executionCondition } = IlpPacket.deserializeIlpPrepare(data)

      const fulfillment = this.conditionMap.get(executionCondition.toString('base64'))
      if (fulfillment) {
        this.conditionMap.delete(executionCondition.toString('base64'))
        return IlpPacket.serializeIlpFulfill({
          fulfillment: fulfillment,
          data: Buffer.alloc(0)
        })
      } else {
        throw new Error('unexpected packet.')
      }
    })
  }

  async ping (destination) {
    const fulfillment = crypto.randomBytes(32)
    const condition = crypto.createHash('sha256').update(fulfillment).digest()
    const { clientAddress } = await ILDCP.fetch(this.plugin.sendData.bind(this.plugin))

    this.conditionMap.set(condition.toString('base64'), fulfillment)

    const writer = new Writer()

    writer.write(Buffer.from('ECHOECHOECHOECHO', 'ascii'))
    writer.writeUInt8(0)
    writer.writeVarOctetString(Buffer.from(clientAddress, 'ascii'))

    const start = process.hrtime();
    const result = await this.plugin.sendData(IlpPacket.serializeIlpPrepare({
      destination,
      amount: '100',
      executionCondition: condition,
      expiresAt: new Date(Date.now() + 30000),
      data: writer.getBuffer()
    }))
    const diff = process.hrtime(start);
    const latency = diff[0] * 1000 + diff[1] / 1000000
    const parsedPacket = IlpPacket.deserializeIlpPacket(result)

    return { parsedPacket, latency }
  }
}

require('yargs')
    .option('count', {
      alias: 'c',
      description: 'Stop after sending count number of packets'
    })
    .default('c', DEFAULT_NUM_PREPARE)
    .command('$0 <destination>', 'ping destination', {}, async argv => {
      console.log(`ILP-PING ${argv.destination}`);

      const p = new Ping();
      await p.init();

      var packetsFulfil = 0;
      var packetsError = 0;
      var measurements = []

      var i;
      for (i=0; i<argv.count; i++) {
        const {parsedPacket, latency} = await p.ping(argv.destination);

        if (parsedPacket.type === IlpPacket.Type.TYPE_ILP_FULFILL) {
          console.log(`ILP_FULFILL from ${argv.destination}: time=${latency}ms`)
          packetsFulfil++;
          measurements.push(latency)
        } else {
          console.log('Error sending ping. code=' + parsedPacket.data.code +
              ' message=' + parsedPacket.data.message + ' triggeredBy=' + parsedPacket.data.triggeredBy)
          packetsError++;
        }

        await sleep(1000)
      }

      const loss = packetsError/packetsFulfil;
      const average = (data) => data.reduce((sum, value) => sum + value, 0) / data.length;
      const min = Math.min(...measurements);
      const avg = average(measurements);
      const max = Math.max(...measurements);
      const diffs = measurements.map((value) => value - avg);
      const squareDiffs = diffs.map((diff) => diff * diff);
      const avgSquareDiff = average(squareDiffs);
      const mdev = Math.sqrt(avgSquareDiff);

      console.log(`\n--- ${argv.destination} ping statistics ---`);
      console.log(`${argv.count} ILP_PREPARE packets sent, ${packetsFulfil} ILP_FULFILL received, ${(loss*100).toFixed(1)}% packet loss`);
      console.log(`rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${mdev.toFixed(3)}`);

      process.exit(0)
    })
    .help()
    .argv;
