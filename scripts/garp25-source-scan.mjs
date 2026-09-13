#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const scanner=path.join(root,'security','garp25','tools','scan-deployment-leaks.mjs');
const r=spawnSync(process.execPath,[scanner,root,'--source'],{stdio:'inherit'});
process.exit(Number.isInteger(r.status)?r.status:1);
