import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const vertexGradient = `
uniform float uTime;
uniform vec3 uColor[5];
varying vec2 vUv;
varying vec3 vColor;

//	Simplex 3D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);


  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;


  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );


  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;


  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));


  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main()
{
    // Noise 
    vec2 noiseCoord = uv * vec2(3.0, 4.0);
    float noise = snoise(vec3(noiseCoord.x + uTime * 3.0, noiseCoord.y, uTime * 5.0));
    noise = max(0.0, noise);
    float tilt = -0.8 * uv.y;
    float incline = uv.x * 0.01;
    float offset = incline * mix(-0.25, 0.25, uv.y);
    vec3 pos = vec3(position.xy, position.z + noise * 0.3 + tilt + incline);

    // Position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    // Varying
    vUv = uv;

    // Couleurs 
    vColor = uColor[4];
    for(int i = 0; i < 4; i++){
        float noiseFlow = 5.0 + float(i) * 0.3;
        float noiseSpeed = 10.0 + float(i) * 0.3;
        float noiseSeed = 1.0 + float(i) * 10.0;
        vec2 noiseFreq = vec2(0.5, 1.0);

        float noise = snoise(
            vec3(
                noiseCoord.x * noiseFreq.x + uTime * noiseFlow, 
                noiseCoord.y * noiseFreq.y, 
                uTime * noiseSpeed + noiseSeed
            ));
        vColor = mix(vColor, uColor[i], noise);
    };
}
`;

const fragmentGradient = `varying vec2 vUv;
varying vec3 vColor;

void main()
{
    gl_FragColor = vec4(vUv, 0.0, 1.0);
    gl_FragColor = vec4(vColor, 1.0);
}
`;

const vertexGrain = `
 varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const fragmentGrain = `
uniform float uAmount;
uniform sampler2D tDiffuse;
varying vec2 vUv;

  float random( vec2 p )
  {
    vec2 K1 = vec2(
      23.14069263277926, // e^pi (Gelfond's constant)
      2.665144142690225 // 2^sqrt(2) (Gelfondâ€“Schneider constant)
    );
    return fract( cos( dot(p,K1) ) * 12345.6789 );
  }

  void main() {

    vec4 color = texture2D( tDiffuse, vUv );
    vec2 uvRandom = vUv;
    uvRandom.y *= random(vec2(uvRandom.y,uAmount));
    color.rgb += random(uvRandom)*0.15;
    gl_FragColor = vec4( color  );
  }
`;

/**
 * Performances
 */
// const stats = new Stats()
// stats.showPanel(0)
// document.body.appendChild(stats.dom)

/**
 * Canvas
 */
const canvas = document.querySelector("canvas#canvas");

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Update sizes to screen resizes
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = innerWidth;
  sizes.height = innerHeight;
  // Update Camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  // Update Render
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Colors
 */
let colors = ["#FCC1A7", "#fff", "#FFE3D7", "#fff", "#FFE3D7"];

// Convert to threejs colors
colors = colors.map((color) => new THREE.Color(color));

/**
 * Scene
 */
const scene = new THREE.Scene();

/**
 * Objects
 */
const gradient = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2, 200, 200),
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 19.0 },
      uColor: { value: colors },
    },
    vertexShader: vertexGradient,
    fragmentShader: fragmentGradient,
    wireframe: false,
    side: THREE.DoubleSide,
  })
);
scene.add(gradient);

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 0.2);
scene.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas,
});
renderer.setSize(sizes.width, sizes.height * 2);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Post Processing
 */
const effectComposer = new EffectComposer(renderer);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposer.setSize(sizes.width, sizes.height);

const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

let counter = 100;

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: counter },
  },
  vertexShader: vertexGrain,
  fragmentShader: fragmentGrain,
};
const grainShader = new ShaderPass(GrainShader);
effectComposer.addPass(grainShader);

/**
 * Animations
 */

const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // stats.begin();

  // Update uTime
  gradient.material.uniforms.uTime.value = elapsedTime * 0.015;

  // Update Renderer
  // renderer.render(scene, camera)
  effectComposer.render();

  // Call tick on all frames
  window.requestAnimationFrame(tick);

  // stats.end();
};

tick();
