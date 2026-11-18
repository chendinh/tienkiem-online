'use client';
import { useEffect, useRef, useState } from 'react';

// A creature cut out of its background, played from TWO H.264 videos: the picture and its alpha matte (a grey video).
// Safari (iPhone) shows the alpha of a WebM as black, so both videos are put on one WebGL canvas and the matte becomes the canvas' alpha.
// Works the same in every browser. Both videos are muted and inline (iOS refuses anything else to start by itself) and are kept in step by the loop below.
const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }';
const FS = 'precision mediump float; varying vec2 v; uniform sampler2D c; uniform sampler2D a; void main(){ vec3 col = texture2D(c, v).rgb; float al = texture2D(a, v).r; gl_FragColor = vec4(col * al, al); }';

function program(gl: WebGLRenderingContext): WebGLProgram | null {
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram()!;
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
}
function texture(gl: WebGLRenderingContext) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

export function AlphaVideo({ rgb, alpha, playing = true, className }: { rgb: string; alpha: string; playing?: boolean; className?: string }) {
  const cv = useRef<HTMLCanvasElement>(null), vc = useRef<HTMLVideoElement>(null), va = useRef<HTMLVideoElement>(null);
  const dirty = useRef(true);   // a picture must be drawn although the video is paused (after a seek, or when a new source has loaded)
  const [plain, setPlain] = useState(false);

  // WebGL is set up once; the loop reads whatever the two videos show now, so changing `rgb` or `alpha` needs nothing here.
  useEffect(() => {
    const canvas = cv.current, c = vc.current, a = va.current;
    if (!canvas || !c || !a) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null;
    const pr = gl && program(gl);
    if (!gl || !pr) { setPlain(true); return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tc = texture(gl), ta = texture(gl);
    const mark = () => { dirty.current = true; };
    for (const v of [c, a]) { v.addEventListener('seeked', mark); v.addEventListener('loadeddata', mark); }
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (c.readyState < 2 || a.readyState < 2 || !c.videoWidth) return;
      if (c.paused && !dirty.current) return;
      if (!c.paused && Math.abs(a.currentTime - c.currentTime) > 0.08) a.currentTime = c.currentTime;
      if (canvas.width !== c.videoWidth || canvas.height !== c.videoHeight) { canvas.width = c.videoWidth; canvas.height = c.videoHeight; gl.viewport(0, 0, canvas.width, canvas.height); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tc); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ta); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
      gl.uniform1i(gl.getUniformLocation(pr, 'c'), 0); gl.uniform1i(gl.getUniformLocation(pr, 'a'), 1);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dirty.current = false;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      for (const v of [c, a]) { v.removeEventListener('seeked', mark); v.removeEventListener('loadeddata', mark); }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  // playing: both videos run; not playing: both stop on their first frame (the standing pose of a walk clip)
  useEffect(() => {
    const c = vc.current, a = va.current;
    if (!c || !a) return;
    if (playing) { c.play().catch(() => {}); a.play().catch(() => {}); }
    else { c.pause(); a.pause(); try { c.currentTime = 0; a.currentTime = 0; } catch {} dirty.current = true; }
  }, [playing, rgb, alpha]);

  if (plain) return <video className={className} src={rgb} muted loop playsInline autoPlay />;   // no WebGL: the picture alone, with its background
  return (
    <span className={`zl-alpha ${className || ''}`}>
      <canvas ref={cv} className="zl-alpha-cv" />
      <video ref={vc} src={rgb} className="zl-hid" muted loop playsInline preload="auto" />
      <video ref={va} src={alpha} className="zl-hid" muted loop playsInline preload="auto" />
    </span>
  );
}
