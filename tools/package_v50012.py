from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT.parent / "KeySuite_V5.00.11"
OUT = ROOT.parent / "deliverables"
OUT.mkdir(exist_ok=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def included(path):
    rel = path.relative_to(ROOT)
    return (
        path.is_file()
        and not any(part in {".git", "node_modules", "__pycache__"} for part in rel.parts)
        and path.name != ".DS_Store"
        and path.name not in {"UPGRADE_MANIFEST_V50012.json", "SHA256SUMS_V50012.txt"}
        and not path.name.startswith(".env")
        and path.suffix not in {".pyc", ".zip", ".blend1"}
    )


files = {str(path.relative_to(ROOT)): path for path in ROOT.rglob("*") if included(path)}
changed = {
    name: {
        "sha256": sha(path),
        "baseline_sha256": sha(BASE / name) if (BASE / name).is_file() else None,
    }
    for name, path in sorted(files.items())
    if not (BASE / name).is_file() or sha(path) != sha(BASE / name)
}
baseline_files = {
    str(path.relative_to(BASE))
    for path in BASE.rglob("*")
    if path.is_file()
    and not any(part in {".git", "node_modules", "__pycache__"} for part in path.relative_to(BASE).parts)
    and path.name != ".DS_Store"
    and not path.name.startswith(".env")
    and path.suffix not in {".pyc", ".zip", ".blend1"}
}
deletions = sorted(baseline_files - set(files))

manifest = {
    "version": "5.00.12",
    "baseline": "5.00.11",
    "review_build": True,
    "production_deployed": False,
    "migration_applied": False,
    "deletions": deletions,
    "files": changed,
}
manifest_path = ROOT / "UPGRADE_MANIFEST_V50012.json"
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
files[manifest_path.name] = manifest_path

sum_lines = [f"{sha(path)}  {name}" for name, path in sorted(files.items()) if name != "SHA256SUMS_V50012.txt"]
sums_path = ROOT / "SHA256SUMS_V50012.txt"
sums_path.write_text("\n".join(sum_lines) + "\n")
files[sums_path.name] = sums_path

full = OUT / "KeySuite_V5.00.12_FULL_BUILD.zip"
upgrade = OUT / "KeySuite_V5.00.12_UPGRADE_from_V5.00.11.zip"
for target, selected in ((full, files), (upgrade, {name: files[name] for name in [*changed, manifest_path.name, sums_path.name]})):
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, path in sorted(selected.items()):
            archive.write(path, f"KeySuite_V5.00.12/{name}")
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(selected)
    print(f"{target}: {target.stat().st_size:,} bytes, {len(selected)} files, sha256 {sha(target)}")
print(f"Changed/new files: {len(changed)}; deletions: {len(deletions)}")
