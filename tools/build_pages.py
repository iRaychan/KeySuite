#!/usr/bin/env python3
"""Stage the static KeySuite website without changing application source.

Run from any directory: python3 tools/build_pages.py
Only _site/ is published. _pages-report/ is a separate CI audit artifact.
Runtime directories are kept whole (except documentation), including dynamically
selected images and models. Older JS modules remain for bootstrap/SW compatibility.
"""
import hashlib
import json
import posixpath
import re
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
REPORT = ROOT / '_pages-report'
RUNTIME_DIRS = {'assets', 'data', 'keyhq', 'vendor', 'selector', 'selector-g1',
                'selector-cr', 'selector-kv', 'selector-bgf', 'selector-bsw',
                'selector-bfi', 'selector-es', 'selector-iso'}
ROOT_FILES = {'index.html', 'pump-pdf-report.html', 'manifest.json', 'CNAME', 'VERSION.txt', 'RELEASE.json',
              'KEYHQ_RELEASE.json', 'robots.txt', '404.html', 'favicon.ico'}
ROOT_SUFFIXES = {'.js', '.css', '.csv', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.pdf'}
TEXT_SUFFIXES = {'.js', '.css', '.html', '.json'}
DOC_SUFFIXES = {'.md', '.txt'}
# Recognize local literal URLs, including JS loaders and service-worker cache lists.
# Dynamic paths cannot be exhaustively inferred: their complete asset trees are kept.
URL_LITERAL = re.compile(r'''["'`]([^"'`\n<>]*?\.(?:js|css|html|json|png|jpe?g|svg|ico|pdf|glb|gltf|csv|xlsx|blend|sql|woff2?|ttf)(?:[?#][^"'`\n<>]*)?)["'`]''', re.I)


def publish_reason(name):
    path = Path(name)
    parts = path.parts
    if len(parts) == 1 and (name in ROOT_FILES or path.suffix.lower() in ROOT_SUFFIXES):
        return 'application entry, code, data or metadata'
    if parts[0] in RUNTIME_DIRS and (path.suffix.lower() not in DOC_SUFFIXES or 'LICENSE' in path.name.upper()):
        return 'complete runtime asset directory'
    if len(parts) >= 4 and parts[:2] == ('supabase', 'functions') and parts[2].startswith('shared-') and path.suffix == '.js':
        return 'browser-loaded shared pump data/core'
    return None


def exclusion_reason(name):
    first = name.split('/')[0]
    reasons = {'source': 'authoring originals; runtime data/models are exported separately',
               'tests': 'test harness, fixtures and generated evidence',
               'supabase': 'server functions, database migrations or verification SQL',
               'tools': 'developer/release/build tooling',
               'avatar-build-tools': 'avatar authoring tooling',
               'proposals': 'design proposals'}
    if first in reasons:
        return reasons[first]
    if first.startswith('.'):
        return 'repository configuration; not a website asset'
    return 'release documentation, historical manifest or review page'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit_references(selected, tracked):
    """Reject removal of an existing local literal target; record baseline misses.

    Check both document-root and module-relative paths because classic scripts
    resolve URLs against the page while ES imports resolve against their module.
    This is a conservative packaging check, not a full JS parser or browser test.
    """
    missing, excluded, checked = set(), set(), set()
    for name in sorted(selected):
        if Path(name).suffix not in TEXT_SUFFIXES or name in {'RELEASE.json', 'KEYHQ_RELEASE.json'}:
            continue
        source = (ROOT / name).read_text(encoding='utf-8')
        for match in URL_LITERAL.finditer(source):
            literal = match.group(1)
            if '${' in literal or '\\' in literal:
                continue
            try:
                url = urlsplit(literal)
            except ValueError:
                continue
            if url.scheme or url.netloc:
                continue
            path = unquote(url.path)
            candidates = {posixpath.normpath(path.lstrip('/')),
                          posixpath.normpath(posixpath.join(posixpath.dirname(name), path))}
            existing = candidates & tracked
            if existing:
                for target in existing:
                    checked.add((name, target))
                    if target not in selected:
                        excluded.add((name, literal, target))
            elif re.match(r'^(?:\.?\.?/)?[\w./%-]+\.[\w]+$', path):
                missing.add((name, literal))
    if excluded:
        raise RuntimeError('Existing runtime references would be excluded:\n' +
                           '\n'.join(map(str, sorted(excluded))))
    return {'checked_edges': len(checked), 'excluded_existing_targets': [],
            'unresolved_literals_in_baseline': sorted(missing)}


def main():
    # Use tracked files plus this script; never accidentally publish local ZIPs,
    # credentials, node_modules, reports or files left over from another build.
    raw = subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', '-z'])
    tracked = set(raw.decode().split('\0')) - {''}
    selected = {name for name in tracked if publish_reason(name)}
    required = {'index.html', 'sw.js', 'config.js', 'manifest.json', 'CNAME',
                'keyhq/index.html', 'keyhq/campus/reference.png'}
    for folder in RUNTIME_DIRS:
        if folder.startswith('selector'):
            required.add(folder + '/index.html')
    if not required <= selected:
        raise RuntimeError('Missing required website files: ' + repr(required - selected))
    for name in tracked:
        if (ROOT / name).is_symlink():
            raise RuntimeError('Symlinks are not supported: ' + name)
    references = audit_references(selected, tracked)
    # These fixed output folders alone may be replaced; no source files are edited.
    for output in (SITE, REPORT):
        if output.is_symlink():
            raise RuntimeError('Output must not be a symlink: ' + str(output))
        if output.exists():
            shutil.rmtree(output)
        output.mkdir()
    included, excluded, duplicates = [], [], defaultdict(list)
    for name in sorted(tracked):
        source = ROOT / name
        row = {'path': name, 'bytes': source.stat().st_size}
        if name in selected:
            target = SITE / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            row['sha256'] = digest(source)
            if digest(target) != row['sha256']:
                raise RuntimeError('Copy changed bytes: ' + name)
            row['reason'] = publish_reason(name)
            included.append(row)
            duplicates[row['sha256']].append(name)
        else:
            row['reason'] = exclusion_reason(name)
            excluded.append(row)
    (SITE / '.nojekyll').touch()
    summary = {
        'source_commit': subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip(),
        'application_version': json.loads((SITE / 'RELEASE.json').read_text())['version'],
        'published_file_count': len(included) + 1,
        'published_bytes': sum(r['bytes'] for r in included),
        'generated_files': ['.nojekyll'],
        'excluded_tracked_file_count': len(excluded),
        'excluded_tracked_bytes': sum(r['bytes'] for r in excluded),
        'byte_identical_copies': len(included),
        'largest_published_files': sorted(included, key=lambda r: r['bytes'], reverse=True)[:20],
        'duplicate_runtime_paths_preserved': [v for v in duplicates.values() if len(v) > 1],
        'reference_audit': references,
    }
    for name, value in [('summary.json', summary), ('published-files.json', included),
                        ('excluded-files.json', excluded)]:
        (REPORT / name).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({k: v for k, v in summary.items()
                      if k not in {'largest_published_files', 'duplicate_runtime_paths_preserved', 'reference_audit'}}, indent=2))
    print('Existing local reference edges checked:', references['checked_edges'])
    print('Baseline unresolved literals (see report):', len(references['unresolved_literals_in_baseline']))


if __name__ == '__main__':
    main()
