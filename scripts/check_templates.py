import re, sys, pathlib

REQ = {
    "stack": {"definition", "concepts", "how-it-works", "my-usage", "pros-cons", "interview", "links"},
    "learn": {"overview", "checklist"},
    "projects": {"summary", "flow", "steps", "key-points", "interview", "links"},
}
HEAD = re.compile(r"^(#{2,3}) ")
ID = re.compile(r"\{\s*#([a-z0-9-]+)\s*\}\s*$")
errors = []
docs = pathlib.Path(sys.argv[1])
for md in sorted(docs.rglob("*.md")):
    rel = md.relative_to(docs)
    if rel.parts[0] == "superpowers":
        continue
    lines = md.read_text(encoding="utf-8").splitlines()
    h2 = set()
    fence = False
    for i, line in enumerate(lines, 1):
        if line.lstrip().startswith("```"):
            fence = not fence
        m = HEAD.match(line)
        if fence or not m:
            continue
        idm = ID.search(line)
        if not idm:
            errors.append(f"{md}:{i}: heading needs trailing '{{ #slug }}' (slug [a-z0-9-]+)")
            continue
        if m.group(1) == "##":
            h2.add(idm.group(1))
        elif rel.parts[0] == "interview" and rel.name != "index.md":
            nxt = next((l for l in lines[i:] if l.strip()), "")
            if not nxt.startswith("??? answer"):
                errors.append(f"{md}:{i}: first line under h3 must start with '??? answer'")
    top = rel.parts[0]
    if rel.name != "index.md" and top in REQ and (top == "stack" or len(rel.parts) == 2):
        missing = REQ[top] - h2
        if missing:
            errors.append(f"{md}:1: missing h2 ids: {', '.join(sorted(missing))}")
print("\n".join(errors))
sys.exit(1 if errors else 0)
