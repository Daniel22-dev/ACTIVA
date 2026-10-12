#!/usr/bin/env node
import assert from 'node:assert/strict';
import { waitForChromiumPage } from './qa-cdp-target.mjs';
const url='http://127.0.0.1:9898/json';
let count=0;
const noWait=()=>Promise.resolve();
const fakePage={type:'page',webSocketDebuggerUrl:'ws://127.0.0.1:9898/devtools/page/1'};
const target=await waitForChromiumPage(async key => {
 assert.equal(key,url);
 count++;
 return count<3?[]:[{type:'service_worker',webSocketDebuggerUrl:fakePage.webSocketDebuggerUrl},fakePage];
},url,{attempts:5,delayMs:0,sleepFn:noWait});
assert.deepEqual(target,fakePage);
assert.equal(count,3);
await assert.rejects(waitForChromiumPage(async()=>[],url,{attempts:3,delayMs:0,sleepFn:noWait}),/did not appear/);
await assert.rejects(waitForChromiumPage(async()=>[{type:'page'}],url,{attempts:1,delayMs:0,sleepFn:noWait}),/did not appear/);
await assert.rejects(waitForChromiumPage(async()=>[{type:'page',webSocketDebuggerUrl:'file:///private'}],url,{attempts:1,delayMs:0,sleepFn:noWait}),/did not appear/);
await assert.rejects(waitForChromiumPage(async()=>null,url,{attempts:1,delayMs:0,sleepFn:noWait}),/did not appear/);
await assert.rejects(waitForChromiumPage(async()=>[],url,{attempts:0,delayMs:0,sleepFn:noWait}),/Invalid bounded/);
await assert.rejects(waitForChromiumPage(async()=>[],url,{attempts:200,delayMs:0,sleepFn:noWait}),/Invalid bounded/);
await assert.rejects(waitForChromiumPage(async()=>[],url,{attempts:1,delayMs:300,sleepFn:noWait}),/Invalid bounded/);
console.log(JSON.stringify({status:'PASS',cases:9,scope:'bounded Chromium target readiness'}));
