#!/usr/bin/env python3
import argparse, datetime as dt, hashlib, json, os, stat, tempfile, zipfile
from pathlib import Path

def build_time():
    epoch = os.getenv('SOURCE_DATE_EPOCH')
    if epoch:
        return dt.datetime.fromtimestamp(int(epoch), tz=dt.timezone.utc)
    raw = os.getenv('GHRAB_BUILD_TIME')
    if raw:
        return dt.datetime.fromisoformat(raw.replace('Z', '+00:00')).astimezone(dt.timezone.utc)
    raise SystemExit('GHRAB_BUILD_TIME or SOURCE_DATE_EPOCH is required for deterministic ZIP creation')

def zip_tree(root: Path, out: Path, when: dt.datetime):
    root = root.resolve(); out = out.resolve(); out.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in sorted(root.rglob('*'), key=lambda x: x.relative_to(root).as_posix()):
        if p.is_symlink(): raise SystemExit(f'symlink forbidden: {p}')
        if not p.is_file(): continue
        rel = p.relative_to(root).as_posix(); rows.append((rel, p.read_bytes()))
    stamp = (max(1980, when.year), when.month, when.day, when.hour, when.minute, when.second - when.second % 2)
    with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as z:
        for rel, data in rows:
            info = zipfile.ZipInfo(rel, stamp); info.create_system = 3; info.external_attr = (stat.S_IFREG | 0o644) << 16; info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    return {'status':'PASS','files':len(rows),'sha256':digest,'output':str(out)}

def selftest():
    when = dt.datetime(2026, 9, 12, 4, 0, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as td:
        t = Path(td); root=t/'root'; root.mkdir(); (root/'a.txt').write_text('alpha\n'); (root/'z').mkdir(); (root/'z'/'b.txt').write_text('beta\n')
        a=zip_tree(root,t/'a.zip',when); b=zip_tree(root,t/'b.zip',when); same=a['sha256']==b['sha256']
        (root/'a.txt').write_text('changed\n'); c=zip_tree(root,t/'c.zip',when); changed=c['sha256']!=a['sha256']
        status='PASS' if same and changed else 'FAIL'; print(json.dumps({'status':status,'byteIdenticalRebuild':same,'mutationChangesHash':changed},indent=2)); raise SystemExit(0 if status=='PASS' else 1)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root'); ap.add_argument('--out'); ap.add_argument('--selftest',action='store_true'); args=ap.parse_args()
    if args.selftest: selftest()
    if not args.root: raise SystemExit('--root is required')
    root=Path(args.root)
    if not root.is_dir(): raise SystemExit(f'root is not a directory: {root}')
    out=Path(args.out) if args.out else Path('release')/f"ACTIVA-{json.loads(Path('package.json').read_text())['version']}-SCHOOL-PAYLOAD.zip"
    print(json.dumps(zip_tree(root,out,build_time()),indent=2))
if __name__=='__main__': main()
