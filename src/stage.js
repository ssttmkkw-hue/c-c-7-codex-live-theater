import * as T from 'three'

const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .82, ...extra })
const box = new T.BoxGeometry(1, 1, 1)
const ball = new T.SphereGeometry(1, 16, 12)
const cylinder = new T.CylinderGeometry(1, 1, 1, 16)
const brick = material('#49303a')
const gold = material('#b78046', { metalness: .44, roughness: .38 })
const dark = material('#211821')
const velvet = material('#6d273c')
const avatarFabric = material('#d3a458')
const skin = material('#dba57e')

function mesh(parent, geometry, mat, x, y, z, sx, sy, sz) {
  const item = new T.Mesh(geometry, mat)
  item.position.set(x, y, z)
  item.scale.set(sx, sy, sz)
  parent.add(item)
  return item
}

function group(parent, x = 0, y = 0, z = 0) {
  const item = new T.Group()
  item.position.set(x, y, z)
  parent.add(item)
  return item
}

function actor(parent, index, x, z) {
  const root = group(parent, x, 0, z)
  const palette = ['#638269', '#94a8be', '#aa6458', '#8e729d', '#bd8d55']
  const cloth = material(palette[index % palette.length])
  const hair = material(['#39252b', '#8795a7', '#301d20'][index % 3])
  const body = group(root)
  const torso = mesh(body, new T.CylinderGeometry(.4, .27, .81, 8), cloth, 0, 1.48, 0, 1, 1, .67)
  mesh(body, box, dark, 0, 1.11, 0, .54, .09, .34)
  mesh(body, ball, gold, 0, 1.66, .255, .09, .17, .04)
  const head = group(body, 0, 2.07)
  mesh(head, cylinder, skin, 0, -.16, 0, .105, .23, .105)
  mesh(head, ball, skin, 0, .04, 0, .225, .265, .20)
  mesh(head, ball, hair, 0, .20, -.046, .236, .15, .202)
  mesh(head, ball, dark, -.082, .075, .186, .022, .015, .012)
  mesh(head, ball, dark, .082, .075, .186, .022, .015, .012)
  mesh(head, ball, skin, 0, .025, .196, .039, .045, .041)
  const mouth = mesh(head, ball, dark, 0, -.072, .182, .056, .015, .014)
  const arms = [-1, 1].map(side => {
    const shoulder = group(body, side * .36, 1.77)
    mesh(shoulder, ball, cloth, 0, -.2, 0, .12, .29, .126)
    const elbow = group(shoulder, 0, -.39)
    mesh(elbow, ball, cloth, 0, -.15, 0, .095, .22, .093)
    mesh(elbow, ball, skin, 0, -.34, 0, .084, .108, .079)
    return { shoulder, elbow, side }
  })
  const legs = [-1, 1].map(side => {
    const hip = group(root, side * .145, 1.15)
    mesh(hip, ball, dark, 0, -.25, 0, .134, .33, .14)
    const knee = group(hip, 0, -.51)
    mesh(knee, ball, cloth, 0, -.24, 0, .105, .285, .107)
    mesh(knee, ball, dark, 0, -.53, .065, .12, .11, .202)
    return { hip, knee, side }
  })
  const shadow = mesh(parent, ball, material('#160c17', { transparent: true, opacity: .45, depthWrite: false }), x, .014, z, .57, .014, .31)
  return { root, body, torso, head, mouth, arms, legs, shadow, mark: x, z, phase: index * 2, actorIndex: index }
}

