# Constrained Application Protocol (CoAP) Resource Directory (RD)

__coap-rd__ is a server library for CoAP Resource Directory.  
While it can work as a stand alone RD server, it is designed
to be used as a Node RED module together with 
__node-red-contrib-coap-rd__.

  * <a href="#intro">Introduction</a>
  * <a href="#install">Installation</a>
  * <a href="#running">Running as a standalone server</a>
  * <a href="#basic">Basic Example</a>
  * <a href="#api">API</a>
  * <a href="#contributing">Contributing</a>
  * <a href="#licence">Licence &amp; copyright</a>

[![NPM](https://nodei.co/npm/coap-rd.png)](https://nodei.co/npm/coap-rd/)
[![NPM](https://nodei.co/npm-dl/coap-rd.png)](https://nodei.co/npm/coap-rd/)

<a name="intro"></a>
## Introduction

What is CoAP Resource Directory?
Constrained Application Protocol (CoAP) is a software protocol
intended to be used in very simple electronics devices that allows them
to communicate interactively over the Internet. -  Wikipedia

CoAP Resource Directory is a server where the devices that talk
CoAP can register themselves at so that other devices in the network
can find them without manual configuration.

This library follows:
* [draft-11](https://tools.ietf.org/html/draft-ietf-core-resource-directory-11)
  of CoAP RD.

It does not implement the CoAP protocol but uses
[node-coap](http://github.com/mcollina/node-coap) instead.

**coap-rd** is an **OPEN Open Source Project**.
See the <a href="#contributing">Contributing</a> 
section to find out what that means.

<a name="install"></a>
## Installation

```
$ npm install --save coap-rd
```

<a name="running">
## Running as a standalone server

```
$ node coap-rd
```

<a name="basic"></a>
## Basic Example

```
    const RD = require('coap-rd');
	RD.on('register', (ep) => console.log("New EP: " + ep));
    RD.createServer({ domain: 'local' });
```
