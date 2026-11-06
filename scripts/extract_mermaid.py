import re, sys, pathlib

docs, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for f in out.glob("*.mmd"):
    f.unlink()
n = 0
for md in sorted(docs.rglob("*.md")):
    for m in re.finditer(r"^[ \t]*```mermaid[ \t]*\n(.*?)^[ \t]*```", md.read_text(encoding="utf-8"), re.S | re.M):
        n += 1
        (out / f"{n}.mmd").write_text(m.group(1), encoding="utf-8")
