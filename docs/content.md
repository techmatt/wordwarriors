# Content: what to run, and adding characters

Everything is data; engine code only for a new ability `kind` or movement `style`.
Words, frames, bags and phonics rooms: `docs/content-words.md`; house, scenes, games,
fights, narrator lines and art: `docs/content-reference.md`.

After any content change, run:

```
npm run voice:lines        # lines.json from the data
npm run voice:build        # synthesise new or changed lines (needs uv + network)
npm run art:placeholders   # paint placeholders for new art ids, rewrite docs/art.md
npm run test:unit          # every derived voice id exists, roster completeness
```

## Matt says X → run Y

"The three commands" are `voice:lines`, `voice:build`, `art:placeholders`. "Words" is
`docs/content-words.md`, "reference" `docs/content-reference.md`.

| Matt says | Run |
| --- | --- |
| "add a character / ability / taunt" | a group file in `content/battle/roster/`, the three commands |
| "add words" / "add a move word" | a `BANK` entry in `content/phonics/bank.ts` (role `thing`, `action` or `both`), its brief in `PICTURES` (`content/art/prompts.ts`), its effect in `content/phonics/effects.ts` (words, "A word"), the three commands |
| "show me the new words" / "is X in the game?" | `?words=new` (`NEW_WORDS`, `src/rules/bank.ts`) or `?words=x,y` leans every draw to them; the grown-ups page's page 2 marks the newest NEW. Whether everything comes round: `npm run variety` (README, *Not tests*) |
| "Julia knows X" / "she doesn't know what X is" | remove / add `odd: true` on X's `BANK` entry (an odd word is never a picture to match) |
| "store X" / "X frustrates her" / "bring back X" | add / delete X's line, with its reason, in `STORED_WHY` (`content/phonics/bank.ts`): a stored word is never drawn, kept with its art and voice. Then `npm run bank:audit` (raise any target lowered for it), `npm test`, `npm run variety` (README, *Stored words*) |
| "more wake-up lines" / "another sorry for X" | `WAKE_LINES` in `content/voice/script.ts` (`up_<n>`, `good_<n>`, `door_<n>`, `WAKE_VARIANTS`); `reformed.sorry` / `.ending` on X in the roster; then `voice:lines`, `voice:build` |
| "add a sentence / frame" / "what X does in battle" | `FRAMES` in `content/phonics/sentences.ts`; X's effect in `content/phonics/effects.ts`; the three commands |
| "add a hub scene / quest line" | `HUB_SCENES` in `content/house/scenes.ts`; a quest's `lines` in `content/house/quests.ts` (reference, "A hub scene", "A quest"), the three commands |
| "X casts spells" / "X's gift should sound like a spell" | `CASTERS` in `content/house/scenes.ts`; `spell` on `BANK` entries marks spell-sounding words |
| "make it harder / easier" / "let the help fade" / "back to base" | `DIFFICULTY` in `src/config.ts` (1 base: every help ramp held at its start; 2; 3 all the way); shown on the grown-ups page |
| "longer / shorter words in X" (warm-up, bridge, word machine, charge) | `GRAB.maxUnits`, `BRIDGE.maxUnits`, `WORD_MACHINE.maxUnits`, `CHARGE.units` in `src/config.ts` (sound units: SH is one). No level gate otherwise |
| "she sees X too often" / "repeats too soon" | `VARIETY` in `src/config.ts` (`rotations`, `words`, `wordWeight`, `gameWeight`; `docs/episode.md`, *Variety across episodes*) |
| "add a bedroom / side room / villain mood" | `content/house/house.ts` or the villain's `house` in the roster, the three commands |
| "turn the pick screens back on" / "always the same cast" | `EPISODE_DEFAULTS` in `src/config.ts` (`pickScreens`, `randomCast: false`) |
| "Matt should wake her more / less often" | `CAST_ODDS` in `src/config.ts` |
| "switch X on / off" (in the random cast) | `ACTIVE_CAST` in `src/config.ts` (allies, villains; persons, a dad in all his forms) |
| "add a dad form" / "add a quest" / "add a minigame" | a roster entry with `person` ("A dad's form" below); `QUESTS` + `PLACES`; `MINIGAMES` (reference) |
| "give her an outfit for X" / "she should wear X with Y" | a record in `OUTFITS` (`content/battle/outfits.ts`, "An outfit" below), `art:placeholders`, then `art:alts`; its `fill` once the art is picked |
| "add a word family / silly word" / "more or fewer machine words" | `RIMES` in `content/phonics/families.ts` (then `voice:lines`, `voice:build`); `WORD_MACHINE` in `src/config.ts` |
| "add a victory scene" / "change what they say at the end" | `ENDINGS` in `content/house/endings.ts` (reference, "A victory scene"), the three commands, then `art:alts` |
| "give X a story fight" | a `StoryScript` in `content/battle/stories/` and a `kind: 'story'` style in `FIGHTS` (reference, "A story fight"), then the three commands |
| "make X a race / a cook-off" / "chef Jason should cook more" | `fight` on X in the roster; `fightNudge.chance` on `dada_jason` (reference, "A fight style") |
| "make it the chef episode" | `?ally=dada_jason` (Julia's chef outfit follows) |
| "here is real art for X" | copy it to `public/art/<id>.png` (ids in `docs/art.md`) |
| "here are my letter sound recordings" / "here is a recorder zip" | `npm run voice:import -- <zip>`, then `voice:build`; report each card installed or refused and why (`docs/recording.md`) |
| "longer / shorter charge words" / "a longer / shorter beat to say each sound back" / "a longer / shorter beat when the helper says it with her" | `CHARGE` in `src/config.ts` (`units`, `sayBackMs`, `soloBeatMs`) |
| "Dad should wait longer" / "go solo sooner when Dad isn't there" (Charge's read, the bridge's level 3) | `DAD_AWAY_MS` in `src/config.ts` |
| "a new gesture for X" / "X's rune should fire Y" | X's entry in `RUNES` (`content/phonics/runes.ts`: `gesture`, `move`); no voice commands (the gesture's `text` is not voiced) |
| "higher / floatier jumps" / "more or fewer shots" / "charge sooner" | `FREE_PLAY` in `src/config.ts` (`jump`, `maxShots`, `chargeMs`, `fullChargeMs`, `shotSpeed`, `shotLifeMs`) |
| "stop forcing the phonics room" | `FORCE_PHONICS_ROOM` in `src/config.ts` (both stay weighted entries, `CHARGE.weight`, `BRIDGE.weight`) |
| "Smaug's story fight more / less often" | `STORY_FIGHT` in `src/config.ts` (`afterOne`, `afterNone`: its chance after his episode with / without it; 0 and 0 never) |
| "the Shape-Shifter more / less often" | `SHIFTER_ROOM` in `src/config.ts` (`afterOne`, `afterNone`: its chance behind door b after an episode with / without it; 1 and 1 always) |
| "the rhyme room more / less often" / "more / fewer rhymes" | `RHYME` in `src/config.ts` (`weight` among door b's games; `rounds`, `minRounds`) |
| "rhyme room: sound it out less" | `RHYME.startLevel` (2: only on yellow); past the start level only with `DIFFICULTY` 2+ |
| "more / fewer bridge words" / "slower slide" | `BRIDGE` in `src/config.ts` (`words`, `slide`, `maxUnits`, `replays`, `startLevel`) |
| "the bridge needs pictures like X" | a familiar `BANK` thing starting like X (words, "The Stretchy Bridge's pictures"), the three commands, `art:gen` |
| "the warm-up is too hard / too easy" / "start new words at level N" | `GRAB.startLevel` (and `helpAfter`) in `src/config.ts`; past the start level only with `DIFFICULTY` 2+ |
| "for X I pick n" (from an `art_alts_*` sheet) | `npm run art:pick -- X n`, commit `public/art/X.png`; if it prints a brief, write it into X's roster `look` (or `HAND`) in the same commit |
| "try a new look for X" / "draw X as …" | a brief file in the scratch home (`C:\Code\wordwarriors-scratch`), then `npm run art:alts -- X --n=2 --brief=scratch/<name>.txt --sheet=art_alts_<item>_<name>` (`scratch/` means the scratch home; sheet and picker manifest go to `art-originals/picks/`; readonly; Matt picks) |

## A character (`content/battle/roster/`)

Group files (`family.ts`, `royals.ts`, `dragons.ts`, `oddballs.ts`, `dadForms.ts`) join
into `ROSTER` in `index.ts` in a fixed order that seeded draws read: a new character goes
at the end of its group (else of `dadForms.ts`) and moves the `plansGolden` draws. Also
there: `minions.ts`, `combos.ts`, `arenas.ts`, `dads.ts`, `abilities.ts` (`ab`, `ult`,
`MOVE_WORDS`). `content/battle/roster.ts` re-exports it all.

Random episodes draw it only once its id is in `ACTIVE_CAST` (`src/config.ts`);
`?ally=<id>` / `?villain=<id>` play it regardless. `size` sets its height beside her
(`castScale`, 0.7 to `CAST_SCALE_MAX` 1.7). A dad in any form stands his own height
everywhere (`ADULT_HEIGHTS`: Jason 1.44, Matt 1.33), each picture drawn
`height / ADULT_FILL[art]` tall. **New dad art needs its `ADULT_FILL` line** (head top to
soles, not hat or raised weapon, by eye on a 1% grid; `tests/unit/heights.test.ts`).

One `CharacterSpec`:

- `id`: lowercase, in every derived id (`char_<id>_good`, `taunt_<id>_evil_<key>`…);
  `description`: one sentence, an original archetype.
- `good` and `evil`, each a `FighterSpec`:
  - `displayName`; optional `sayName` (same word count) when edge-tts mispronounces:
    `voice:lines` respells the name in every line that says it. On `evil`, optional
    `bareName`, the name in sentences and narrator villain lines (EvilRilla is Rilla);
    default is the good side's `displayName`.
  - `look` (art brief), `palette` `[main, accent]`, `glyph` (placeholder emoji; no
    Emoji 13+, Windows 10 lacks them).
  - `style`: `hover | twirl | stomp | dodge | slither | blink | fly | march`; optional
    `mount` (`'carpet'` is drawn, any emoji works) and `trail`
    (`{ tint, shape: 'spark' | 'star' | 'smoke' | 'square' }`).
  - `speed` (px/s), `size` (1 person, 1.4 big, 1.8 giant), `hp` (cosmetic).
  - A rider drawn on its mount (Meryl): `box` (`{ w, h }`, display box), `muzzle`
    (`{ x, y }`, where bolts leave, shares from the bottom middle); `size` makes it fit
    (Meryl 1.7). `onFoot` briefs `char_<id>_foot` for cards, title, icons and walking
    (`cardArt`, `walkArt`); `face_<id>` is cut from it.
  - `abilities`: three or more (next section). At least two good abilities have `words`.
  - `ultimate`: floors the heroes in Part 1, countered in Part 2.
  - `taunts`: `{ key, text }`, short, no interjections ("Ha!" is an SFX). A homograph
    edge-tts misreads gets a `say` respelling ("Bow" said "Bough"); watch bow, wind,
    tear, read, live, lead.
- `reformed`: `{ sorry, ending }`, short kid-funny lines in its good voice once beaten,
  one of each per episode: a `sorry` ends the battle, an `ending` (said to friends at a
  party) plays in the victory scene. Voiced `reformed_<id>_<key>`.
- `counter`: its named counter item (`name`, `glyph`, `look`, `how`, `word`, optional
  `sayName`): reference, "The counter sentence".
- `arena`: a key of `ARENAS`; a new arena names its `ambience` there (a tinted particle
  falling or rising behind the fight).
- `house`: its mood as a villain (reference, "A villain's house mood").
- The parked Spell the Spell needs a CVC triple in `SPELL_WORDS`
  (`content/phonics/spelling.ts`).

Every character is a hero, an ally (a narrator: ~680 lines, `nar_<id>`, 6–8 MB of
untracked voice), a villain, and a sight word if in `SIGHT_WORDS`; it adds a
`sent_<frame>_<id>` per name-slot frame and wake-up lines. Add its speakers (`<id>`,
`<id>_evil`) to `content/voice/voices.json`; bump the roster count in
`tests/unit/rules.test.ts`.

## A dad's form (`person` in the roster)

A form is a whole character, not an outfit: a full `CharacterSpec` with
`person: 'dada_matt'` and a `form` name (`dada_matt_lifter`, `_cyber`, `_blade`;
`dada_jason_warrior`, `_warlock`; the person's own entry has the default form, `builder`).

- **Voice**: the person's speakers, no `voices.json` entry; narrator, wake-up and
  sentence lines and names are per person (`PERSONS`). Combos are per person too.
- **Art**: `char_<form>_good` / `_evil`, `face_<form>`, from the person's photo
  (`refFor`), starting from `MATT_FACE` / `JASON_FACE` (`roster/dads.ts`).
- **Casting**: `drawCast` gives each dad one form per episode in every role;
  `castId('dada_matt')` is it, and `castArt` / `castFace` use it.

To add one: the roster entry, an `ADULT_FILL` line, a `SPELL_WORDS` triple, a quest, hub
scenes, the three commands, `art:alts` for its images, counter item and decals. Keep
hyphens out of its lines (README, *Operational facts*).

## An ability (`AbilitySpec`)

`{ id, name, kind, cooldown, color, color2?, power, count?, glyph?, status?, minion?,
duration?, homing?, word?, words?, shout?, art?, upright?, pointed?, letters?, callout? }`,
written `ab(...)`; an ultimate is `ult(...)` (no cooldown). Kinds (`ABILITY_KINDS`,
`content/battle/types.ts`; one function each in `src/battle/abilities.ts`): `bolt beam
cone lightning slam spin dash summon polymorph freeze teleport clones trap rain shield
heal grow coil eclipse wave grid orbit`. Statuses: `freeze pig stun burn bubble`
(`bubble` floats the target off for `duration` s, then pops).

- `power` 1–3 scales damage, particles, shake; `shout: true` plays the "Ha!" SFX.
- `art`: an art id (or `fx_bubble`, tinted) instead of a glyph for bolts, rain, orbits;
  `upright: true` stops it spinning; `pointed: true` is an arrow with a ribbon trail.
- `letters: true` on a bolt silently spells, a tile per unit, a word she read this
  episode and on no pad to come (`src/rules/arrowLetters.ts`). `orbit` rings the caster
  with `count` for `duration` s, then flings them.
- `words`: flavour, bank action words (`MOVE_WORDS`) or POW and ICE. When a pad's word
  is one a teammate's ability answers to, that teammate fires the styled move; a
  helper's words are twice as likely to be the gift word.
- A big move (power 2+) is called out (voice and banner, `<name>!`) unless that says a
  move word on a pad still to come; a name holding a move word (Pig Curse) gets a
  `callout` that says none, or it is never called out while that word is on a pad.
- Melee kinds (`slam spin dash teleport`) carry the caster to the target in a brawl; in
  a contest stage they play in place and send their force across.

Minions: `MinionSpec` in `MINIONS`. Team combos: `ComboSpec` in `COMBOS` (`pair`, an
ability, optional `second` for the pair's second); other pairs use `DEFAULT_COMBO`.

## An outfit (`content/battle/outfits.ts`)

An outfit swaps a character's images (`char_<owner>_<id>`, `face_<owner>_<id>`) when the
cast matches (`OUTFITS.julia`'s chef: `when: { ally: ['dada_jason'] }`), from getting out
of bed on; asleep, the title and pick screens keep the default. A record holds `when`
(allies and/or villains, roster ids, so a dad's form counts), `skipTaunts`, the prompt
parts (`who`, `body`, `faceLook`, `glyph`) and `fill`. First match wins. Add: the record, `art:placeholders`, `art:alts` / `art:pick`.
**New outfit art needs its `fill`** (head to soles, measured like `ADULT_FILL`):
`outfitTall` (`src/rules/heights.ts`) draws her as tall as in her dress (`DRESS_FILL`);
`tests/unit/heights.test.ts` checks it. Anything shown after she wakes asks
`castArt(id)` / `castFace(id)` (`src/episode/Episode.ts`), never `charArt`.
