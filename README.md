# ILP-PING

> Command-line tool to send ILP test packets to a node

## Quick-start

Make sure you're running a local ILP provider. If you don't have one, take a look at [moneyd](https://github.com/sharafian/moneyd) or read the getting started guide on [interledger.org](https://interledger.org).

```
index.js <destination>

ping destination

Options:
  --version    Show version number                                     [boolean]
  --count, -c  Stop after sending count number of packets           [default: 4]
  --help       Show help                                               [boolean]
```

Example: `./index.js test.strate`

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
