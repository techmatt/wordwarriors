/**
 * Victory scenes (item 027): after battle 2, before the recap, the villain,
 * good again, does something nice with everyone who took part (the hero, the
 * ally, the dads there). One is drawn per episode, never last episode's, and
 * a scene that fits the cast is likelier (src/rules/endings.ts).
 *
 * Each scene is four short lines, by role, so it works for any cast:
 *   1. `open`, said by the host (the narrator: the ally, else the waking dad);
 *   2. the villain's own reformed line (`reformed[1]` in the roster, its good voice);
 *   3. `cheer`, said by the hero;
 *   4. `close`, said by someone else there (a dad, else the ally, else the host),
 *      or `fit`, said by that dad, when he is there in that form.
 * Every `open`, `cheer` and `close` is voiced for every person
 * (`end_<person>_<scene>_<key>`), `fit` only for its dad
 * (`end_<dad>_<scene>_fit`). No names in them: any cast can say them.
 *
 * Art ids derived here: `room_end_<id>` (the background) and `prop_end_<prop>`.
 * Positions are design pixels (1280×720), feet of the thing. A `front` prop is
 * drawn over the cast (the table they sit behind, the boat they sit in).
 */

export interface EndingLine {
  text: string;
  say?: string;
}

export interface EndingProp {
  id: string;
  /** Art brief. */
  look: string;
  glyph: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Drawn over the cast (they stand behind or in it), else under. */
  front?: boolean;
}

export interface EndingSpec {
  id: string;
  /** Placeholder emoji and colours for the background. */
  glyph: string;
  palette: [number, number];
  /** The background's art brief. */
  look: string;
  props: EndingProp[];
  /** Where the cast stands: feet line, the span they spread across, their height, and a gap nobody stands in (the campfire). */
  stand: { y: number; left: number; right: number; h: number; gap?: [number, number] };
  open: EndingLine;
  cheer: EndingLine;
  close: EndingLine;
  /** A dad's form (roster id) that fits the scene, and what he says when he is there in it. */
  fit?: { form: string } & EndingLine;
  /**
   * Villains (roster ids, forms included) who suit the scene, by their reformed
   * lines (Smaug's marshmallows, Dada Matt's fort) or by who they are (the sea
   * serpent on the lake): likelier with them.
   */
  villains: string[];
}

