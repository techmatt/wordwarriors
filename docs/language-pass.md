# Language pass (2026-10-21, item 087): historical

Moved here from `docs/qa-findings.md` in item 132, unchanged. It is a one-off change log,
written for Matt to skim, and it is not kept up to date: many ids have since changed or
gone (Evil Ozymandias's rows, for one, were replaced when item 115 redesigned him).
`content/voice/script.ts` and `content/voice/lines.json` hold the lines as they are now.

Every line changed or added by the pass, old → new, for Matt to skim. `nar_*_<key>` is a
narrator template (the same text in all fifteen narrators' voices); `wake_*_<key>` both
wakers'. A `—` in Old is a new line: mostly variants (`<key>_2`... or `right_5`...) of a
line she hears several times an episode, now said in turn and carried on from one
episode to the next (`src/episode/lineVariants.ts`), so a repeat comes only after all
of them. Battle barks rotate too: a fighter says its least-said taunt, none more than
twice an episode, and a big move's name is called out once a battle. Move
and ultimate names (`move_`, `ult_`) are also banners. Ability and taunt ids did not
change.

| Line | Old | New |
| --- | --- | --- |
| `core_nobody` | No helper? I will help you then! | If nobody helps, I'll help you! |
| `move_julia_bounce_stomp` | Bounce Stomp! | Super Bounce! |
| `taunt_julia_evil_grr` | Grumpy time! | It's grumpy time! |
| `ult_julia_evil` | Tantrum Quake! | Mega Tantrum! |
| `move_julia_evil_no_nap` | No Nap Ever! | No Naps Ever! |
| `reformed_julia_share` | Sorry! I will share all my toys now. | Sorry, I will share all my toys now. |
| `reformed_julia_play` | Sorry! Let's all play together. | Sorry, let's all play together. |
| `move_ellie_bubble_trap` | Bubble Trap! | Bubble Cage! |
| `taunt_ellie_evil_snacks` | More snacks, now! | I want more snacks, right now! |
| `taunt_ellie_evil_scribble` | I scribble everywhere! | I'm scribbling on everything! |
| `taunt_ellie_evil_fast` | Too fast for you! | I'm way too fast for you! |
| `taunt_ellie_evil_raspberry` | A raspberry for you! | Here's a raspberry for you! |
| `move_ellie_evil_raspberry` | Raspberry Blast! | Giant Raspberry! |
| `reformed_ellie_bubbles` | Sorry! I made bubbles for everybody! | Sorry, I made bubbles for everybody! |
| `reformed_ellie_good` | Sorry! Ellie is good now. | Sorry, Ellie is good now. |
| `reformed_ellie_please` | More bubbles, please! | I want more bubbles, please! |
| `taunt_seraphina_fly` | Up we fly! | Let's fly up high! |
| `taunt_seraphina_hot` | Careful, they are hot! | Careful, my dragons breathe fire! |
| `move_seraphina_wing_gust` | Wing Gust! | Dragon Wind! |
| `taunt_seraphina_evil_mine` | All dragons obey me! | All the dragons obey me! |
| `taunt_seraphina_evil_burn` | Toasty time! | Time to get toasty! |
| `taunt_seraphina_evil_shadow` | From the shadows, dragons! | Come out of the shadows, dragons! |
| `taunt_seraphina_evil_scaly` | Scaly and scary! | My dragons are scaly and scary! |
| `reformed_seraphina_nice` | Oops! I am a nice dragon again. | Sorry, I promise I will be nice again. |
| `reformed_seraphina_dragons` | Sorry! My dragons will be good now. | Sorry, my dragons will be good now. |
| `reformed_seraphina_parties` | Dragons love parties! | My dragons love parties! |
| `taunt_dada_matt_strong` | Strong like a castle! | I'm as strong as a castle! |
| `move_dada_matt_hammer_spin` | Hammer Spin! | Hammer Swing! |
| `taunt_dada_matt_evil_smash` | Smash it all! | I'm going to smash it all! |
| `taunt_dada_matt_evil_mess` | What a big mess! | Look at the mess I made! |
| `taunt_dada_matt_evil_crumble` | Watch it crumble! | Watch it all crumble! |
| `taunt_dada_matt_evil_stomp` | Stomp, stomp, stomp! | Look out below! |
| `ult_dada_matt_evil` | Mega Hammer Quake! | Mega Hammer Smash! |
| `move_dada_matt_evil_wreck` | Wrecking Spin! | Wrecking Ball! |
| `move_dada_matt_evil_quake` | Quake! | Earthquake! |
| `reformed_dada_matt_fort` | Sorry, kiddo! Want to build a fort? | Sorry, kiddo, want to build a fort? |
| `reformed_dada_matt_walls` | Sorry, kiddo! I will fix every wall. | Sorry, kiddo, I'll put every wall back up. |
| `reformed_dada_matt_silly` | Sorry! Daddy got a bit silly. | Sorry, Daddy got a bit silly. |
| `taunt_dada_jason_chef` | Chef power, go! | Who's hungry? |
| `taunt_dada_jason_flip` | Flip, flip, hooray! | Look how high they fly! |
| `ult_dada_jason` | Breakfast Storm! | Raining Pancakes! |
| `taunt_dada_jason_evil_broccoli` | Broccoli for breakfast! | You get broccoli for breakfast! |
| `taunt_dada_jason_evil_soup` | Soup of the day is slime! | The soup of the day is slime! |
| `taunt_dada_jason_evil_fight` | Food fight! | Let's have a food fight! |
| `ult_dada_jason_evil` | Food Fight Frenzy! | Mega Food Fight! |
| `move_dada_jason_evil_hot_sauce` | Hot Sauce Blast! | Super Spicy Sauce! |
| `reformed_dada_jason_pancakes` | Sorry! Who wants pancakes? | Sorry, does anybody want pancakes? |
| `reformed_dada_jason_broccoli` | Sorry! No more broccoli for breakfast. | Sorry, no more broccoli for breakfast. |
| `reformed_dada_jason_dessert` | Sorry, kiddo! Today we will have dessert first. | Sorry, kiddo, today we will have dessert first. |
| `ult_elsa` | Blizzard Crown! | Sparkle Blizzard! |
| `move_elsa_crystal_spire` | Crystal Spire! | Crystal Tower! |
| `taunt_elsa_evil_winter` | Winter forever! | It will be winter forever! |
| `taunt_elsa_evil_cold` | So very cold! | It's so very cold in here! |
| `taunt_elsa_evil_icicles` | Icicles everywhere! | I'll hang icicles everywhere! |
| `ult_elsa_evil` | Eternal Winter! | Forever Winter! |
| `reformed_elsa_melt` | Sorry! Let me melt all the ice. | Sorry, I'll make all the ice go away. |
| `taunt_anna_again` | Again! Again! | Again, again! |
| `ult_anna` | Never Give Up! | Brave Heart Whirlwind! |
| `move_anna_leap` | Big Leap! | Giant Leap! |
| `taunt_anna_evil_blizzard` | Out of my blizzard! | Get out of my blizzard! |
| `reformed_anna_friends` | Sorry! Can we be friends again? | Sorry, will you be my friend again? |
| `reformed_anna_team` | Sorry! I am on your team now. | Sorry, I'm on your team now. |
| `reformed_anna_grouphug` | Group hug, everybody! | Everybody, come in for a group hug! |
| `taunt_jasmine_whoosh` | Too fast for you! | You'll never catch my carpet! |
| `taunt_jasmine_jewels` | Sparkle time! | Look at my jewels sparkle! |
| `taunt_jasmine_stars` | Fly to the stars! | Let's fly to the stars! |
| `move_jasmine_wind_fan` | Wind Fan! | Desert Wind! |
| `taunt_jasmine_evil_sand` | Sand in your shoes! | I'll put sand in your shoes! |
| `taunt_jasmine_evil_dust` | Dusty, dusty! | Everything is dusty now! |
| `taunt_jasmine_evil_swirl` | Swirl and twirl! | Watch me swirl and twirl! |
| `taunt_jasmine_evil_gone` | Gone with the wind! | The wind will blow you away! |
| `ult_jasmine_evil` | Great Sandstorm! | Giant Sandstorm! |
| `move_jasmine_evil_sand_blast` | Sand Blast! | Sand Spray! |
| `move_jasmine_evil_quicksand` | Quicksand Traps! | Quicksand! |
| `reformed_jasmine_sweep` | Sorry! I will sweep it all up. | Sorry, I'll sweep it all up. |
| `taunt_ozymandias_look` | Look upon my statues! | Come and see my statues! |
| `taunt_ozymandias_sand` | Rise, sand! | Rise up, sand! |
| `taunt_ozymandias_king` | King of the desert! | I rule the whole desert! |
| `taunt_ozymandias_pyramid` | Bigger than a pyramid! | I'm bigger than a pyramid! |
| `taunt_ozymandias_dust` | Dust to dust! | Sand, sand, everywhere! |
| `move_ozymandias_dune_slam` | Dune Slam! | Desert Smash! |
| `move_ozymandias_sun_disc` | Sun Disc! | Golden Sunbeam! |
| `taunt_ozymandias_evil_despair` | Look at me, and tremble! | Look at me and tremble! |
| `taunt_ozymandias_evil_sand` | Sand forever! | Sand will cover everything! |
| `taunt_ozymandias_evil_mighty` | Behold my mighty works! | Look how mighty I am! |
| `taunt_ozymandias_evil_crush` | I crush like sand! | I'll squash you like a sandcastle! |
| `ult_ozymandias_evil` | March of the Colossi! | Statue Stampede! |
| `move_ozymandias_evil_colossi` | Rise, Colossi! | Rise, Statues! |
| `move_ozymandias_evil_scarab_swarm` | Scarab Swarm! | Beetle Swarm! |
| `reformed_ozymandias_kings` | Sorry! Even kings say sorry. | Sorry, even kings say sorry. |
| `reformed_ozymandias_kind` | Sorry! I am a kind pharaoh now. | Sorry, I'm a kind pharaoh now. |
| `taunt_jormungandr_splash` | Splash time! | Time for a splash! |
| `ult_jormungandr` | World Wave! | Tidal Wave! |
| `move_jormungandr_tail_spin` | Tail Spin! | Tail Swipe! |
| `move_jormungandr_hug_coil` | Big Hug! | Snake Snuggle! |
| `taunt_jormungandr_evil_hungry` | So hungry for the sun! | I'm so hungry for the sun! |
| `taunt_jormungandr_evil_squeeze` | Squeeze, squeeze! | I'll squeeze you tight! |
| `taunt_jormungandr_evil_coil` | Coil, coil, coil! | I'll coil all around you! |
| `move_jormungandr_evil_serpent_spawn` | Serpent Spawn! | Snake Swarm! |
| `reformed_jormungandr_noodle` | Sorry! I was a grumpy noodle. | Sorry, I was a grumpy noodle. |
| `reformed_jormungandr_letgo` | Sorry! I will let go of the house. | Sorry, I'll let go of the house. |
| `taunt_smaug_fire` | Warm and toasty! | I'll keep you warm and toasty! |
| `taunt_smaug_shiny` | So shiny! | Look how shiny my gold is! |
| `move_smaug_wing_slam` | Wing Slam! | Dragon Smash! |
| `taunt_smaug_evil_mine` | My gold! All mine! | The gold is all mine! |
| `taunt_smaug_evil_fire` | I am fire and gold! | I'm made of fire and gold! |
| `taunt_smaug_evil_roar` | My treasure! | Don't touch my treasure! |
| `move_smaug_evil_inferno` | Inferno Breath! | Dragon Fire! |
| `move_smaug_evil_molten_gold` | Molten Gold Beam! | Melted Gold! |
| `move_smaug_evil_hot_coals` | Hot Coals! | Burning Coals! |
| `move_smaug_evil_tail_quake` | Tail Quake! | Tail Smash! |
| `reformed_smaug_treasure` | Sorry! You can share my treasure. | Sorry, let's share my treasure. |
| `reformed_smaug_gold` | Sorry! I don't need all the gold. | Sorry, I don't need all the gold. |
| `taunt_tiamat_sparkle` | Purple sparkles! | Here come purple sparkles! |
| `move_tiamat_wing_gust` | Wing Gust! | Mighty Gust! |
| `taunt_tiamat_evil_rules` | My rules, my house! | My house, my rules! |
| `move_tiamat_evil_dragon_babies` | Dragon Babies! | Baby Dragons! |
| `reformed_tiamat_crowns` | Sorry! You can all be kings and queens. | Sorry, let's all be kings and queens. |
| `taunt_scar_rocket` | Rocket hop! | Rocket boots, go! |
| `taunt_scar_core` | Core charging! | My core is charging up! |
| `taunt_scar_beep` | Beep boop, friend! | Beep boop, hello, friend! |
| `taunt_scar_gold` | Gold power! | Gold robot power! |
| `ult_scar` | Core Blast! | Core Cannon! |
| `move_scar_rocket_hop` | Rocket Hop! | Rocket Boost! |
| `taunt_scar_evil_core` | Core overload! | My core is full of power! |
| `taunt_scar_evil_stomp` | Rocket stomp! | Here come my rockets! |
| `ult_scar_evil` | Core Overload! | Robot Rampage! |
| `move_scar_evil_rocket_stomp` | Rocket Stomp! | Rocket Smash! |
| `reformed_scar_mess` | Beep boop! Sorry about the mess! | Beep boop, sorry about the mess! |
| `reformed_scar_good` | Beep, sorry! Scar is good now. | Beep, sorry, Scar is good now. |
| `reformed_scar_lights` | Sorry! I will switch the lights back on. | Sorry, I'll switch the lights back on. |
| `taunt_moriarty_magic` | Magic trick! | Want to see a magic trick? |
| `taunt_moriarty_cards` | So many cards! | I have so many cards! |
| `move_moriarty_decoys` | Decoys! | Copycats! |
| `move_moriarty_trick_trap` | Trick Trap! | Card Trick! |
| `move_moriarty_ta_da` | Ta-da Blink! | Vanishing Trick! |
| `taunt_moriarty_evil_clever` | I am too clever! | I'm too clever for you! |
| `taunt_moriarty_evil_puzzle` | Solve my puzzle! | Try to solve my puzzle! |
| `taunt_moriarty_evil_smoke` | Now you see me! | Now you see me, now you don't! |
| `ult_moriarty_evil` | Hall of Clones! | Mirror Maze! |
| `reformed_moriarty_sneaky` | Sorry! No more sneaky tricks. | Sorry, no more sneaky tricks. |
| `taunt_bavmorda_brew` | Bubble, bubble! | Bubble, bubble, in my cauldron! |
| `taunt_bavmorda_magic` | A little magic! | Here's a little magic! |
| `taunt_bavmorda_flowers` | Flowers for you! | I have flowers for you! |
| `taunt_bavmorda_evil_kneel` | Bow to the queen! | Bow down to me! |
| `taunt_bavmorda_evil_cauldron` | Into my cauldron! | Into my cauldron you go! |
| `ult_bavmorda_evil` | Everybody Pigs! | Piggy Polymorph! |
| `move_bavmorda_evil_skeleton_wave` | Skeleton Wave! | Skeleton Army! |
| `reformed_bavmorda_piggy` | Sorry! No more piggy spells. Well, maybe one. | Sorry, no more piggy spells, I promise! |
| `reformed_bavmorda_back` | Sorry! I will turn everybody back. | Sorry, I'll turn everybody back. |
| `taunt_rilla_bananas` | Bananas, go! | Here come the bananas! |
| `taunt_rilla_stomp` | Stomp, stomp, hooray! | Watch my giant feet! |
| `move_rilla_chest_drum` | Chest Drum! | Gorilla Thump! |
| `taunt_rilla_evil_peels` | Watch out for peels! | Watch out for banana peels! |
| `taunt_rilla_evil_drum` | Drum, drum, drum! | Hear me thump and roar! |
| `ult_rilla_evil` | Mega Chest Drum! | Gorilla Smash! |
| `move_rilla_evil_chest_shock` | Chest Drum Shockwave! | Thunder Thump! |
| `move_rilla_evil_peel_traps` | Banana Peel Traps! | Banana Peels! |
| `reformed_rilla_banana` | Sorry! Want a banana? | Sorry, do you want a banana? |
| `reformed_rilla_car` | Sorry! Rilla will not eat the car. | Sorry, Rilla will not eat the car. |
| `taunt_dada_matt_lifter_legs` | Lift with your legs! | Use your legs, not your back! |
| `taunt_dada_matt_lifter_muscles` | Muscles, go! | Look at these muscles! |
| `taunt_dada_matt_lifter_mountain` | Strong like a mountain! | I'm as strong as a mountain! |
| `move_dada_matt_lifter_dumbbell_spin` | Dumbbell Spin! | Dumbbell Whirl! |
| `move_dada_matt_lifter_mega_squat` | Mega Squat Slam! | Super Squat Smash! |
| `taunt_dada_matt_lifter_evil_weak` | Too weak, too weak! | You're too weak! |
| `taunt_dada_matt_lifter_evil_sweaty` | Sweaty hugs for all! | Sweaty hugs for everybody! |
| `taunt_dada_matt_lifter_evil_reps` | Ten more reps! | Give me twenty more! |
| `ult_dada_matt_lifter_evil` | Mega Muscle Quake! | Monster Muscles! |
| `move_dada_matt_lifter_evil_shake_splash` | Protein Shake Splash! | Protein Splash! |
| `move_dada_matt_lifter_evil_flex_quake` | Flex Quake! | Mega Flex! |
| `reformed_dada_matt_lifter_teddies` | Sorry! Want to lift teddies with me? | Sorry, want to lift teddies with me? |
| `reformed_dada_matt_lifter_jacks` | Sorry! No more jumping jacks. | Sorry, no more jumping jacks. |
| `reformed_dada_matt_lifter_rest` | Sorry, kiddo! Let's take a rest. | Sorry, kiddo, let's take a rest. |
| `taunt_dada_matt_cyber_hacking` | Hacking in! | I'm hacking in! |
| `taunt_dada_matt_cyber_tools` | Tools, go! | Hologram tools, go! |
| `taunt_dada_matt_cyber_code` | Code mode on! | Coding mode is on! |
| `ult_dada_matt_cyber` | Data Storm! | Pixel Storm! |
| `taunt_dada_matt_cyber_evil_deleting` | Deleting your fun! | I'm deleting all your fun! |
| `taunt_dada_matt_cyber_evil_glitch` | Glitch, glitch, glitch! | Everything is glitching! |
| `ult_dada_matt_cyber_evil` | System Crash! | Mega Glitch! |
| `move_dada_matt_cyber_evil_virus_blast` | Virus Blast! | Computer Virus! |
| `move_dada_matt_cyber_evil_glitch_jump` | Glitch Jump! | Glitch Teleport! |
| `move_dada_matt_cyber_evil_red_grid` | Red Hologram Grid! | Laser Grid! |
| `reformed_dada_matt_cyber_cartoons` | Sorry! I will only hack cartoons now. | Sorry, I'll only hack cartoons now. |
| `reformed_dada_matt_cyber_lights` | Sorry! I fixed all the lights. | Sorry, I fixed all the lights. |
| `reformed_dada_matt_cyber_friendly` | Beep, sorry! My system is friendly now. | Beep, sorry, my system is friendly now. |
| `taunt_dada_matt_blade_sword` | Sword and spell! | Sword and spell, together! |
| `taunt_dada_matt_blade_shine` | Blade, shine! | Shine bright, my sword! |
| `taunt_dada_matt_blade_muscles` | Magic and muscles! | I've got magic and muscles! |
| `move_dada_matt_blade_blade_spin` | Blade Spin! | Spinning Blade! |
| `taunt_dada_matt_blade_evil_hex` | Hex, hex, hex! | Here comes a curse! |
| `taunt_dada_matt_blade_evil_shadow` | Shadow magic! | Feel my shadow magic! |
| `ult_dada_matt_blade_evil` | Doom Rune Blast! | Dark Rune Storm! |
| `move_dada_matt_blade_evil_hex_bolts` | Hex Bolts! | Curse Bolts! |
| `reformed_dada_matt_blade_sparkle` | Sorry! Want to learn a sparkle spell? | Sorry, want to learn a sparkle spell? |
| `reformed_dada_matt_blade_toys` | Sorry! I will un-grump all the toys. | Sorry, I'll make all the toys happy again. |
| `reformed_dada_matt_blade_grumpy` | Sorry, kiddo! No more grumpy spells. | Sorry, kiddo, no more grumpy spells. |
| `taunt_dada_jason_warrior_bold` | Brave and bold! | Be brave and bold! |
| `move_dada_jason_warrior_axe_spin` | Axe Spin! | Spinning Axe! |
| `taunt_dada_jason_warrior_evil_past` | Nobody gets past! | Nobody gets past me! |
| `move_dada_jason_warrior_evil_shield_slam` | Shield Slam! | Shield Smash! |
| `reformed_dada_jason_warrior_knight` | Sorry! Let me be your brave knight! | Sorry, let me be your brave knight! |
| `reformed_dada_jason_warrior_snacks` | Sorry! The snacks are back! | Sorry, the snacks are back! |
| `reformed_dada_jason_warrior_axe` | Sorry, kiddo! I put my axe away. | Sorry, kiddo, I put my axe away. |
| `taunt_dada_jason_warlock_spell` | A spell for you! | I have a spell for you! |
| `move_dada_jason_warlock_piggy_hex` | Piggy Hex! | Oink Spell! |
| `taunt_dada_jason_warlock_evil_hex` | Hex, hex, everybody! | Everybody gets a curse! |
| `taunt_dada_jason_warlock_evil_darkness` | Darkness, come! | Let the darkness come! |
| `ult_dada_jason_warlock_evil` | Big Purple Doom! | Lights Out! |
| `move_dada_jason_warlock_evil_hex_trap` | Hex Trap! | Sneaky Curse! |
| `reformed_dada_jason_warlock_trick` | Sorry! Want to see a sparkly trick? | Sorry, want to see a sparkly trick? |
| `reformed_dada_jason_warlock_toads` | Sorry! No more toads, I promise. | Sorry, no more toads, I promise. |
| `reformed_dada_jason_warlock_curses` | Sorry, kiddo! I will undo my curses. | Sorry, kiddo, I'll undo my curses. |
| `wake_*_up_3` | Good morning, it is time to get up! | Good morning, it's time to get up! |
| `nar_*_right_3` | Yes! That is it! | That's the one! |
| `nar_*_right_5` | — | Wow! You read that all by yourself! |
| `nar_*_right_6` | — | You're a reading star! |
| `nar_*_right_7` | — | That's right! Well done! |
| `nar_*_right_8` | — | You got it! |
| `nar_*_wrong_2` | Not that one, silly! | That's not the one! Try again! |
| `nar_*_wrong_4` | Silly me, wrong way! Try again! | You were so close! Let's try another one! |
| `nar_*_wrong_5` | — | Oops, that's a different one! Try again! |
| `nar_*_wrong_6` | — | That's not it, but I know you'll find it! |
| `nar_*_battle2_start` | It's round two, and we are ready now! | It's round two, and this time we're ready! |
| `nar_*_move_pick_2` | — | It's your move! Pick one! |
| `nar_*_move_pick_3` | — | Which move should we do? |
| `nar_*_move_pick_4` | — | Let's pick a move! |
| `nar_*_move_great_2` | — | Your reading made that move super strong! |
| `nar_*_move_great_3` | — | You read it, and look how strong it is! |
| `nar_*_move_great_4` | — | Your word powered it up! Way to go! |
| `nar_*_move_great_5` | — | Did you see that? Your reading did that! |
| `nar_*_move_great_6` | — | Reading makes us stronger! Keep it up! |
| `nar_*_retreat_1` | They are too strong for us! Let's go back and get ready! | They're too strong for us! Let's go home and get ready! |
| `nar_*_finish` | Now let's all finish it together! | Let's finish this together! |
| `nar_*_victory_1_2` | — | We did it! We won! |
| `nar_*_victory_1_3` | — | Hooray, we won! Let's look at what you read! |
| `nar_*_victory_2_2` | — | You're the best Word Warrior ever! |
| `nar_*_victory_2_3` | — | Look at all that reading! You are a real Word Warrior! |
| `nar_*_house_doors` | There are two doors! Walk to one, and press green. | Pick a door! |
| `nar_*_house_doors_2` | — | Let's pick a door! |
| `nar_*_house_doors_3` | — | Which door do you want? |
| `nar_*_house_doors_4` | — | Where should we go? Pick a door! |
| `nar_*_house_more` | There is one more door to go! | One more door to go! |
| `nar_*_house_more_2` | — | Now let's try the other door! |
| `nar_*_house_more_3` | — | We have one door left! |
| `nar_*_house_more_4` | — | Let's do the last door! |
| `nar_*_house_ready` | We are ready now! Let's go out the front door! | We're ready! Let's go out the front door! |
| `nar_*_room_listen_2` | — | Let's listen! |
| `nar_*_room_listen_3` | — | Here's a new one! Listen! |
| `nar_*_room_listen_4` | — | Listen to this one! |
| `nar_*_room_your_turn_2` | — | Ready to read it? Press green! |
| `nar_*_room_your_turn_3` | — | You read this one! Press green. |
| `nar_*_room_your_turn_4` | — | Your turn to read! Press green. |
| `nar_*_room_find_2` | — | Where is it? Walk to it, and press green! |
| `nar_*_room_find_3` | — | Find the picture, and press green! |
| `nar_*_room_find_4` | — | Walk to the picture, and press green! |
| `nar_*_got_item_2` | — | That will help us in the fight! |
| `nar_*_got_item_3` | — | Yes, that's one more for the fight! |
| `nar_*_got_item_4` | — | Great, let's keep that! |
| `nar_*_use_bag_2` | — | Look what we brought! |
| `nar_*_use_bag_3` | — | Here's what we found in the house! |
| `nar_*_machine_change_2` | — | Let's change the first sound! What new word will it make? |
| `nar_*_machine_change_3` | — | Now swap the first sound for a new one! |
| `nar_*_machine_silly_4` | — | That's not a real word! Try another letter! |
| `nar_*_away_ready` | We are ready now! Let's go to the fight! | We're ready! Let's go to the fight! |
| `nar_*_charge_done` | Our spell is ready for the fight! | Our spell is all charged up! |
| `nar_*_charge_done_2` | — | The spell is ready! Let's take it to the fight! |
| `nar_*_use_runes` | Now let's use our spell power! | Now let's cast our spell! |
| `nar_*_bridge_slide_2` | — | Slide across, and stretch each sound! |
| `nar_*_bridge_again` | Slide across again! | Let's slide across again! |
| `nar_*_bridge_slide_3` | — | Let's slide across the stones! |
| `nar_*_bridge_say_2` | — | What word did the stones make? Say it! |
| `nar_*_bridge_say_3` | — | Put the sounds together! What word is it? |
| `nar_*_bridge_find_2` | — | Now find its picture! |
| `nar_*_bridge_find_3` | — | Where is the picture of that word? Walk to it! |
| `nar_*_bridge_next_2` | — | Look, here's another bridge! |
| `nar_*_bridge_done` | We crossed every bridge! Our things are ready for the fight! | We crossed every bridge! We're ready to fight! |
| `nar_*_bridge_done_2` | — | That was every bridge! Great job! |
| `nar_*_fight_sky_race_retreat` | They are too fast for us! Let's go and practice! | They're too fast for us! Let's go home and practice! |
| `nar_*_fight_sea_tug_start2` | Let's pull again! We are stronger now! | Let's pull again! We're stronger now! |
| `nar_*_fight_sea_tug_retreat` | They are too strong for us! Let's go and get ready! | They're too strong for us! Let's go home and get stronger! |
| `nar_*_fight_spell_clash_start` | It's magic against magic! Push the beam! | It's magic against magic! Let's push the beam! |
| `nar_*_fight_spell_clash_retreat` | That spell is too strong for us! Let's go back and get ready! | That spell is too strong for us! Let's go home and get ready! |
| `nar_*_fight_cook_off_retreat` | Their dish was too yummy! Let's go and practice! | Their dish was too yummy! Let's go home and practice! |
| `nar_*_fight_cook_off_finish` | Now let's add the topping, all together! | Let's add the topping, all together now! |
