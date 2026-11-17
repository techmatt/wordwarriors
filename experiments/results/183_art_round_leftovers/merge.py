"""Trim art:alts' manifest for art_alts_183 to this round's candidates (briefs 183_*) and write the notes."""
import json, os, shutil, sys

REPO = r"C:\Code\wordwarriors-worktrees\wordwarriors\183_art_round_leftovers"
PICKS = os.path.join(REPO, "art-originals", "picks")
NAME = "art_alts_183"
man_path = os.path.join(PICKS, NAME + ".json")
m = json.load(open(man_path, encoding="utf-8"))

# What each word's earlier pictures were taken for (item 127's stored reason; 178's redraw that no one kept).
TAKEN = {
    "helmet": "178's three read as a hat or a knight. Matt: a kid's bicycle helmet as well as a knight's helm",
    "mat": "127: foam squares read as a puzzle or RUG; 178: a doormat at a front door",
    "vase": "127: the flowers filled the picture (FLOWERS); 178: a china vase with two flowers",
    "rat": "127: a big-eared grey rodent read as a mouse; 178: a big brown rat",
    "lamb": "127: the same picture as SHEEP; 178: a lamb drinking from a bottle",
    "slam": "127: a fist on the ground read as a punch; 178: a front door slamming",
    "fog": "127: fog alone is a cloud; 178: a lighthouse in fog",
    "tap": "127: a US child says faucet, read as SINK or DRIP; 178: a garden tap filling a watering can. Candidate 'finger' draws the other sense (tapping), for Matt to judge against the battle effect (a tap gushing water)",
    "mug": "127: a mug of cocoa is a CUP; 178: a chunky mug with a heart",
    "glass": "127: a glass of water is a CUP or WATER; 178: an empty shiny tumbler",
    "jog": "127: a running boy, RUN; 178: a grown-up jogging with a dog",
    "rush": "127: wind blowing leaves, WIND or RUN; 178: a kid rushing out of the door late",
    "bam": "127: a hammer; 178: a boxing glove's comic-book hit",
    "jab": "127: a boxing glove, PUNCH; 178: a kangaroo's jab",
    "plop": "127: a drop into a puddle, DRIP or SPLASH; 178: a frog onto a lily pad",
    "twist": "127: a tornado, TORNADO or SPIN; 178: a girl dancing the twist",
    "fin": "127: a shark fin, SHARK; 178: a clownfish",
    "hum": "127: read as singing; 178: a bee humming",
    "jig": "127: dancing shoes, DANCE; 178: a farm kid's jig",
    "robot": "new: ROBOT comes back as a word in item 184, so there is no pic_robot yet: `current` here is the bedroom's wind-up robot (obj_robot), shown only so the candidates can be told apart from it. A pick is promoted once 184 has added the word",
}

rows = []
for r in m["rows"]:
    word = r["id"].removeprefix("pic_")
    opts = [o for o in r["options"] if o["key"] == "current" or o.get("label", "").startswith("brief 183_")]
    for o in opts:
        if "label" in o:
            o["label"] = o["label"].removeprefix("brief 183_" + word + "_")
    if word == "robot":
        dst = os.path.join(PICKS, NAME, "pic_robot-current.png")
        shutil.copyfile(os.path.join(REPO, "public", "art", "obj_robot.png"), dst)
        opts[0] = {"key": "current", "image": f"{NAME}/pic_robot-current.png", "label": "the bedroom's wind-up robot, not a candidate"}
    n = len(opts) - 1
    if not 2 <= n <= 3:
        print(f"WARN {r['id']}: {n} candidates", file=sys.stderr)
    rows.append({
        "id": r["id"],
        "label": f"{word.upper()} ({r['id']})",
        "note": f"Before: {TAKEN[word]}. Each candidate is labelled with its brief's look. Keeping `current` changes nothing; a number is `npm run art:pick -- {r['id']} <number>` (and its brief goes into HAND).",
        "options": opts,
    })

out = {
    "name": NAME,
    "title": "Word pictures: 178's leftovers and ROBOT",
    "intro": "Fresh candidates for the words kept on `current` in art_alts_178 (no candidate read well), each from a new brief that names what the old picture was taken for, plus ROBOT for item 184. `current` is the game's picture now; numbers are candidates cut exactly as the game shows them. Select the one a 5-year-old names as the word, or nothing to keep `current`.",
    "rows": rows,
}
json.dump(out, open(man_path, "w", encoding="utf-8", newline="\n"), indent=2, ensure_ascii=False)
open(man_path, "a", encoding="utf-8", newline="\n").write("\n")

# Drop preview cuts of earlier rounds' candidates that this manifest does not show.
keep = {os.path.normpath(os.path.join(PICKS, o["image"])) for r in rows for o in r["options"]}
d = os.path.join(PICKS, NAME)
for f in os.listdir(d):
    p = os.path.normpath(os.path.join(d, f))
    if p not in keep:
        os.remove(p)
print(f"{len(rows)} rows, {sum(len(r['options']) - 1 for r in rows)} candidates")