export const ENDINGS: EndingSpec[] = [
  {
    id: 'dessert',
    glyph: '🍰',
    palette: [0x8a4a3a, 0xffd8a0],
    look: 'A cosy family dining room in warm evening lamplight: striped wallpaper, a window with curtains, a sideboard and a hanging lamp, paper bunting and balloons for a party along the back wall. A wooden floor across the bottom. No table and no chairs in the middle: the game draws its own table there, so keep the middle of the room plain',
    props: [{ id: 'table', glyph: '🎂', look: 'A long wooden dining table seen from the front at eye level, with a white tablecloth hanging down at the front, and on top in the middle a big three-layer birthday cake with pink icing, strawberries and candles, plates of cupcakes and cookies either side. Just the table, no chairs', x: 640, y: 712, w: 900, h: 260, front: true }],
    stand: { y: 560, left: 300, right: 980, h: 180 },
    open: { text: 'Dessert time! Cake for everybody!', say: 'Dessert time, cake for everybody!' },
    cheer: { text: 'Yay! Come and sit with us!', say: 'Yay, come and sit with us!' },
    close: { text: 'This is the best party ever!' },
    fit: { form: 'dada_jason', text: 'I baked this cake just for you!' },
    villains: ['dada_jason', 'julia'],
  },
  {
    id: 'picnic',
    glyph: '🧺',
    palette: [0x4a8a3a, 0xbfe8ff],
    look: 'A sunny meadow on a summer day: a big blue sky with fluffy clouds, a big shady tree at the left edge, flowers, a little stream and soft hills far away. The grass across the lower half is open and empty for a picnic',
    props: [{ id: 'picnic', glyph: '🧺', look: 'A red-and-white checked picnic blanket spread on the ground seen at a low angle (a wide flat shape), with a wicker picnic basket, sandwiches, a jug of lemonade and a bowl of strawberries on it', x: 640, y: 690, w: 760, h: 170, front: true }],
    stand: { y: 600, left: 280, right: 1000, h: 170 },
    open: { text: 'Picnic time! Grab a sandwich!', say: 'Picnic time, grab a sandwich!' },
    cheer: { text: 'Yay! Come and sit on the blanket!', say: 'Yay, come and sit on the blanket!' },
    close: { text: 'Sharing is the best!' },
    fit: { form: 'dada_matt_cyber', text: 'My drone brought the sandwiches!' },
    villains: ['rilla', 'dada_matt_cyber'],
  },
  {
    id: 'mountain',
    glyph: '⛰️',
    palette: [0x6a7aa0, 0xd8f0ff],
    look: 'The very top of a friendly mountain on a bright clear day: a wide flat rocky summit across the lower half with a little flag on a pole at the right edge, and far below, a whole valley of tiny fields, a river, a little town and other snowy peaks under a big blue sky with a rainbow',
    props: [],
    stand: { y: 600, left: 260, right: 960, h: 175 },
    open: { text: 'We climbed all the way to the top!' },
    cheer: { text: 'Wow! I can see our house from here!', say: 'Wow, I can see our house from here!' },
    close: { text: 'Everybody, give a big wave!', say: 'Everybody, give a big wave!' },
    fit: { form: 'dada_matt_lifter', text: 'I carried the snacks all the way up!' },
    villains: ['seraphina', 'ozymandias', 'dada_matt_lifter'],
  },
  {
    id: 'fort',
    glyph: '🏰',
    palette: [0x6a4a8a, 0xffd0e8],
    look: 'A cosy living room at night lit by strings of fairy lights: a sofa against the back wall, a window with the moon outside, a bookshelf and a lamp, a soft rug across the floor in the lower half. The middle of the room is open: the game draws a pillow fort there',
    props: [{ id: 'fort', glyph: '🛋️', look: 'A big wide pillow fort seen from the front: a low wall of chunky colourful cushions and pillows in pink, blue, yellow and purple, a patterned blanket draped over the top like a roof at the back, fairy lights along the top and a little paper flag on a stick. The front wall is low so heads peek over it', x: 640, y: 712, w: 920, h: 250, front: true }],
    stand: { y: 580, left: 300, right: 980, h: 175 },
    open: { text: 'Pillow fort time! Everybody in!', say: 'Pillow fort time, everybody in!' },
    cheer: { text: 'Yay! There is room for everybody!', say: 'Yay, there is room for everybody!' },
    close: { text: 'Shh! It is our secret hideout!', say: 'Shh, it is our secret hideout.' },
    fit: { form: 'dada_matt', text: 'I built the biggest fort ever!' },
    villains: ['dada_matt', 'ellie'],
  },
  {
    id: 'boat',
    glyph: '⛵',
    palette: [0x3a7ab0, 0xbfe8ff],
    look: 'A calm sparkling blue lake on a sunny day seen from the side: gentle little waves across the whole lower half, a sandy shore with a little wooden jetty at the left edge, hills and fir trees and a big blue sky with fluffy clouds behind. The middle of the water is open and empty: the game draws its own boat there',
    props: [{ id: 'boat', glyph: '⛵', look: 'A big wide friendly wooden rowing boat seen side-on, painted red and white with a yellow stripe, a small mast with a striped sail, two oars resting in the oarlocks, a little round life ring hanging on the side. Empty: no one in it', x: 640, y: 690, w: 900, h: 240, front: true }],
    stand: { y: 600, left: 330, right: 950, h: 170 },
    open: { text: 'All aboard the boat!' },
    cheer: { text: 'Wheee! Splash, splash!', say: 'Wheee, splash, splash!' },
    close: { text: 'Look! A fish is waving at us!', say: 'Look, a fish is waving at us!' },
    fit: { form: 'dada_jason_warrior', text: 'I will be the captain! Row, row, row!', say: 'I will be the captain, row, row, row!' },
    villains: ['jormungandr', 'jasmine', 'dada_jason_warrior'],
  },
  {
    id: 'stars',
    glyph: '🔭',
    palette: [0x1a1a4a, 0x8a7ad8],
    look: 'A grassy hilltop at night under a huge starry sky: a big friendly full moon, swirls of the milky way, bright twinkly stars and one shooting star, a few fireflies, the dark soft hills of the hilltop across the lower half lit silver by the moon, a little town with glowing windows far away',
    props: [{ id: 'telescope', glyph: '🔭', look: 'A brass telescope on a wooden three-legged stand, pointing up at the sky, seen side-on', x: 1110, y: 640, w: 200, h: 240 }],
    stand: { y: 620, left: 240, right: 940, h: 175 },
    open: { text: 'Look up! So many stars!', say: 'Look up, so many stars!' },
    cheer: { text: 'I see a shooting star!' },
    close: { text: 'Let us all make a wish together!' },
    fit: { form: 'dada_jason_warlock', text: 'I made the stars twinkle extra bright!' },
    villains: ['moriarty', 'tiamat', 'bavmorda', 'dada_jason_warlock'],
  },
  {
    id: 'campfire',
    glyph: '🔥',
    palette: [0x1a2a3a, 0xff8a3a],
    look: 'A cosy forest clearing at dusk: tall friendly trees around the edges, an orange and purple sunset sky, the first stars, a striped tent at the far right edge, logs to sit on. The middle of the clearing is open: the game draws its own campfire there',
    props: [{ id: 'campfire', glyph: '🔥', look: 'A cheerful little campfire: a ring of round stones, crossed logs and bright orange-and-yellow flames with sparks, and three marshmallows on long sticks toasting over it', x: 640, y: 690, w: 260, h: 230 }],
    stand: { y: 640, left: 230, right: 1050, h: 175, gap: [500, 780] },
    open: { text: 'Campfire time! Who wants a marshmallow?', say: 'Campfire time, who wants a marshmallow?' },
    cheer: { text: 'Yay! Toasty, gooey marshmallows!', say: 'Yay, toasty, gooey marshmallows!' },
    close: { text: 'Now, campfire songs, everybody!' },
    fit: { form: 'dada_matt_blade', text: 'My sword is a marshmallow stick now!' },
    villains: ['smaug', 'dada_matt_blade'],
  },
  {
    id: 'snow',
    glyph: '⛄',
    palette: [0x8ab0e0, 0xffffff],
    look: 'A snowy hillside on a bright winter day: soft deep snow across the lower half, snowy pine trees and a little wooden cabin with smoke from its chimney at the edges, a pale blue sky with gentle falling snowflakes. The middle of the snow is open and empty',
    props: [{ id: 'snowman', glyph: '⛄', look: 'A big round happy snowman: three snowballs, coal eyes and smile, a carrot nose, a red-and-white striped scarf, a little black top hat and stick arms waving', x: 1100, y: 650, w: 200, h: 260 }],
    stand: { y: 640, left: 230, right: 930, h: 175 },
    open: { text: 'A snow day! Look at our snowman!', say: 'A snow day, look at our snowman!' },
    cheer: { text: 'Yay! I love his carrot nose!', say: 'Yay, I love his carrot nose!' },
    close: { text: 'Everybody, make a snow angel!' },
    villains: ['elsa'],
  },
];

export const ENDING_BY_ID: Record<string, EndingSpec> = Object.fromEntries(ENDINGS.map((e) => [e.id, e]));

export const endingArt = (id: string) => `room_end_${id}`;
export const endingPropArt = (prop: string) => `prop_end_${prop}`;
