const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

class Aurora {
  constructor(ctn, options = {}) {
    if (!ctn || !window.OGL) {
      console.warn("Aurora background initialization failed: container or OGL library not found.");
      return;
    }
    this.ctn = ctn;
    this.colorStops = options.colorStops || ['#070B19', '#1A1B35', '#0A1128'];
    this.amplitude = options.amplitude !== undefined ? options.amplitude : 1.0;
    this.blend = options.blend !== undefined ? options.blend : 0.5;
    this.speed = options.speed !== undefined ? options.speed : 0.5;
    
    this.init();
  }

  init() {
    const { Renderer, Program, Mesh, Color, Triangle } = window.OGL;

    this.renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.renderer.gl.canvas.style.backgroundColor = 'transparent';

    this.geometry = new Triangle(this.gl);
    if (this.geometry.attributes.uv) {
      delete this.geometry.attributes.uv;
    }

    const colorStopsArray = this.colorStops.map(hex => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    this.program = new Program(this.gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: this.amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [this.ctn.offsetWidth, this.ctn.offsetHeight] },
        uBlend: { value: this.blend }
      }
    });

    this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.ctn.appendChild(this.renderer.gl.canvas);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.animateId = 0;
    this.update = this.update.bind(this);
    this.animateId = requestAnimationFrame(this.update);
  }

  resize() {
    if (!this.ctn) return;
    const width = this.ctn.offsetWidth;
    const height = this.ctn.offsetHeight;
    this.renderer.setSize(width, height);
    if (this.program) {
      this.program.uniforms.uResolution.value = [width, height];
    }
  }

  update(t) {
    this.animateId = requestAnimationFrame(this.update);
    const time = t * 0.01;
    this.program.uniforms.uTime.value = time * this.speed * 0.1;
    this.renderer.setSize(this.ctn.offsetWidth, this.ctn.offsetHeight); // dynamic redraw support
    this.renderer.render({ scene: this.mesh });
  }

  destroy() {
    cancelAnimationFrame(this.animateId);
    window.removeEventListener('resize', this.resize);
    if (this.ctn && this.renderer.gl.canvas.parentNode === this.ctn) {
      this.ctn.removeChild(this.renderer.gl.canvas);
    }
    const loseCtx = this.gl.getExtension('WEBGL_lose_context');
    if (loseCtx) loseCtx.loseContext();
  }
}

// Bind to window context
window.Aurora = Aurora;
