"""Build a Foundry release ZIP using only the standard library."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent
manifest = json.loads((root / "module.json").read_text())
dist = root / "dist"
dist.mkdir(exist_ok=True)
with ZipFile(dist / "pf2e-fated-attack.zip", "w", ZIP_DEFLATED) as archive:
    for name in ("module.json", "scripts/fated-attack.js", "README.md"):
        archive.write(root / name, name)
(dist / "module.json").write_text((root / "module.json").read_text())
with ZipFile(dist / "pf2e-fated-attack.zip") as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read("module.json")) == manifest
    assert all(path in archive.namelist() for path in manifest["esmodules"])
print("PASS: release ZIP and manifest validated")
