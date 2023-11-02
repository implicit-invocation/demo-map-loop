import {
  Align,
  BitmapFont,
  MultiTextureBatch,
  Texture,
  createGameLoop,
  createStage,
  createViewport,
} from "gdxts";

const WORLD_WIDTH = 500;
const WORLD_HEIGHT = 1000;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type Ref = {
  value: number;
};

export function smoothDamp(
  current: number,
  target: number,
  currentVelocityRef: Ref,
  smoothTime: number,
  maxSpeed: number = Infinity,
  deltaTime: number
): number {
  // Based on Game Programming Gems 4 Chapter 1.10
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;

  const temp = (currentVelocityRef.value + omega * change) * deltaTime;
  currentVelocityRef.value = (currentVelocityRef.value - omega * temp) * exp;
  let output = target + (change + temp) * exp;

  // Prevent overshooting
  if (originalTo - current > 0.0 === output > originalTo) {
    output = originalTo;
    currentVelocityRef.value = (output - originalTo) / deltaTime;
  }

  return output;
}

const init = async () => {
  const stage = createStage();
  const canvas = stage.getCanvas();

  const viewport = createViewport(canvas, WORLD_WIDTH, WORLD_HEIGHT);

  const gl = viewport.getContext();
  const camera = viewport.getCamera();
  camera.setYDown(true);

  const batch = new MultiTextureBatch(gl);
  batch.setYDown(true);

  const bg = await Texture.load(gl, "tex/pattern-bg.png");
  const white = Texture.createWhiteTexture(gl);

  const font = await BitmapFont.load(gl, "font/ui-font.fnt");

  const map = await import("./pattern.json");
  const points = map.layers.find((l) => l.name === "waypoints")!.objects;
  const deco = map.layers.find((l) => l.name === "deco")!.objects;

  const drawPattern = (offsetY: number, indexOffset: number) => {
    for (let rect of deco) {
      batch.setColor(0.4, 0.2, 0.3, 1);
      batch.draw(white, rect.x, rect.y + offsetY, rect.width, rect.height);
      batch.setColor(1, 1, 1, 1);
    }
    batch.draw(bg, 0, offsetY, WORLD_WIDTH, WORLD_HEIGHT);
    let i = indexOffset * points.length;
    for (let point of points) {
      i++;
      batch.setColor(1, 0, 0, 1);
      batch.draw(white, point.x - 5, point.y - 5 + offsetY, 10, 10);
      batch.setColor(1, 1, 1, 1);
      font.draw(
        batch,
        i.toString(),
        point.x - 50,
        point.y + offsetY,
        100,
        Align.center
      );
    }
  };

  let playerPos = 0;
  let accumulate = 0;

  let STEP = 0.5;

  gl.clearColor(0, 0, 0, 1);
  let ref: Ref = { value: 0 };
  createGameLoop((delta) => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    accumulate += delta;

    while (accumulate > STEP) {
      accumulate -= STEP;
      playerPos++;
    }

    const currentPatternIndex = Math.floor(playerPos / points.length);
    const currentPoint = points[playerPos % points.length];
    let playerY = currentPoint.y - currentPatternIndex * WORLD_HEIGHT;

    const cameraX = camera.position.x;
    const cameraY = smoothDamp(
      camera.position.y,
      playerY,
      ref,
      0.2,
      1000,
      delta
    );
    camera.setPosition(cameraX, cameraY);
    camera.update();

    batch.setProjection(camera.combined);
    batch.begin();
    drawPattern(
      -currentPatternIndex * WORLD_HEIGHT - WORLD_HEIGHT,
      currentPatternIndex + 1
    );
    drawPattern(-currentPatternIndex * WORLD_HEIGHT, currentPatternIndex);
    drawPattern(
      -currentPatternIndex * WORLD_HEIGHT + WORLD_HEIGHT,
      currentPatternIndex - 1
    );

    batch.setColor(0, 0, 1, 1);
    batch.draw(white, currentPoint.x - 10, playerY - 10, 20, 20);
    batch.setColor(1, 1, 1, 1);
    batch.end();
  });
};

init();
