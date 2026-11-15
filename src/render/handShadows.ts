import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { SHADOW } from '../config/tuning';
import { BONES, JOINT_COUNT, type HandPose } from '../hands/joints';

const UP = new Vector3(0, 1, 0);

/**
 * Builds each tracked hand out of instanced spheres (joints) and cylinders
 * (bones). They never draw to the eyes, only into the lantern's shadow map,
 * so the player sees their *real* hand in passthrough and its shadow on the wall.
 */
class HandCaster {
  readonly joints: InstancedMesh;
  readonly bones: InstancedMesh;
  private m = new Matrix4();
  private q = new Quaternion();
  private a = new Vector3();
  private b = new Vector3();
  private d = new Vector3();
  private s = new Vector3();

  constructor(material: MeshBasicMaterial) {
    this.joints = new InstancedMesh(new IcosahedronGeometry(1, 1), material, JOINT_COUNT);
    this.bones = new InstancedMesh(new CylinderGeometry(1, 1, 1, 8, 1, true), material, BONES.length);
    for (const mesh of [this.joints, this.bones]) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.visible = false;
    }
  }

  set(hand: HandPose | null): void {
    if (!hand) {
      this.joints.visible = this.bones.visible = false;
      return;
    }
    this.joints.visible = this.bones.visible = true;
    const scaleR = SHADOW.capsuleRadiusScale;
    for (let i = 0; i < JOINT_COUNT; i++) {
      const p = hand.joints[i];
      const r = (hand.radii[i] || SHADOW.fallbackJointRadius) * scaleR;
      this.m.compose(this.a.set(p[0], p[1], p[2]), this.q.identity(), this.s.set(r, r, r));
      this.joints.setMatrixAt(i, this.m);
    }
    for (let i = 0; i < BONES.length; i++) {
      const [ia, ib] = BONES[i];
      const pa = hand.joints[ia];
      const pb = hand.joints[ib];
      this.a.set(pa[0], pa[1], pa[2]);
      this.b.set(pb[0], pb[1], pb[2]);
      this.d.subVectors(this.b, this.a);
      const len = this.d.length();
      const r = Math.min(hand.radii[ia] || SHADOW.fallbackJointRadius, hand.radii[ib] || SHADOW.fallbackJointRadius) * scaleR;
      if (len < 1e-5) {
        this.m.makeScale(0, 0, 0);
      } else {
        this.q.setFromUnitVectors(UP, this.d.divideScalar(len));
        this.m.compose(this.a.add(this.b).multiplyScalar(0.5), this.q, this.s.set(r, len, r));
      }
      this.bones.setMatrixAt(i, this.m);
    }
    this.joints.instanceMatrix.needsUpdate = true;
    this.bones.instanceMatrix.needsUpdate = true;
  }
}

export class HandShadows {
  readonly group = new Group();
  private left: HandCaster;
  private right: HandCaster;
  readonly material: MeshBasicMaterial;

  constructor() {
    this.material = new MeshBasicMaterial({ color: 0x2a1a10, colorWrite: false, depthWrite: false });
    this.left = new HandCaster(this.material);
    this.right = new HandCaster(this.material);
    this.group.add(this.left.joints, this.left.bones, this.right.joints, this.right.bones);
  }

  /** Debug: draw the casters as faint ghost hands too. */
  setDebugVisible(v: boolean): void {
    this.material.colorWrite = v;
    this.material.transparent = v;
    this.material.opacity = v ? 0.35 : 1;
    this.material.needsUpdate = true;
  }

  update(left: HandPose | null, right: HandPose | null): void {
    this.left.set(left);
    this.right.set(right);
  }
}
