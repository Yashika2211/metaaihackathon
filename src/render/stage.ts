import { Group, Quaternion, Vector3, type Object3D } from 'three';
import { LAYOUT } from '../config/tuning';
import type { Vec3 } from '../core/vec';
import type { Lantern } from './lantern';
import type { ShadowWall } from './shadowWall';

/**
 * The stage is everything that is placed relative to the seated player:
 * the lantern and the shadow wall. Recenter moves the whole stage in front
 * of the current head pose (yaw only, so the wall stays upright).
 */
export class Stage {
  readonly group = new Group();
  readonly forward = new Vector3(0, 0, -1);
  readonly up = new Vector3(0, 1, 0);
  /** Comfortable point for hands, between lantern and wall. */
  readonly handZone = new Vector3();
  private placed = false;

  constructor(readonly wall: ShadowWall, readonly lantern: Lantern) {
    this.group.name = 'stage';
    wall.group.position.set(0, -LAYOUT.wallDrop, -LAYOUT.wallDistance);
    lantern.group.position.set(0, -LAYOUT.lanternDrop, -LAYOUT.lanternForward);
    this.group.add(wall.group, lantern.group);
    lantern.aimAt(wall.group);
  }

  get isPlaced(): boolean {
    return this.placed;
  }

  /** Place the stage in front of a head pose. */
  recenter(head: Object3D): void {
    head.updateWorldMatrix(true, false);
    const pos = new Vector3().setFromMatrixPosition(head.matrixWorld);
    const q = new Quaternion();
    head.getWorldQuaternion(q);
    const fwd = new Vector3(0, 0, -1).applyQuaternion(q);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    this.placeAt(pos, fwd);
  }

  placeAt(headPos: Vector3, forward: Vector3): void {
    this.forward.copy(forward).setY(0).normalize();
    this.group.position.copy(headPos);
    this.group.rotation.set(0, Math.atan2(-this.forward.x, -this.forward.z), 0);
    this.group.updateMatrixWorld(true);
    // Hands rest on the line from the lantern to the wall centre, so their
    // shadow lands in the middle of the wall (about 2.3× life size).
    const t = LAYOUT.handFromLantern / (LAYOUT.wallDistance - LAYOUT.lanternForward);
    const fwd = LAYOUT.lanternForward + (LAYOUT.wallDistance - LAYOUT.lanternForward) * t;
    const drop = LAYOUT.lanternDrop + (LAYOUT.wallDrop - LAYOUT.lanternDrop) * t;
    this.handZone.copy(headPos).addScaledVector(this.forward, fwd);
    this.handZone.y -= drop;
    this.placed = true;
  }

  forwardTuple(): Vec3 {
    return [this.forward.x, this.forward.y, this.forward.z];
  }

  handZoneTuple(): Vec3 {
    return [this.handZone.x, this.handZone.y, this.handZone.z];
  }
}
