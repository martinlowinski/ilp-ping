# ILP ping [![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/ilp-ping.svg?style=flat
[npm-url]: https://npmjs.org/package/ilp-ping

> Command-line tool to send ILP test packets to a node

## Quick-start

Make sure you're running a local ILP provider. If you don't have one, take a look at [moneyd](https://github.com/sharafian/moneyd) or read the getting started guide on [interledger.org](https://interledger.org).

```
ilp-ping [options] <destination>

Options:
  --version      Show version number                                   [boolean]
  --count, -c    stop after sending count number of packets         [default: 4]
  --expiration   expiration duration of prepare packets         [default: 30000]
  --amount       amount used in prepare packets                   [default: 100]
  --destination  destination to ping
  --help         Show help                                             [boolean]
```

Example: `./index.js test.strata`

```sh
ILP-PING test.strata
ILP_FULFILL from test.strata: time=818.426845ms
ILP_FULFILL from test.strata: time=448.628763ms
ILP_FULFILL from test.strata: time=389.540506ms
ILP_FULFILL from test.strata: time=258.038767ms

--- test.strata ping statistics ---
4 ILP_PREPARE packets sent, 4 ILP_FULFILL received, 0.0% packet loss
rtt min/avg/max/mdev = 258.039/478.659/818.427/207.942
```

## Flow

From [interledger/rfcs/issues/433](https://github.com/interledger/rfcs/issues/433#issuecomment-439373183): Assuming Alice (ILP Address: `g.alice`) is sending a Ping to Bob (ILP Address: `g.bob`).

1. Alice generates a new random 32 byte value to use as a fulfilment (`F`) and generates the corresponding condition (`C`).
1. Alice constructs an ILP Prepare packet addressed to `g.bob` with:
   - a non-zero amount of her choice
   - an appropriate expiry (quite long as it must allow for two round trips along the route)
   - the condition `C`
   - a data payload consisting of
     - the ascii encoded text string `"ECHOECHOECHOECHO"`
     - the byte `0x00`
     - A return address (`g.alice`) as an OER encoded, variable length IA5 string (same as encoding used in the packet header)
1. Alice sends this packet out on the network
1. On receiving this packet, Bob (a connector) identifies that it is a Ping by the fact that it is addressed directly to his connector address (i.e. it has no tx or child suffix) and by the fact that the byte following the `"ECHOECHOECHOECHO"` prefix in the payload is `0x00`.
1. Bob DOES NOT immediately send an ILP Fulfill. Instead Bob creates a new ILP Prepare addressed to the address parsed from the payload with:
   - an amount equal to the amount received in the ILP Prepare
   - an expiry that is marginally smaller than the expiry on the ILP Prepare
   - the same condition `C`
   - a data payload consisting of
     - the ascii encoded text string `"ECHOECHOECHOECHO"`
     - the byte `0x01`
1. Bob sends this packet out on the network.
1. On receiving this packet, Alice identifies that it is a Pong by the fact that it is addressed to the address she used in the Ping.
1. Alice fulfills the packet using the fulfilment she generated at the beginning: `F`
1. On receiving the ILP Fulfill from Alice, Bob also fulfills the original Ping from Alice using the same fulfillment.

## Disclaimer

This software is in a very early stage, expect breaking changes.

The core ping functionality is based on [moneyd-gui](https://github.com/interledgerjs/moneyd-gui) and [connector.land](https://github.com/interledger/connector.land).
