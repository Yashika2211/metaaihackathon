import { Vector2 } from 'three';
import type { Bird } from '../creatures/bird';
import type { Rabbit } from '../creatures/rabbit';
import { FENCE_X, GROUND_Y, OWL_PERCH, TUNNEL } from '../scenery/backdrops';
import type { FableDef } from './types';

const LEFT_BANK = -0.27;
const RIGHT_BANK = 0.27;
const LUMI_Y = GROUND_Y + 0.05;

/**
 * "The Firefly Who Lost Her Light" — an original fable in four short beats.
 * Every creature gets one moment: bird, rabbit, dog, snail.
 */
export const fireflyFable: FableDef = {
  id: 'firefly',
  title: 'The Firefly Who Lost Her Light',
  teaser: 'A tiny firefly has lost her glow somewhere deep in the old oak.',
  opening: [
    'Once, on a night without a moon, a firefly named Lumi lost her light.',
    'She knew where it had fallen: deep in the roots of the old oak, far across the wood.',
    'Will you help her get there?',
  ],
  beats: [
    {
      id: 'river',
      scene: 'river',
      setup(ctx) {
        ctx.fireflies.placeLumi(LEFT_BANK, LUMI_Y);
        ctx.fireflies.lumiVisible = true;
      },
      narration: ['First came the river: far too wide for a tiny firefly to cross in the dark.'],
      goal: 'bird',
      prompt: 'Who could carry her over the water?',
      hint: 'Make a bird: hook your thumbs together, palms out, and flap your fingers.',
      async solve(ctx, creature) {
        const bird = creature as Bird;
        ctx.hold(bird);
        bird.moveTo(ctx.v(LEFT_BANK + 0.02, LUMI_Y + 0.02), 1400);
        await ctx.wait(1500);
        ctx.cue('chime');
        ctx.fireflies.carriedBy = () => bird.carryPoint();
        bird.moveTo(ctx.v(0, 0.08), 1600);
        await ctx.wait(1600);
        ctx.cue('splash');
        bird.moveTo(ctx.v(RIGHT_BANK, LUMI_Y + 0.02), 1600);
        await ctx.wait(1700);
        ctx.fireflies.carriedBy = null;
        ctx.fireflies.placeLumi(RIGHT_BANK + 0.02, LUMI_Y);
        bird.moveTo(ctx.v(0.5, 0.3), 1800);
        await ctx.wait(1200);
      },
      after: ['Up and over! The water sang beneath them.'],
    },
    {
      id: 'fence',
      scene: 'fence',
      setup(ctx) {
        ctx.fireflies.placeLumi(-0.25, LUMI_Y);
      },
      narration: ['Next stood the old garden fence, its boards too tight for even a firefly to squeeze through.'],
      goal: 'rabbit',
      prompt: 'Who could dig a way beneath it?',
      hint: 'Make a rabbit: two fingers up for ears, the others curled down to your thumb.',
      async solve(ctx, creature) {
        const rabbit = creature as Rabbit;
        ctx.hold(rabbit);
        rabbit.moveTo(ctx.v(FENCE_X - 0.13, GROUND_Y), 1500);
        await ctx.wait(1600);
        ctx.cue('dig');
        let resolved = false;
        rabbit.digThrough(ctx.v(FENCE_X + 0.16, GROUND_Y), () => (resolved = true));
        await ctx.wait(1500);
        ctx.fireflies.lumiGoal.set(FENCE_X + 0.2, LUMI_Y);
        while (!resolved) await ctx.wait(100);
        ctx.cue('chime');
        rabbit.moveTo(ctx.v(0.55, GROUND_Y), 1600);
        await ctx.wait(1000);
      },
      after: ['Scritch, scratch, and through!'],
    },
    {
      id: 'owl',
      scene: 'oak',
      setup(ctx) {
        ctx.fireflies.placeLumi(-0.3, LUMI_Y);
        ctx.owl.perch(OWL_PERCH.x, OWL_PERCH.y);
      },
      narration: ['At last, the old oak. But a great owl sat on the branch, blinking. "Hoo goes there?"'],
      goal: 'dog',
      needsBark: true,
      prompt: 'Who could make a big, brave noise?',
      hint: 'Make a dog: flat hand facing the wall, thumb up for an ear. Drop your pinky and snap it shut to bark!',
      async solve(ctx, creature) {
        ctx.hold(creature);
        ctx.cue('owlHoot');
        ctx.owl.ruffle();
        await ctx.wait(500);
        ctx.owl.flyAway();
        ctx.cue('owlFlap');
        await ctx.wait(1400);
        ctx.fireflies.lumiGoal.set(0.18, GROUND_Y + 0.07);
        creature.moveTo(ctx.v(-0.55, GROUND_Y), 2000);
        await ctx.wait(1200);
      },
      after: ['WOOF! The owl ruffled away into the night, and the way was clear.'],
    },
    {
      id: 'roots',
      scene: 'roots',
      setup(ctx) {
        ctx.fireflies.placeLumi(-0.05, LUMI_Y + 0.02);
      },
      narration: ['Her light had rolled into a tunnel in the roots: too narrow, and much too dark.'],
      goal: 'snail',
      prompt: 'Who is small, and slow, and patient?',
      hint: 'Make a snail: a fist with two fingers held level, pointing at the wall.',
      async solve(ctx, creature) {
        ctx.hold(creature);
        creature.moveTo(ctx.v(TUNNEL.x, GROUND_Y), 2600);
        await ctx.wait(2700);
        creature.leave();
        await ctx.wait(1400);
        ctx.cue('glow');
        ctx.fireflies.lumiGlow = 0.5;
        await ctx.wait(800);
        ctx.creatures.snail.spawn(ctx.v(TUNNEL.x, GROUND_Y));
        ctx.hold(ctx.creatures.snail);
        ctx.creatures.snail.moveTo(ctx.v(-0.02, GROUND_Y), 2600);
        ctx.fireflies.lumiGoal.set(0.0, LUMI_Y + 0.03);
        await ctx.wait(2600);
      },
      after: ['Slowly, slowly... the snail came back with something glowing on its shell.'],
    },
  ],
  async ending(ctx) {
    ctx.scene('meadow');
    ctx.creatures.dismissAll();
    ctx.fireflies.lumiGoal.set(0, 0.02);
    await ctx.wait(800);
    await ctx.say('Lumi touched the glow, and her light came home.');
    ctx.cue('swell');
    ctx.fireflies.lumiGlow = 1;
    await ctx.wait(1200);
    ctx.fireflies.setSwarm(1);
    await ctx.say('And every firefly in the wood came out to dance with her.');
    await ctx.wait(2500);
    await ctx.say('The End.');
  },
};

export const FABLES: FableDef[] = [fireflyFable];

/** Teasers for fables still being written: shown in the journal as "tonight's fable". */
export const COMING_SOON = [
  { title: 'The Moon Who Fell Into the Well', teaser: 'Someone will need long ears, and someone will need wings.' },
  { title: 'The Snail Who Wanted to Race', teaser: 'Slow and steady, but how steady?' },
];

export const v2 = (x: number, y: number): Vector2 => new Vector2(x, y);
