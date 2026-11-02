#!/usr/bin/env python3
"""Create the complete V5.00.31 checksum manifest and deterministic ZIP."""
from __future__ import annotations
import hashlib
import zipfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
output=root.parents[1]/"KeySuite_V5.00.31_FULL_BUILD.zip"
manifest=root/"SHA256SUMS_V50031.txt"

def files():
    return sorted(p for p in root.rglob('*') if p.is_file() and p!=manifest and '__pycache__' not in p.parts and p.name!='.DS_Store')

manifest.write_text(''.join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root).as_posix()}\n" for p in files()),encoding='utf-8')
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for path in sorted([*files(),manifest]):
        info=zipfile.ZipInfo(path.relative_to(root).as_posix(),(2026,11,2,23,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=(path.stat().st_mode&0xFFFF)<<16
        archive.writestr(info,path.read_bytes())
print(f"{output}\n{output.stat().st_size} bytes\n{hashlib.sha256(output.read_bytes()).hexdigest()}")
