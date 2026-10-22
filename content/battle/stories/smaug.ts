/**
 * Evil Smaug's story fight (item 107): all bluster about his gold. Part 1
 * (about 2.5 minutes): the boast, her fetched things, her gift move, his fire
 * breath (she hides behind a stone) and her answer to it, his gold guards
 * (she hops over), Dad's spinning attack while she sneaks to the hoard, his
 * tail smash (up on the ledge) and her answer, then the dive from the sky
 * that sends them home. Part 2 (shorter): fire from the sky, her answer, and
 * the dive again, stopped by the episode's counter-item.
 *
 * Lines say no bank word (tests/unit/storyFight.test.ts): "stone", not ROCK.
 */

import type { StoryScript } from './types.js';

/** Answers to his fire: water, mud, or blowing it back. */
const FIRE = ['wet', 'drip', 'mud', 'fan'];

export const SMAUG_STORY: StoryScript = {
  id: 'smaug',
  villain: 'smaug',
  spots: [
    // Behind the stone: she stands on its far side from him.
    { id: 'stone', x: 680, y: 610, prop: 'stone', propDx: 95, propDy: 25 },
    { id: 'ledge', x: 120, y: 610, lift: 130, prop: 'ledge' },
    // Up behind him, so she sneaks past to it; the pile stands behind her.
    { id: 'hoard', x: 860, y: 470, prop: 'hoard', propDy: -20 },
  ],
  splashes: [
    { id: 'fire', look: 'a huge comic-book burst of orange and yellow dragon fire with jagged edges', glyph: '🔥' },
    { id: 'tail', look: 'a huge comic-book impact burst with a dragon tail slamming down and cracks in the ground', glyph: '💥' },
    { id: 'spin', look: 'a huge comic-book whirlwind burst, swirling blue and white speed lines in a spinning circle', glyph: '🌀' },
    { id: 'dive', look: 'a huge comic-book burst of gold coins and sparkles exploding outward from the middle', glyph: '✨' },
  ],
  part1: [
    {
      id: 'boast',
      kind: 'talk',
      lines: [
        { who: 'villain', key: 'boast', text: "This is MY giant pile of gold! You'll never have any of it!", say: "This is my giant pile of gold, you'll never have any of it!" },
        { who: 'dad', key: 'boast_dad', text: "Smaug, all that gold is not just for you!", say: 'Smaug, all that gold is not just for you!' },
        { who: 'ally', key: 'boast_ally', text: "We came to beat you, Smaug!", say: 'We came to beat you, Smaug!' },
      ],
    },
    {
      id: 'fetched',
      kind: 'fetched',
      all: true,
      lines: [{ who: 'dad', key: 'fetched', text: 'Julia, show him what we found in the house!', say: 'Julia, show him what we found in the house!' }],
      after: [{ who: 'villain', key: 'fetched_after', text: 'Where did you find all that?', say: 'Where did you find all that?' }],
    },
    {
      id: 'gift',
      kind: 'counter',
      input: { kind: 'pad', answers: 'gift' },
      lines: [{ who: 'ally', key: 'gift', text: 'Now the new move I gave you!', say: 'Now the new move I gave you!' }],
      after: [{ who: 'villain', key: 'gift_after', text: 'Not my shiny scales!', say: 'Not my shiny scales!' }],
    },
    {
      id: 'fire',
      kind: 'attack',
      move: 'fire',
      big: 'fire',
      input: { kind: 'dodge', spot: 'stone' },
      lines: [
        { who: 'villain', key: 'fire', text: 'Nobody touches my gold! Feel my dragon fire!', say: 'Nobody touches my gold, feel my dragon fire!' },
        { who: 'dad', key: 'fire_dad', text: 'Quick, Julia! Hide behind the stone!', say: 'Quick, Julia, hide behind the stone!' },
      ],
      after: [{ who: 'dad', key: 'fire_after', text: 'He missed us! Good hiding, Julia!', say: 'He missed us! Good hiding, Julia!' }],
    },
    {
      id: 'fire_answer',
      kind: 'counter',
      input: { kind: 'pad', answers: FIRE },
      lines: [{ who: 'dad', key: 'fire_answer', text: "There's fire everywhere! Let's put it out!", say: "There's fire everywhere, let's put it out!" }],
      after: [{ who: 'villain', key: 'fire_answer_after', text: 'My fire! It went all fizzy!', say: 'My fire, it went all fizzy!' }],
    },
    {
      id: 'guards',
      kind: 'attack',
      move: 'guards',
      input: { kind: 'dodgePads', answers: ['hop', 'jump', 'skip', 'flip'] },
      lines: [
        { who: 'villain', key: 'guards', text: 'Gold guards! Get them!', say: 'Gold guards, get them!' },
        { who: 'ally', key: 'guards_ally', text: 'Here they come! Over them, Julia!', say: 'Here they come, over them, Julia!' },
      ],
      after: [{ who: 'villain', key: 'guards_after', text: 'My guards! They all fell over!', say: 'My guards, they all fell over!' }],
    },
    {
      id: 'sneak',
      kind: 'support',
      move: 'spin',
      big: 'spin',
      input: { kind: 'grab', spot: 'hoard' },
      lines: [{ who: 'dad', key: 'sneak', text: "I'll keep him busy! Julia, sneak over to his gold and take some!", say: "I'll keep him busy, Julia, sneak over to his gold and take some!" }],
      after: [
        { who: 'villain', key: 'sneak_after', text: 'Who touched my gold?', say: 'Who touched my gold?' },
        { who: 'dad', key: 'sneak_dad', text: 'That gold is for sharing now!', say: 'That gold is for sharing now!' },
      ],
    },
    {
      id: 'tail',
      kind: 'attack',
      move: 'tail',
      big: 'tail',
      input: { kind: 'dodge', spot: 'ledge' },
      lines: [
        { who: 'villain', key: 'tail', text: 'Give that back! Tail smash!', say: 'Give that back, tail smash!' },
        { who: 'ally', key: 'tail_ally', text: 'Up on the ledge, Julia, quick!', say: 'Up on the ledge, Julia, quick!' },
      ],
      after: [{ who: 'villain', key: 'tail_after', text: 'Oh no! My tail is stuck!', say: 'Oh no, my tail is stuck!' }],
    },
    {
      id: 'tail_answer',
      kind: 'counter',
      input: { kind: 'pad', answers: ['tug', 'grab', 'twist', 'trap'] },
      lines: [{ who: 'dad', key: 'tail_answer', text: 'His tail is stuck! Now is our chance!', say: 'His tail is stuck, now is our chance!' }],
      after: [{ who: 'villain', key: 'tail_answer_after', text: 'Let go of my tail! Let go!', say: 'Let go of my tail, let go!' }],
    },
    {
      id: 'dive',
      kind: 'ultimate',
      big: 'dive',
      lines: [{ who: 'villain', key: 'dive', text: 'Enough! Now watch this!', say: 'Enough, now watch this!' }],
      after: [
        { who: 'villain', key: 'dive_after', text: 'The gold is all mine! All mine!', say: 'The gold is all mine, all mine!' },
        { who: 'dad', key: 'dive_dad', text: "He's too strong for now! Back home, team! We'll be ready next time!", say: "He's too strong for now, back home, team, we'll be ready next time!" },
      ],
    },
  ],
  part2: [
    {
      id: 'back',
      kind: 'talk',
      lines: [
        { who: 'villain', key: 'back', text: 'You came back? My gold is still all mine!', say: 'You came back? My gold is still all mine!' },
        { who: 'dad', key: 'back_dad', text: "We're ready this time, Smaug!", say: "We're ready this time, Smaug!" },
      ],
    },
    { id: 'charged', kind: 'fetched' },
    {
      id: 'rain',
      kind: 'attack',
      move: 'rain',
      big: 'fire',
      input: { kind: 'dodge', spot: 'stone' },
      lines: [
        { who: 'villain', key: 'rain', text: 'Fire from the sky!', say: 'Fire from the sky!' },
        { who: 'ally', key: 'rain_ally', text: 'Behind the stone, Julia!', say: 'Behind the stone, Julia!' },
      ],
      after: [{ who: 'ally', key: 'rain_after', text: 'He missed again!', say: 'He missed again!' }],
    },
    {
      id: 'rain_answer',
      kind: 'counter',
      input: { kind: 'pad', answers: FIRE },
      lines: [{ who: 'dad', key: 'rain_answer', text: 'One more time! Put out his fire!', say: 'One more time, put out his fire!' }],
      after: [{ who: 'villain', key: 'rain_answer_after', text: 'Not again! My fire!', say: 'Not again, my fire!' }],
    },
    {
      id: 'finale',
      kind: 'finale',
      big: 'dive',
      lines: [
        { who: 'villain', key: 'finale', text: "Now I'll bury you all in gold!", say: "Now I'll bury you all in gold!" },
        { who: 'dad', key: 'finale_dad', text: "Julia! Now's the time for our secret thing!", say: "Julia, now's the time for our secret thing!" },
      ],
    },
  ],
};
