import { Component } from "aio3d-core";
import { GameComponentTypes } from "../GameComponentTypes";
import * as THREE from "three";

/**
 * Configuration interface for TextComponent
 */
export interface TextConfig {
  /** The text to display */
  text: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Text color */
  color?: string;
  /** Text alignment */
  textAlign?: CanvasTextAlign;
  /** Background color (optional) */
  backgroundColor?: string;
  /** Padding around the text in pixels */
  padding?: number;
}

/**
 * Component that renders text using a canvas-based approach
 */
export class TextComponent extends Component {
  public readonly type = GameComponentTypes.TEXT;
  private texture: THREE.Texture;
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.PlaneGeometry;
  private mesh: THREE.Mesh;
  private config: TextConfig;

  /**
   * Creates a new TextComponent
   * @param config - Configuration for the text
   */
  constructor(config: TextConfig) {
    super();
    this.config = {
      fontSize: 48,
      fontFamily: "Arial",
      color: "#ffffff",
      textAlign: "center",
      backgroundColor: "transparent",
      padding: 10,
      ...config,
    };

    // Create the texture and material
    const { texture, width, height } = this.createTextTexture();
    this.texture = texture;

    // Create material that uses the texture
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create geometry with correct aspect ratio
    this.geometry = new THREE.PlaneGeometry(width / 100, height / 100);

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Position slightly in front of the menu item background
    this.mesh.position.z = 0.01;
    // Ensure text is always rendered on top
    this.material.depthTest = false;
    this.material.depthWrite = false;
  }

  /**
   * Creates a canvas texture with the text
   */
  private createTextTexture(): {
    texture: THREE.Texture;
    width: number;
    height: number;
  } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Set font and measure text
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    const metrics = ctx.measureText(this.config.text);

    // Calculate canvas size with padding
    const padding = this.config.padding! * 2;
    const width = Math.ceil(metrics.width + padding);
    const height = Math.ceil(this.config.fontSize! * 1.2 + padding);

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear and set background if specified
    ctx.clearRect(0, 0, width, height);
    if (this.config.backgroundColor !== "transparent") {
      ctx.fillStyle = this.config.backgroundColor!;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw text
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = this.config.textAlign!;
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.config.color!;
    ctx.fillText(this.config.text, width / 2, height / 2);

    // Create texture
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    return { texture, width, height };
  }

  /**
   * Updates the text content
   * @param newText - The new text to display
   */
  public updateText(newText: string): void {
    this.config.text = newText;
    const { texture, width, height } = this.createTextTexture();

    // Update texture
    this.texture.dispose();
    this.texture = texture;
    this.material.map = this.texture;

    // Update geometry to maintain aspect ratio
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(width / 100, height / 100);
    this.mesh.geometry = this.geometry;
  }

  /**
   * Gets the Three.js mesh
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.texture.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}
