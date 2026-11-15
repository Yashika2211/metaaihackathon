/** Creatures the player can make, and how to make them. Shown in-game and in the journal. */

export type CreatureId = 'rabbit' | 'bird' | 'dog' | 'snail';
export const CREATURES: readonly CreatureId[] = ['rabbit', 'bird', 'dog', 'snail'];

export type Variant = 'classic' | 'oneHanded';

export interface CreatureInfo {
  id: CreatureId;
  name: string;
  emoji: string;
  classic: string;
  oneHanded: string;
  action: string;
}

export const CREATURE_INFO: Record<CreatureId, CreatureInfo> = {
  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    emoji: '🐇',
    classic: 'Index and middle fingers up as ears; ring and pinky curled down to meet your thumb.',
    oneHanded: 'Peace sign, fingers pointing up.',
    action: 'Hops. Move your hand to guide it.',
  },
  bird: {
    id: 'bird',
    name: 'Bird',
    emoji: '🐦',
    classic: 'Both hands, palms out, thumbs hooked together. Wave your fingers to flap.',
    oneHanded: 'One open hand, fingers spread wide, palm to the wall. Wiggle to flap.',
    action: 'Flies along the wall. Move your hands to steer.',
  },
  dog: {
    id: 'dog',
    name: 'Dog',
    emoji: '🐕',
    classic: 'Flat hand facing the wall, fingers together pointing sideways as the snout, thumb up as an ear. Drop your pinky to open the jaw, snap it shut to bark.',
    oneHanded: 'Thumbs-up. It barks on its own.',
    action: 'Barks!',
  },
  snail: {
    id: 'snail',
    name: 'Snail',
    emoji: '🐌',
    classic: 'Fist with index and middle fingers held level, pointing sideways or at the wall, as antennae.',
    oneHanded: 'Point one finger, level, at the wall.',
    action: 'Crawls slowly where your hand leads.',
  },
};
