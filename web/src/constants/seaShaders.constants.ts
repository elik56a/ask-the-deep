// GLSL for the 3D sea (v3 prototype). The numbers inside are shader tuning and stay with the code they tune.

// Sky colour for a view direction: horizon haze up to the zenith.
const SKY_COLOR = `vec3 skyCol(vec3 d){ float h = max(d.y, 0.0); vec3 c = mix(uHor, uZen, pow(h, 0.5)); return mix(uHaze, c, smoothstep(0.0, 0.16, h)); }`;

export const SKY_VERTEX =
  "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

// A low sun with a corona over warm haze, and slow fbm clouds.
export const SKY_FRAGMENT = `uniform vec3 uSun, uZen, uHor, uHaze, uSunCol; uniform float uTime; varying vec3 vDir; ${SKY_COLOR}
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main(){ vec3 d = normalize(vDir); vec3 c = skyCol(d);
    float sd = max(dot(d, uSun), 0.0);
    c += uSunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 60.0) * 0.5 + pow(sd, 600.0) * 0.6);
    c += vec3(1.6, 1.45, 1.2) * smoothstep(0.99955, 0.9998, sd);
    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.06) * 0.9 + vec2(uTime * 0.004, 0.0);
      float n = fbm(uv);
      float cl = smoothstep(0.5, 0.82, n) * smoothstep(0.0, 0.2, d.y) * (1.0 - smoothstep(0.45, 0.9, d.y));
      vec3 cc = mix(vec3(0.97, 0.98, 1.0), uSunCol * 1.08, pow(sd, 3.0) * 0.85) * mix(0.82, 1.05, fbm(uv * 2.3));
      c = mix(c, cc, cl * 0.8);
    } else c = mix(uHaze, uHor * 0.85, smoothstep(0.0, 0.25, -d.y));
    gl_FragColor = vec4(c, 1.0); }`;

// Where the ocean vertex shader takes its wave calls, one `W(...)` per wave.
export const WAVES_SLOT = "/* waves */";

// The swell as a sum of sines, with analytic normals.
export const OCEAN_VERTEX = `uniform float uTime; varying vec3 vW; varying vec3 vN; varying float vH;
  float h, dx, dz; vec2 P;
  void W(vec2 d, float f, float a, float s){ float ph = dot(d, P) * f + uTime * s; h += a * sin(ph); float c = a * f * cos(ph); dx += c * d.x; dz += c * d.y; }
  void main(){ vec4 w = modelMatrix * vec4(position, 1.0); P = w.xz; h = 0.0; dx = 0.0; dz = 0.0; ${WAVES_SLOT}
    w.y += h; vW = w.xyz; vH = h; vN = normalize(vec3(-dx, 1.0, -dz)); gl_Position = projectionMatrix * viewMatrix * w; }`;

// Fresnel sky reflection and a sun glitter path from above; the bright window from below.
export const OCEAN_FRAGMENT = `uniform vec3 uSun, uZen, uHor, uHaze, uSunCol, uDeep, uMid, uUnder; uniform float uTime; varying vec3 vW; varying vec3 vN; varying float vH; ${SKY_COLOR}
  void main(){
    vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
    vec2 p = vW.xz; float t = uTime; float fade = exp(-dist * 0.025);
    vec2 rp = vec2(sin(p.x * 1.7 + t * 2.1) + sin(p.y * 2.3 - t * 1.7 + p.x * 0.6), sin(p.y * 1.9 + t * 1.9) + sin((p.x + p.y) * 2.7 + t * 2.4)) * 0.05 * fade;
    vec3 n = normalize(vN + vec3(rp.x, 0.0, rp.y));
    vec3 c;
    if (cameraPosition.y > vW.y) {
      float nv = max(dot(n, v), 0.0);
      float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
      vec3 r = reflect(-v, n); r.y = abs(r.y);
      vec3 body = mix(uDeep, uMid, clamp(vH * 0.7 + 0.35, 0.0, 1.0) * 0.55 + 0.25 * max(dot(n, uSun), 0.0));
      c = mix(body, skyCol(r), fres);
      float sp = max(dot(reflect(-uSun, n), v), 0.0);
      c += uSunCol * (min(pow(sp, 1200.0) * 9.0, 2.2) * (1.0 - fade * 0.75) + pow(sp, 120.0) * 0.6 * (1.0 - fade * 0.5) + pow(sp, 12.0) * 0.05);
      c = mix(c, uHaze * 0.95, 1.0 - exp(-dist * 0.0042));
    } else {
      float up = clamp(-v.y, 0.0, 1.0);
      c = mix(uUnder, uSunCol * 1.15, smoothstep(0.62, 1.0, up) * 0.85 + (n.x + n.z) * 0.05);
      c = mix(c, uUnder, 1.0 - exp(-dist * 0.05));
    }
    gl_FragColor = vec4(c, 1.0); }`;

// Light shafts fade out towards the cone's tip.
export const SHAFT_VERTEX =
  "varying float vH; void main(){ vH = position.y / 60.0 + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
export const SHAFT_FRAGMENT =
  "uniform float uOpacity; uniform vec3 uCol; varying float vH; void main(){ gl_FragColor = vec4(uCol, pow(vH, 1.6) * uOpacity); }";

// Pooled particles: a soft ring, sized by distance, faded by its own alpha.
export const POOL_VERTEX =
  "attribute float aAlpha; uniform float uSize; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; vA = aAlpha; }";
export const POOL_FRAGMENT =
  "uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.4, d) * (0.3 + 0.7 * smoothstep(0.2, 0.45, d)); gl_FragColor = vec4(uColor, a * vA); }";

// three r128's light falloff, which the scenes were tuned with: linear to the cutoff, shaped by decay.
export const LEGACY_ATTENUATION = `float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
  if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
  return 1.0;
}`;
