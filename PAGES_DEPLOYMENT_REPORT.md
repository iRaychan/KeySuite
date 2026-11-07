# KeySuite Pages publishing correction

Prepared 7 November 2026. Repository: `iRaychan/KeySuite`. Audited baseline:
`3e071bf7d232faf3f70bd0537101a5c83d5438b6`, application **V5.00.47**.

**Status: packaging correction implemented and locally validated; production deployment has not been performed. The timeout is not yet confirmed resolved.**

## Findings and root-cause boundary

There was no `.github/workflows/` directory in the audited repository. Publishing used GitHub's generated `pages build and deployment` workflow, path `dynamic/pages/pages-build-deployment` (workflow ID 395148192). Its build logs show Jekyll input `.` and destination `./_site`; `actions/upload-pages-artifact@v3` uploaded `./_site`. Consequently repository documentation, source workbooks, authoring files, test evidence, database migrations and release tooling were published alongside the application. Jekyll also generated documentation HTML and theme CSS.

The verified packaging defect is publishing repository development material without a production boundary. The observed deployment failure occurred later, inside GitHub Pages file synchronization: the deploy action repeatedly reported `syncing_files` and then `Timeout reached, aborting!`. Build, artifact upload and build-status reporting succeeded.

**The evidence does not establish that artifact size caused the sync timeout.** The immediately preceding successful artifact was almost identical in size and deployed in 15 seconds. This correction reduces avoidable publication work, removes Jekyll from this already-static application, and serializes deployments; a real successful deployment remains the acceptance gate. If the smaller artifact still stalls, the remaining issue should be investigated with GitHub using the run/deployment IDs, rather than increasing the timeout.

## Deployment comparison

