"""Write item 183's briefs into the scratch home: (word, look, n, taken_for, picture).

jig/puppet drew nothing (the image tool refused it); jig/grandpa was added and drawn in its place.
"""
import os

HOME = r"C:\Code\wordwarriors-scratch\183_briefs"
os.makedirs(HOME, exist_ok=True)

TAIL = "Centred, instantly recognisable to a 5-year-old as {W}. NO TEXT, LETTERS OR NUMBERS anywhere: it is the answer to a reading question. Nothing else in the picture."

B = [
    ("helmet", "bike", 2, "a hat, or a knight",
     "one bright red-and-yellow kid's bicycle helmet on its own, seen from the side and a little above, its rounded shell with air vents and a little peak at the front, the black chin strap and buckle hanging down below it; plainly the hard helmet a child wears to ride a bike, not a cap or a hat"),
    ("helmet", "knight", 1, "a hat, or a knight",
     "one shiny silver knight's helmet on its own, standing on a little wooden stand, its visor down with eye slits and breathing holes, a red feather plume on top; only the empty helmet, no knight, no armour, no sword"),
    ("mat", "rollout", 2, "a puzzle or a rug (foam squares), then a door (a doormat at a front door)",
     "one long bright purple exercise mat lying flat on the floor, seen from above at an angle, its far end still rolled up in a fat roll, as if it is just being rolled out; thin and flat with neat edges, plainly a mat, not a rug, not a towel, not a carpet; no person on it"),
    ("mat", "gym", 1, "a puzzle or a rug (foam squares), then a door (a doormat at a front door)",
     "one thick soft blue gym mat for tumbling, lying flat on a shiny wooden floor, folded into three panels with one panel opened out, chunky and padded; plainly a mat, no person on it"),
    ("vase", "empty", 2, "flowers (the flowers filled the picture), then a jar or a pot",
     "one tall fancy curvy vase standing on its own, with a narrow neck, a round belly and a flared rim, painted with blue swirls on white china, completely empty, NO flowers at all; shiny, elegant and plainly a vase, not a jar, not a bottle, not a pot"),
    ("vase", "wobble", 1, "flowers (the flowers filled the picture), then a jar or a pot",
     "one tall empty blue china vase tipping and wobbling at the very edge of a little shelf, wobble lines around it, NO flowers; a funny moment just before it falls; plainly a vase"),
    ("rat", "street", 2, "a mouse (a small grey rodent with big ears)",
     "one big scruffy dark-grey street rat standing on all fours beside a metal trash can, a long pointed snout, whiskers, small ears, beady eyes and a very long bare pink tail curling behind it; big and long, as long as the trash can lid is wide; plainly a rat, not a cute little mouse, not a hamster, no cheese"),
    ("rat", "pet", 1, "a mouse (a small grey rodent with big ears)",
     "one big brown-and-white pet rat sitting up on its back legs in a cage with wood shavings, nibbling a sunflower seed in its front paws, a long thick pink tail on the floor; much bigger than a mouse, small ears; plainly a rat"),
    ("lamb", "leap", 2, "a sheep (the same picture as SHEEP)",
     "one tiny brand-new baby lamb leaping for joy in a spring meadow with daisies, all four knobbly legs off the ground, a little curly white fleece, a small soft face and floppy ears, a pink bow round its neck; small, young and bouncy, plainly a baby lamb, not a grown-up sheep, no other animals"),
    ("lamb", "mother", 1, "a sheep (the same picture as SHEEP)",
     "one tiny fluffy baby lamb standing in front of its mother sheep, the lamb big, bright and in the middle of the picture, the mother sheep behind it pale and smaller, partly out of the picture, nuzzling it; the little lamb is the point"),
    ("slam", "dunk", 2, "a punch (a fist on the ground), then a door",
     "one cartoon kid in a basketball vest jumping up and slam-dunking a basketball down through the hoop, hanging on the rim, the ball smashing through the net with a big burst of stars and motion lines; a huge powerful slam, centred"),
    ("slam", "table", 1, "a punch (a fist on the ground), then a door",
     "one big cartoon hand slamming flat down on a wooden table, with a burst of impact lines, the plates, a cup and a spoon on the table all jumping up into the air; a loud slam, no face"),
    ("fog", "fade", 2, "a cloud (fog drawn alone), then a lighthouse",
     "one quiet park path disappearing into thick grey fog: the nearest lamp post and bench are sharp and bright, the trees behind them fade to pale grey shapes, and the far trees vanish completely into the fog; low, thick and everywhere on the ground, no sky and no clouds; plainly a foggy day"),
    ("fog", "window", 1, "a cloud (fog drawn alone), then a lighthouse",
     "one window misted over with fog, a smiley face drawn in the fogged glass with a finger, the grey misty world outside barely showing through; plainly fog, no person"),
    ("tap", "kitchen", 1, "a sink, a drip, or a faucet, then a watering can",
     "one big shiny silver tap with a curved spout and a round handle, a hand turning the handle, a stream of water pouring out of the spout; only the tap, its handle and the water, no sink, no basin, no bucket, no can"),
    ("tap", "barrel", 1, "a sink, a drip, or a faucet, then a watering can",
     "one round wooden barrel lying on its side on a stand with a little brass tap at the front, the tap turned on and orange juice pouring out of it into a cup; the shiny tap is big and bright, the point of the picture"),
    ("tap", "finger", 1, "a sink, a drip, or a faucet, then a watering can",
     "one cartoon finger tapping on a window pane, two little tap-tap impact marks and short motion lines where the fingertip touches the glass, a curious cat on the other side looking up; a light little tap"),
    ("mug", "dad", 2, "a cup (a mug of cocoa)",
     "one huge chunky round-bellied mug of hot coffee held by a grown-up's big hand through its big thick handle, steam curling up; thick heavy sides and a big round handle, plainly a big mug, not a teacup, no saucer, no writing on it"),
    ("mug", "camping", 1, "a cup (a mug of cocoa)",
     "one blue speckled metal camping mug with a thick rolled rim and a big handle, hanging by its handle on a hook beside a campfire's little cooking pot; plainly a mug, not a teacup, no saucer"),
    ("glass", "stem", 2, "a cup, or water (a glass of water)",
     "one sparkling clear see-through glass on a tall thin stem with a round foot, empty, catching the light with white shine streaks and little twinkles; plainly made of glass, see-through, not a cup, no handle"),
    ("glass", "straw", 1, "a cup, or water (a glass of water)",
     "one tall clear see-through drinking glass with ice cubes and a bendy striped straw, the straw plainly seen through the glass, white shine streaks on its sides; see-through glass is the point, no handle"),
    ("jog", "turtle", 2, "running (a running boy)",
     "one chubby cheerful grown-up in a tracksuit and a sweatband jogging slowly, puffing, sweat drops flying, one bouncy slow step, and a little turtle in a tiny sweatband jogging beside him keeping up; slow, bouncy and puffing, not a fast run, no speed lines"),
    ("jog", "hippo", 1, "running (a running boy)",
     "one big friendly hippo in a sweatband and running shorts jogging slowly along a path, puffing and smiling, little bounce lines under its feet; a slow happy jog, not a fast sprint"),
    ("rush", "bus", 2, "running (wind blowing leaves), then a late kid at a door",
     "one cartoon kid rushing towards a yellow school bus whose doors are just closing, backpack bouncing, lunchbox flying, hair streaming back, speed lines and dust clouds behind; a big hurry, centred"),
    ("rush", "mum", 1, "running (wind blowing leaves), then a late kid at a door",
     "one frazzled grown-up rushing along in a big hurry with arms full of shopping bags, a phone, a coffee and a teddy bear slipping out, car keys in her mouth, a clock behind her, speed lines; a big rush"),
    ("bam", "drum", 2, "a hammer (a sound word drawn as a hammer), then a boxing glove",
     "one big red bass drum being whacked hard with a big drumstick, a huge jagged yellow-and-red comic-book burst with no letters exploding from the hit, the drum jumping off the floor; one loud BAM"),
    ("bam", "burst", 1, "a hammer (a sound word drawn as a hammer), then a boxing glove",
     "one big comic-book sound-effect burst on its own: a huge jagged star-shaped yellow-and-red explosion bubble, empty inside with NO letters, little stars and lines shooting out from it; the shape a cartoon makes for a loud BAM"),
    ("jab", "mitt", 2, "a punch (a boxing glove), then a kangaroo",
     "one cartoon kid in a red boxing glove throwing one quick short straight jab into a padded target mitt held up by a coach's hand at the edge of the picture, a little pop of stars at the mitt, the other glove guarding the chin; quick, small and straight"),
    ("jab", "poke", 1, "a punch (a boxing glove), then a kangaroo",
     "one cartoon finger jabbing quickly into a big wobbly pink jelly, the jelly wobbling with motion lines; one quick sharp jab"),
    ("plop", "icecream", 2, "a drip or a splash (a drop into a puddle), then a frog",
     "one round scoop of pink ice cream that has just plopped off its cone onto the pavement, landed in a soft blob with a little bounce line, the empty cone held above it by a small hand; the plop of it landing is the point"),
    ("plop", "pebble", 1, "a drip or a splash (a drop into a puddle), then a frog",
     "one round pebble plopping into a calm pond, a little round hole in the water with one small drop jumping up and two neat ripple rings; small and neat, no big splash"),
    ("twist", "jar", 2, "a tornado or spinning, then dancing",
     "two hands twisting the lid off a big jar of jam, curved arrows round the lid showing the twist, the hands gripping tight; the twisting is the point"),
    ("twist", "towel", 1, "a tornado or spinning, then dancing",
     "two hands twisting a wet stripy towel tight like a rope, water drips squeezing out, curved arrows showing the twist; the twisted towel is the point"),
    ("fin", "bigfin", 2, "a shark, then a clownfish (said as a fish, or as a film's fish)",
     "one friendly round purple fish with one huge sail-like fin on its back, far bigger than the fish itself, glowing gold with the light shining through it, a little sparkle on its tip; the giant fin is the point, NOT a shark, NOT a clownfish"),
    ("fin", "flipper", 1, "a shark, then a clownfish (said as a fish, or as a film's fish)",
     "one cartoon kid's swim-fin, a single bright yellow rubber diving fin for the foot, lying on its own at the edge of a pool, wide and flat with ribs; no shark, no fish"),
    ("hum", "lips", 2, "singing, then a bee",
     "one cartoon girl humming with her lips pressed tightly shut and her eyes closed, a happy face, little wavy vibration lines coming from her closed mouth and a few small music notes floating up; her mouth is clearly closed, NOT singing, not open"),
    ("hum", "dad", 1, "singing, then a bee",
     "one cheerful dad washing dishes at a sink, humming with his lips shut tight and cheeks a little puffed, wavy hum lines and small music notes floating from his closed mouth; mouth closed, not singing"),
    ("jig", "pirate", 2, "dancing, then a farm kid's dance",
     "one jolly cartoon pirate dancing a bouncy jig on top of a barrel on a ship's deck, one leg kicked up high, hands on hips, a little hop with bounce lines, music notes around; a jolly hopping jig"),
    ("jig", "puppet", 1, "dancing, then a farm kid's dance",
     "one wooden puppet on strings dancing a bouncy jig, its legs kicking up at funny angles, little bounce lines and music notes; a jolly jig"),
    ("jig", "grandpa", 1, "dancing, then a farm kid's dance",
     "one jolly cartoon grandpa in a flat cap and waistcoat dancing a quick bouncy jig, hopping on one foot with the other heel kicked out, arms swinging, little hop lines under his foot and a few music notes; a jolly hopping jig"),
    ("robot", "friendly", 3, "nothing yet: the bedroom already shows a blue boxy wind-up robot with a key in its back and a red nose, side-on, so this one must look different",
     "one friendly toy robot standing facing the viewer and waving one hand: a rounded white and bright orange body, a round dome head with a little antenna and a glowing light on top, a dark screen face with two big round happy eyes and a smile, chunky arms with claw hands, little wheels or chunky boots; NO wind-up key, not blue, not boxy; plainly a robot"),
]

for word, look, n, taken, pic in B:
    W = word.upper()
    head = f"A single clear picture of a {W.lower()}: {pic}."
    note = f" (The last pictures for {W} were taken for {taken}; this one must be named {W}.)" if word != "robot" else f" (Note: {taken}.)"
    text = head + note + " " + TAIL.format(W=W) + "\n"
    with open(os.path.join(HOME, f"183_{word}_{look}.txt"), "w", newline="\n") as f:
        f.write(text)
    print(f"{word} {look} {n}")