function curtain(parent, x, y, width, height, z, color, swag = false) {
  const points = []
  const indices = []
  const columns = 72
  for (let i = 0; i <= columns; i++) {
    const u = i / columns
    const fold = Math.sin(u * Math.PI * (swag ? 30 : 18)) * .13
    const scallop = swag ? Math.abs(Math.sin(u * Math.PI * 3)) * .48 : 0
    const bottomX = swag ? 0 : Math.sign(x) * Math.sin(u * Math.PI) * .24
    points.push(x + u * width, y + height, z + fold, x + u * width + bottomX, y - scallop, z + fold * 1.45)
    if (i < columns) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.Float32BufferAttribute(points, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  parent.add(new T.Mesh(geo, material(color, { side: T.DoubleSide })))
}

function buildHouse(scene) {
  const wood = Array.from({ length: 6 }, (_, i) => material(new T.Color().setHSL(.071 + i * .004, .30, .22 + i * .013)))
  const backdrop = material('#30273d')
  mesh(scene, box, backdrop, 0, 3.1, -4.3, 18, 8.4, .25)
  for (let i = -5; i <= 5; i++) {
    mesh(scene, box, brick, i * 1.27, 2.9, -4.1, .035, 6.3, .1)
  }
  // The moon and cutout scenery sit against the upstage wall.
  mesh(scene, ball, material('#dfc2ad', { emissive: '#bd8b79', emissiveIntensity: .5 }), 2.8, 4.35, -4.03, .59, .59, .055)
  for (const [x, y, width, height] of [[-4, .13, 6.5, 2.05], [-.2, .1, 6.6, 1.45], [4.1, .03, 6.5, 1.8]]) {
    const hills = new T.Shape()
    hills.moveTo(-width / 2, 0)
    hills.quadraticCurveTo(-width * .29, height * 1.35, -.12, height * .63)
    hills.quadraticCurveTo(width * .22, height * .21, width / 2, height * .46)
    hills.lineTo(width / 2, 0)
    hills.closePath()
    const silhouette = new T.Mesh(new T.ShapeGeometry(hills), material('#191426', { side: T.DoubleSide }))
    silhouette.position.set(x, y, -3.92 + y)
    scene.add(silhouette)
  }
  for (let i = 0; i < 23; i++) {
    const x = Math.sin(i * 28.1) * 5.3
    const y = 2 + (Math.sin(i * 17.3) + 1) * 1.55
    mesh(scene, ball, material('#b396aa', { emissive: '#674d75' }), x, y, -4, .023, .023, .024)
  }
  for (let i = 0; i < 32; i++) {
    const x = (i - 15.5) * .48
    mesh(scene, box, wood[(i * 7 + Math.floor(i / 3)) % wood.length], x, -.105, -.18, .474, .2, 8.6)
  }
  const poolCanvas = document.createElement('canvas')
  poolCanvas.width = poolCanvas.height = 128
  const paint = poolCanvas.getContext('2d')
  const gradient = paint.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,0.42)')
  gradient.addColorStop(.52, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  paint.fillStyle = gradient
  paint.fillRect(0, 0, 128, 128)
  const poolTexture = new T.CanvasTexture(poolCanvas)
  for (const [x, color] of [[-1.9, '#ffd59a'], [1.9, '#c5c5ff']]) {
    const pool = new T.Mesh(new T.PlaneGeometry(5, 5.5), new T.MeshBasicMaterial({
      color, map: poolTexture, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    }))
    pool.position.set(x, .003, .45)
    pool.rotation.x = -Math.PI / 2
    scene.add(pool)
  }
  mesh(scene, box, dark, 0, -.5, 4.07, 15.4, .88, .3)
  for (const y of [-.14, -.64]) mesh(scene, box, gold, 0, y, 4.24, 15.5, .052, .08)
  for (let i = -7; i <= 7; i++) {
    mesh(scene, box, brick, i, -.39, 4.24, .8, .29, .08)
    if (i % 2 === 0) mesh(scene, ball, material('#ffc685', { emissive: '#f5a455', emissiveIntensity: .9 }), i, .043, 3.96, .072, .05, .06)
  }
  for (const x of [-6.72, 6.72]) {
    mesh(scene, box, brick, x, 2.84, 1, .57, 6.3, .74)
    for (const side of [-1, 1]) mesh(scene, box, gold, x + side * .23, 2.85, 1.41, .04, 6.25, .06)
    for (const y of [.16, 5.72]) mesh(scene, box, gold, x, y, 1.05, .67, .17, .82)
  }
  curtain(scene, -6.45, 4.93, 12.9, .81, 1.1, '#6a2036', true)
  curtain(scene, -7.3, -.03, 2.64, 5.97, .3, '#661e36')
  curtain(scene, 4.66, -.03, 2.64, 5.97, .3, '#661e36')
  mesh(scene, box, brick, 0, 6.14, 1.1, 14.2, .26, .65)
  mesh(scene, box, gold, 0, 6.07, 1.46, 14.05, .05, .07)
  mesh(scene, box, material('#32202a'), 0, -1.12, 8, 24, .25, 12)
  for (let row = 0; row < 3; row++) {
    for (let i = -6; i <= 6; i++) {
      const x = i * 1.22 + (row % 2 ? .5 : 0)
      const z = 5.57 + row * 1.5
      const y = -.79 + row * .23
      const you = row === 0 && i === -3
      const chair = you ? avatarFabric : velvet
      mesh(scene, box, dark, x, y - .08, z, .99, .44, .86)
      mesh(scene, box, chair, x, y + .13, z - .18, .86, .16, .67)
      mesh(scene, box, chair, x, y + .37, z + .33, .92, .73, .22).rotation.x = .13
      mesh(scene, box, gold, x, y + .71, z + .33, .75, .035, .24)
      for (const side of [-1, 1]) mesh(scene, box, dark, x + side * .48, y + .32, z - .04, .13, .17, .76)
      if (you || (i + row * 2 + 15) % 4 === 0) {
        const person = group(scene, x, y, z - .16)
        mesh(person, ball, you ? avatarFabric : material('#3d384c'), 0, .50, 0, .35, .43, .27)
        mesh(person, ball, you ? skin : material('#76574f'), 0, 1.03, -.045, .207, .245, .198)
        mesh(person, ball, dark, 0, 1.13, .006, .21, .18, .2)
        if (you) {
          const marker = mesh(person, box, material('#efd39b', { emissive: '#e6ad62', emissiveIntensity: .8 }), 0, 1.54, 0, .19, .19, .045)
          marker.rotation.z = Math.PI / 4
        }
      }
    }
  }
}

export class TheaterStage {
  constructor(container) {
    this.scene = new T.Scene()
    this.scene.background = new T.Color('#1b101a')
    this.scene.fog = new T.FogExp2('#231723', .021)
    this.camera = new T.PerspectiveCamera(40, 1, .1, 70)
    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65))
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.27
    container.append(this.renderer.domElement)
    this.renderer.domElement.setAttribute('aria-label', '3D stage with two actors and your seated avatar')
    buildHouse(this.scene)
    this.scene.add(new T.HemisphereLight('#ffdfba', '#483447', 1.7))
    const fill = new T.DirectionalLight('#ecc3a6', 1.55)
    fill.position.set(0, 4, 8)
    this.scene.add(fill)
    const rim = new T.DirectionalLight('#9baeff', 2.1)
    rim.position.set(4, 7, -5)
    this.scene.add(rim)
    for (const x of [-3.9, 3.9]) {
      const lamp = new T.SpotLight(x < 0 ? '#ffbb73' : '#c1c5ff', 100, 14, .47, .68)
      lamp.position.set(x, 6.35, 3.9)
      lamp.target.position.set(x * .47, 0, 0)
      this.scene.add(lamp, lamp.target)
    }
    this.reset()
    new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return
      const aspect = width / height
      this.camera.aspect = aspect
      const distance = Math.max(14.1, 20.8 / aspect)
      this.camera.position.set(0, 4.25 + (distance - 14.1) * .17, distance)
      this.camera.lookAt(0, 1.45, 0)
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height, false)
    }).observe(container)
    let previous = performance.now()
    this.renderer.setAnimationLoop(now => {
      const dt = Math.min(.05, (now - previous) / 1000)
      previous = now
      this.update(Math.max(0, dt))
      this.renderer.render(this.scene, this.camera)
    })
  }

  reset() {
    if (this.castGroup) {
      const old = this.castGroup
      this.scene.remove(old)
      old.traverse(item => {
        if (!item.isMesh) return
        if (![box, ball, cylinder].includes(item.geometry)) item.geometry.dispose()
        if (![skin, dark, gold].includes(item.material)) item.material.dispose()
      })
    }
    this.castGroup = group(this.scene)
    this.actors = [actor(this.castGroup, 0, -1.95, .72), actor(this.castGroup, 1, 1.95, .72)]
    this.names = new Map()
    this.beat = null
    this.paused = false
    this.rate = 1
    this.override = ''
    this.clock = 0
  }

  cast(name) {
    if (!name || this.names.has(name)) return
    const index = this.names.size
    if (index >= this.actors.length) {
      const lane = Math.ceil(index / 2)
      this.actors.push(actor(this.castGroup, index, (index % 2 ? 1 : -1) * Math.min(4.25, 1.7 + lane * .8), -.24 - (index - 2) * .19))
    }
    this.names.set(name, this.actors[index])
  }

  perform(beat) {
    this.beat = beat
    const speaker = this.names.get(beat?.speaker)
    if (speaker) speaker.mark = beat.mark
  }

  update(dt) {
    if (this.paused) return
    this.clock += dt * this.rate
    const t = this.clock
    const speaker = this.names.get(this.beat?.speaker)
    const addressed = this.names.get(this.beat?.lookAt)
    for (const person of this.actors) {
      const { root, body, head, mouth, arms, legs, phase, shadow } = person
      const active = speaker === person
      const talking = active && Boolean(this.beat?.line)
      const emotion = this.override || (active ? this.beat?.emotion : '')
      const intensity = { angry: 1.45, quiet: .33, uneasy: .75 }[emotion] ?? .95
      const delta = person.mark - root.position.x
      const walking = Math.abs(delta) > .045
      const stride = Math.sin(t * 8 + phase)
      const settle = 1 - Math.exp(-dt * 10)
      root.position.x += Math.sign(delta) * Math.min(Math.abs(delta), dt * 1.72 * this.rate)
      root.position.y = walking ? Math.abs(stride) * .07 : 0
      shadow.position.x = root.position.x
      const partner = active ? addressed ?? this.actors.find(other => other !== person) : speaker
      const face = walking ? Math.sign(delta) * 1.28 : partner && partner !== person ? Math.atan2(partner.root.position.x - root.position.x, 2.65 + partner.z - person.z) : 0
      root.rotation.y = T.MathUtils.lerp(root.rotation.y, face, settle * .65)
      body.position.y = Math.sin(t * 2.25 + phase) * .019
      body.rotation.z = Math.sin(t * 1.45 + phase) * (talking ? .065 : .028)
      head.rotation.x = T.MathUtils.lerp(head.rotation.x, talking ? Math.sin(t * 6.4) * .105 * intensity + (emotion === 'angry' ? .13 : 0) : -.03, settle)
      head.rotation.y = Math.sin(t * 1.9 + phase) * .08
      mouth.scale.y = talking ? .014 + Math.abs(Math.sin(t * 16) * Math.cos(t * 5)) * .055 : .014
      for (const { shoulder, elbow, side } of arms) {
        const phrase = .55 + .45 * Math.sin(t * 4.2 + side * 1.23)
        const gesture = this.override === 'angry' ? 'point' : this.override === 'quiet' ? 'close' : this.beat?.gesture
        const emphasis = active && (talking || !walking) ? intensity * (side === 1 ? 1 : .58) : 0
        shoulder.rotation.x = T.MathUtils.lerp(shoulder.rotation.x, walking ? stride * side * .53 : -.12 - emphasis * phrase * (gesture === 'point' ? 1.1 : .62), settle)
        shoulder.rotation.z = T.MathUtils.lerp(shoulder.rotation.z, side * (.14 + emphasis * phrase * (gesture === 'open' ? .54 : .19)), settle)
        elbow.rotation.x = T.MathUtils.lerp(elbow.rotation.x, -.17 - emphasis * (gesture === 'point' ? .27 : .59) * phrase, settle)
      }
      for (const { hip, knee, side } of legs) {
        hip.rotation.x = T.MathUtils.lerp(hip.rotation.x, walking ? stride * side * .58 : 0, settle)
        knee.rotation.x = T.MathUtils.lerp(knee.rotation.x, walking ? Math.max(0, -stride * side) * .8 : 0, settle)
      }
    }
  }
}
