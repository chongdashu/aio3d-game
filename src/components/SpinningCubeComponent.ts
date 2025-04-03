import { Component } from "aio3d-core";
import { GameComponentTypes } from "./GameComponentTypes";
import * as THREE from "three";

/**
 * Component holding data defining how an entity should spin.
 * Pure data container following ECS principles.
 */
export class SpinningCubeComponent extends Component {
  public readonly type = GameComponentTypes.SPINNING_CUBE;
  public rotationSpeed: THREE.Vector3;

  /**
   * Creates a new SpinningCubeComponent.
   * @param rotationSpeed - The speed of rotation around each axis (radians per second).
   */
  constructor(rotationSpeed?: THREE.Vector3) {
    super();

    // Use provided speed or set a default random speed
    this.rotationSpeed =
      rotationSpeed?.clone() ??
      new THREE.Vector3(
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5
      );
  }
}