| Measure | Last successful deployment | Failed deployment | Proposed production artifact |
|---|---:|---:|---:|
| Run | [42271445278](https://github.com/iRaychan/KeySuite/actions/runs/42271445278) | [42334620313](https://github.com/iRaychan/KeySuite/actions/runs/42334620313) | Not deployed |
| Commit | `1f185670ea9ee433f05d9eac21b81b90a68c2b55` | `3e071bf7d232faf3f70bd0537101a5c83d5438b6` | Baseline plus publishing files only |
| Artifact ZIP bytes | 66,650,164 | 66,660,400 | 40,426,084 **local estimate** |
| Uncompressed regular-file bytes | 105,313,973 | 105,349,188 | 59,179,690 |
| Published regular files | 1,663 | 1,676 | 393 |
| Deploy duration | 15 seconds | 10 minutes 18 seconds | Pending |
| Outcome | Success | Failure | Pending |

The failed ZIP is 63.57 MiB (66.66 decimal MB). The proposed ZIP estimate is 38.55 MiB (40.43 MB). The estimate uses a GNU-format tar wrapped in ZIP/deflate level 6, matching the action's general packaging; runner metadata/order can change the exact compressed result. The actual uploaded artifact must be measured after CI. File count falls **76.55%** and uncompressed bytes fall **43.83%**.

The successful run started 6 November at 18:31:15 UTC; the failed run started 7 November at 03:34:23 UTC. Only 16 files changed between those commits, comprising the V5.00.47 family-registry correction and its documentation/tests/migration. Compressed size increased only 10,236 bytes. Across all 74 available Pages runs at inspection: 70 succeeded, one failed, three were queued. The available history therefore confirms one failure plus stalled queued runs, not multiple completed timeout failures. The queued runs were not cancelled or modified.

## Service limits and status

[GitHub's published limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) specify a 1 GB published-site limit and a ten-minute deployment timeout. The audited artifact is well below the size limit. No rate-limit response, artifact validation error or account restriction was reported in the failed deploy log. This is not a verification of account bandwidth usage or private GitHub restrictions.

[GitHub Status](https://www.githubstatus.com/) showed Pages operational and no reported incident on 7 November when checked. Its Actions/Pages degradation from 5 November 23:36 UTC to 6 November 00:20 UTC does not overlap this failed run. A public green status does not rule out a repository-specific service fault.

## Implementation

Only these deployment-support files need to be added:

- `.github/workflows/pages.yml`: build with `python3 tools/build_pages.py`, upload **only `_site/`**, retain a separate publication-audit artifact, then deploy using the existing `github-pages` environment. Pull requests build but cannot deploy. Main pushes/manual runs deploy. Production runs share the `pages` concurrency group and do not cancel an active file sync. No timeout increase is configured.
- `tools/build_pages.py`: `publish_reason()` defines the production boundary; `audit_references()` rejects exclusion of an existing local literal dependency; `main()` copies tracked runtime files without rewriting bytes and emits detailed inventories. It rejects symlinks and never follows untracked local archives into the website.
- `.gitignore`: excludes only the generated `_site/` and `_pages-report/` folders.
- This report documents application and rollback steps; it is not published.

Application scripts, HTML, selectors, configuration and data are unchanged. All 161 root JavaScript files are retained because versioned compatibility modules and the service-worker/bootstrap chains still reference older code. This fix does not attempt an unrelated JavaScript cleanup.

## Exact exclusions and retained dependencies

The evidence package contains `excluded-from-failed-artifact.json` with every excluded published path, size and original SHA-256. The following counts refer to the actual failed artifact, including Jekyll-generated files:

| Excluded group | Files | Bytes | Reason |
|---|---:|---:|---|
| Root documentation, historical manifests and review page | 738 | 4,003,176 | Development/release records and generated documentation |
| `source/` | 8 | 25,633,458 | Seven source workbooks and the 20,873,489-byte Blender authoring file; exported runtime data/models are retained |
| `tests/` | 363 | 14,412,378 | Test scripts, fixtures, screenshots, reports and five test-output PDFs |
| Non-browser `supabase/` files | 136 | 1,914,013 | Server implementation, migrations and verification SQL |
| `tools/` | 26 | 76,908 | Release/developer scripts |
| `avatar-build-tools/` | 5 | 9,431 | Avatar authoring tools |
| `proposals/` | 5 | 31,292 | Design proposals |
| KeyHQ architecture/generated documentation | 3 | 12,304 | Architecture notes and Jekyll-generated documentation; source license files are retained |
| Jekyll-generated `assets/css/style.css` | 1 | 76,559 | Documentation theme, not referenced by the application |

Total removed from the failed artifact: 1,285 files / 46,169,519 bytes. The new artifact additionally includes the unchanged source `CNAME` and an empty `.nojekyll` file, explaining the resulting count of 393. No ZIP/TAR/GZ/7Z archive was found inside the failed artifact. Historical release files were found; no separate nested full-build archive was found.

Preserved: every tracked file in `assets/`, all nine selector directories, `data/`, `vendor/`, all KeyHQ runtime code/models/images, vendor and avatar licenses, root application code/data/media, `config.js`, `sw.js`, `manifest.json`, version/release metadata, and the browser-used `supabase/functions/shared-*/*.js` files. These shared pump files are necessary even though they live under `supabase/`.

The 6,491,288-byte KeyHQ hybrid GLB, 1,899,016-byte original GLB and 3,594,523-byte campus reference image remain. Duplicate logos, dimension images and motor-data files are listed in `summary.json` and deliberately retain every runtime path. Embedded pump curves/data in selector HTML remain unchanged. No runtime PDF was removed; all five excluded PDFs were generated test evidence. PDF libraries and image resources remain available.

## Validation performed

- Production staging completed: 393 files / 59,179,690 bytes; 392 copied source files plus `.nojekyll`. All 392 copies match source SHA-256. The 391 retained files also present in the failed artifact match it byte-for-byte; `CNAME` was absent from that artifact and is copied unchanged from the repository.
- 533 existing local literal-reference edges checked; no existing referenced target excluded. Deliberately removing a shared BFI data file, KeyHQ reference image, jsPDF library or pump dimension image from the selected set caused the guard to reject the artifact.
- All 393 staged files returned HTTP 200 with matching bytes from a local server.
- Chrome loaded the main application, all nine selectors and KeyHQ: all 11 entry pages returned HTTP 200, with no JavaScript page errors. Main app reported V5.00.47 and 16 product families. Supabase requests were blocked; no live records were read or written by this browser test.
- One baseline issue was observed: `selector-bfi/favicon.png` returns 404. It is missing in both source and the original failed artifact; this patch does not introduce or fix that unrelated issue.
- The literal-reference scan reports 71 unresolved baseline strings, including dynamically prefixed image basenames, library examples, generated download filenames and the old service-worker entry replaced at runtime. These are recorded, not misreported as 71 actual network failures. The scan is not a full JavaScript parser; complete asset directories are retained to protect dynamic paths.
- Existing `tests/v50047-product-family-regression.cjs`: 31 checks passed. Workflow YAML parsed successfully. `git diff --exit-code` confirmed no tracked application file changes.
- No authenticated business-flow, production quotation/PDF, database migration or live deployment verification is claimed. This is packaging validation, not a complete application regression certification.

## Apply and deploy

1. Work from a current clone of `iRaychan/KeySuite`. Review any changes since the audited commit. Extract only the patch's `.github/workflows/pages.yml`, `tools/build_pages.py`, `.gitignore` and this report into the repository root. Preserve the hidden `.github` directory. Do not upload the evidence folder or the patch ZIP to the website.
2. If the current repository already has a `.gitignore` or a Pages workflow, merge these small additions rather than replacing unrelated settings or enabling two publishing workflows. The audited baseline had neither.
3. Run `python3 tools/build_pages.py`. Review `_pages-report/summary.json` and the published/excluded inventories. For this baseline the expected production count is 393. The excluded *repository* count can increase after adding this patch; that is expected because publishing tools/reports are intentionally excluded.
4. Commit the deployment-support files. Before deploying to production, change repository **Settings → Pages → Build and deployment → Source** from branch publishing to **GitHub Actions**. Preserve the current custom domain `suite.keylargo.com.my`, DNS, HTTPS and `github-pages` environment protections. This is the production publishing configuration change requiring the deployment decision.
5. Merge/push to `main`, or run **Publish KeySuite website** manually on `main`. Do not rerun the old generated Jekyll workflow. If old queued runs persist, inspect/cancel only superseded runs explicitly before starting the new deployment; never interrupt an active sync blindly.
6. Confirm build, upload and deployment all finish successfully. Record the new run URL and actual artifact ZIP size. Open the custom domain, confirm V5.00.47, and verify main navigation, selectors, pump curves/PDF generation and KeyHQ. Only then mark the timeout resolved. If the new run remains in `syncing_files`, capture its deployment ID and logs for GitHub Support.

## Rollback and preservation

Revert only this patch's deployment-support additions and restore the previous branch publishing source if rollback is needed; the application source is unchanged. Alternatively, rerun a previously successful deployment if its artifact remains available. Do not change DNS or Supabase as part of rollback.

No existing repository source file was deleted, renamed or edited. Exclusion affects the generated website only. V5.00.47, product data, prices, category records, customer assignments, calculation code and Supabase configuration/database remain unchanged by this task. **Production deployment outcome: pending.**
