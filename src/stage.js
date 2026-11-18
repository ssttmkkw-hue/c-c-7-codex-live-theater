import * as T from 'three'

const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .82, ...extra })
const box = new T.BoxGeometry(1, 1, 1)
const ball = new T.SphereGeometry(1, 16, 12)
const limbs = { thigh: .51, shin: .53 }
const actorScale = 1.33
const waistHeight = 1.11
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
  root.scale.setScalar(actorScale)
  const body = group(root)
  mesh(body, new T.CylinderGeometry(.4, .27, .81, 8), cloth, 0, 1.48, 0, 1, 1, .67)
  mesh(body, box, dark, 0, 1.11, 0, .54, .09, .34)
  mesh(body, ball, gold, 0, 1.66, .255, .09, .17, .04)
  const head = group(body, 0, 2.07)
  const face = []
  face.push(mesh(head, cylinder, skin, 0, -.16, 0, .105, .23, .105))
  face.push(mesh(head, ball, skin, 0, .04, 0, .225, .265, .20))
  const cap = mesh(head, ball, hair, 0, .20, -.046, .236, .15, .202)
  mesh(head, ball, dark, -.082, .075, .186, .022, .015, .012)
  mesh(head, ball, dark, .082, .075, .186, .022, .015, .012)
  face.push(mesh(head, ball, skin, 0, .025, .196, .039, .045, .041))
  const brows = [-1, 1].map(side => mesh(head, box, dark, side * .083, .119, .189, .068, .014, .014))
  const mouth = mesh(head, ball, dark, 0, -.072, .182, .056, .015, .014)
  const arms = [-1, 1].map(side => {
    const shoulder = group(body, side * .36, 1.77)
    mesh(shoulder, ball, cloth, 0, -.2, 0, .12, .29, .126)
    const elbow = group(shoulder, 0, -.39)
    mesh(elbow, ball, cloth, 0, -.15, 0, .095, .22, .093)
    const hand = mesh(elbow, ball, skin, 0, -.34, 0, .084, .108, .079)
    face.push(hand)
    const finger = mesh(elbow, ball, skin, .033, -.445, .035, .025, .096, .026)
    face.push(finger)
    finger.visible = false
    return { shoulder, elbow, hand, finger, side }
  })
  body.position.y = waistHeight
  for (const part of body.children) part.position.y -= waistHeight
  const legs = [-1, 1].map(side => {
    const hip = group(root, side * .145, 1.095)
    mesh(hip, ball, dark, 0, -.25, 0, .134, .33, .14)
    const knee = group(hip, 0, -limbs.thigh)
    mesh(knee, ball, cloth, 0, -.24, 0, .105, .285, .107)
    const ankle = group(knee, 0, -limbs.shin)
    mesh(ankle, ball, dark, 0, 0, .065, .12, .105, .202)
    return { hip, knee, ankle, side }
  })
  const shadow = mesh(parent, ball, material('#160c17', { transparent: true, opacity: .45, depthWrite: false }), x, .014, z, .75, .014, .40)
  return { root, body, head, cap, face, cloth, brows, mouth, arms, legs, shadow, mark: x, z, phase: index * 2, walkDistance: 0 }
}

function spectralCostume(person) {
  person.cloth.color.set('#759ccd')
  person.cloth.emissive.set('#426ea0')
  person.cloth.emissiveIntensity = .55
  const porcelain = material('#c4ddf3', { emissive: '#618ec5', emissiveIntensity: .45 })
  for (const part of person.face) part.material = porcelain
  person.cap.visible = false
  const mantle = material('#415d89', { emissive: '#416fb6', emissiveIntensity: .45 })
  mesh(person.body, new T.CylinderGeometry(.39, .48, 1.31, 8), mantle, 0, 1.16 - waistHeight, -.145, 1.15, 1, .38)
  mesh(person.body, new T.CylinderGeometry(.19, .5, .27, 8), person.cloth, 0, 1.83 - waistHeight, -.04, 1, 1, .68)
  const crown = material('#aedcff', { emissive: '#76c7ff', emissiveIntensity: 1.15 })
  mesh(person.head, cylinder, crown, 0, .233, -.025, .209, .058, .192)
  for (let i = 0; i < 5; i++) {
    const point = mesh(person.head, box, crown, (i - 2) * .082, .29, .123, .064, i === 2 ? .18 : .11, .053)
    point.rotation.z = Math.PI / 4
  }
  const motes = group(person.root)
  for (let i = 0; i < 8; i++) {
    mesh(motes, ball, crown, 0, 0, 0, .023, .023, .023)
  }
  person.motes = motes
}

// Solve the two leg joints from the ankle target and keep the sole level.
function poseLeg(leg, y, z) {
  const { thigh, shin } = limbs
  const reach = Math.min(thigh + shin - .001, Math.hypot(y, z))
  const cosine = (reach ** 2 - thigh ** 2 - shin ** 2) / (2 * thigh * shin)
  const bend = Math.acos(T.MathUtils.clamp(cosine, -1, 1))
  leg.hip.rotation.x = -Math.atan2(z, y) - Math.atan2(shin * Math.sin(bend), thigh + shin * Math.cos(bend))
  leg.knee.rotation.x = bend
  leg.ankle.rotation.x = -leg.hip.rotation.x - bend
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
  mesh(scene, ball, material('#dfc2ad', { emissive: '#bd8b79', emissiveIntensity: .5 }), 3.75, 4.35, -4.03, .59, .59, .055)
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
  const follow = new T.Mesh(new T.PlaneGeometry(4.6, 4.2), new T.MeshBasicMaterial({
    map: poolTexture, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0,
  }))
  follow.rotation.x = -Math.PI / 2
  follow.position.y = .009
  scene.add(follow)
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
  return follow
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
    this.follow = buildHouse(this.scene)
    this.container = container
    this.ambient = new T.HemisphereLight('#ffdfba', '#483447', 1.7)
    this.scene.add(this.ambient)
    this.key = new T.SpotLight('#ffdcaa', 0, 12, .37, .72)
    this.scene.add(this.key, this.key.target)
    this.lightColor = new T.Color()
    this.slowTint = new T.Color('#ac94ee')
    this.labelPoint = new T.Vector3()
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
      const distance = Math.max(12.4, 19.1 / aspect)
      this.camera.position.set(0, 3.72 + (distance - 12.4) * .18, distance)
      this.camera.lookAt(0, 1.45, .35)
      this.camera.updateMatrixWorld()
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height, false)
      this.width = width
      this.height = height
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
      for (const person of this.actors) person.label?.remove()
      const materials = new Set()
      old.traverse(item => {
        if (!item.isMesh) return
        if (![box, ball, cylinder].includes(item.geometry)) item.geometry.dispose()
        if (![skin, dark, gold].includes(item.material)) materials.add(item.material)
      })
      for (const mat of materials) mat.dispose()
    }
    this.castGroup = group(this.scene)
    this.actors = [actor(this.castGroup, 0, -1.95, .72), actor(this.castGroup, 1, 1.95, .72)]
    this.names = new Map()
    this.beat = null
    this.paused = false
    this.rate = 1
    this.override = ''
    this.clock = 0
    this.endingQueued = false
    this.beatTime = 0
  }

  cast(name) {
    if (!name || this.names.has(name)) return
    const index = this.names.size
    if (index >= this.actors.length) {
      const lane = Math.ceil(index / 2)
      this.actors.push(actor(this.castGroup, index, (index % 2 ? 1 : -1) * Math.min(4.25, 1.7 + lane * .8), -.24 - (index - 2) * .19))
    }
    const person = this.actors[index]
    this.names.set(name, person)
    person.spectral = /^(?:the )?ghost$/i.test(name)
    if (person.spectral) spectralCostume(person)
    person.label = document.createElement('div')
    person.label.className = 'cast-label'
    person.label.textContent = name
    person.label.hidden = true
    person.label.setAttribute('aria-hidden', 'true')
    this.container.append(person.label)
  }

  perform(beat) {
    this.beat = beat
    this.beatTime = this.clock
    const speaker = this.names.get(beat?.speaker)
    if (!speaker) return
    speaker.mark = beat.mark
    if (beat.alternate) {
      this.endingQueued = false
      const partner = this.names.get(beat.lookAt)
      if (partner && partner !== speaker) {
        const side = Math.sign(speaker.root.position.x - partner.root.position.x) || 1
        speaker.mark = side * .88
        partner.mark = -side * .88
      }
    }
  }

  update(dt) {
    const beat = this.beat
    const speaker = this.names.get(beat?.speaker)
    const addressed = this.names.get(beat?.lookAt)
    const settle = 1 - Math.exp(-dt * 12)
    const mood = beat?.alternate ? 'quiet' : this.override || beat?.emotion
    const color = this.paused ? '#8f9bbf' : beat?.alternate ? '#f4c692'
      : this.endingQueued ? '#cf9be0' : mood === 'angry' ? '#ff8566'
      : speaker?.spectral ? '#9fd7ff' : this.rate < 1 ? '#c8c1ef' : '#ffe0ad'
    this.lightColor.set(color)
    if (this.rate < 1 && !this.paused && !beat?.alternate) {
      this.lightColor.lerp(this.slowTint, .35)
    }
    this.key.color.lerp(this.lightColor, settle)
    this.follow.material.color.copy(this.key.color)
    const focus = beat?.alternate && addressed && speaker
      ? (addressed.root.position.x + speaker.root.position.x) / 2 : speaker?.root.position.x ?? 0
    const lightX = T.MathUtils.lerp(this.key.position.x, focus, settle)
    this.key.position.set(lightX, 4.8, 3.5)
    this.key.target.position.set(lightX, 1.25, .7)
    this.key.intensity = T.MathUtils.lerp(this.key.intensity, speaker ? (this.paused ? 18 : 64) : 0, settle)
    this.follow.position.x = lightX
    this.follow.position.z = speaker?.z ?? .72
    this.follow.scale.setScalar(beat?.alternate ? 1.3 : 1)
    this.follow.material.opacity = this.key.intensity / 105
    this.ambient.intensity = T.MathUtils.lerp(this.ambient.intensity, this.paused ? .67 : beat ? 1.28 : 1.7, settle)

    if (!this.paused) this.clock += dt * this.rate
    for (const person of this.actors) {
      const active = speaker === person
      const partner = active ? addressed ?? this.actors.find(other => other !== person) : speaker
      if (!this.paused) this.pose(person, partner, active, mood, dt, settle)
      if (!person.label) continue
      person.head.getWorldPosition(this.labelPoint)
      this.labelPoint.y += .68
      this.labelPoint.project(this.camera)
      const outside = Math.abs(this.labelPoint.x) > .92 || Math.abs(this.labelPoint.y) > .9
      person.label.hidden = !beat || outside || Math.abs(person.root.position.x) > 4.7
      person.label.classList.toggle('speaking', active)
      person.label.style.transform = `translate3d(${(this.labelPoint.x + 1) * this.width / 2}px, ${(1 - this.labelPoint.y) * this.height / 2}px, 0) translate(-50%, -100%)`
    }
  }

  pose(person, partner, active, mood, dt, settle) {
    const { root, body, head, mouth, arms, legs, phase, shadow } = person
    const t = this.clock
    const talking = active && Boolean(this.beat?.line)
    const ending = Boolean(this.beat?.alternate && (active || partner))
    const angry = mood === 'angry' && Boolean(this.beat)
    const quiet = mood === 'quiet' && active
    const uneasy = mood === 'uneasy' && active
    const delta = person.mark - root.position.x
    const walking = Math.abs(delta) > .012
    const turn = Math.sign(delta)
    const facing = partner && partner !== person
      ? Math.atan2(partner.root.position.x - root.position.x, 1.9 + partner.z - person.z) * .85 : 0
    root.rotation.y = T.MathUtils.lerp(root.rotation.y, walking ? turn * Math.PI / 2 : facing, settle)
    const speed = (person.spectral ? 1.8 : 1.92) * this.rate
    const alignedSpeed = speed * Math.max(.08, Math.sin(root.rotation.y) * turn)
    const step = Math.min(Math.abs(delta), dt * alignedSpeed)
    root.position.x += turn * step
    person.walkDistance += step / actorScale
    person.stride = T.MathUtils.lerp(person.stride ?? 0, walking ? Math.min(1, Math.abs(delta) / .22) : 0, settle)
    shadow.position.x = root.position.x

    const breath = Math.sin(t * 2.55 + phase)
    const phrase = .5 + .5 * Math.sin((t - this.beatTime) * 4.1 + .7)
    const punch = phrase ** 2
    const gesture = this.beat?.gesture
    const point = talking && (angry || gesture === 'point') && !ending && !quiet
    const lead = root.rotation.y > .08 ? -1 : 1
    const audienceSide = root.rotation.y >= 0 ? -1 : 1
    const recoil = !active && angry && partner
    root.position.y = person.spectral ? .21 + breath * .09 : 0
    body.position.y = waistHeight + breath * .022 - (quiet ? .055 : 0) - .04 * person.stride
    body.rotation.x = T.MathUtils.lerp(body.rotation.x, point ? .32 + punch * .14
      : recoil ? -.19 : ending ? .19 : uneasy ? -.21 : quiet ? .14 : 0, settle)
    body.rotation.z = breath * .037 + (point ? -lead * .12 : recoil ? audienceSide * .13 : 0)
    head.rotation.x = T.MathUtils.lerp(head.rotation.x, point ? .14 + punch * .17
      : uneasy ? -.24 : quiet ? .2 : talking ? -.13 + punch * .23 : -.025, settle)
    head.rotation.y = Math.sin(t * 1.9 + phase) * .08 + (talking ? -facing * .23 : 0)
    person.brows[0].rotation.z = point ? -.35 : uneasy ? .32 : 0
    person.brows[1].rotation.z = -person.brows[0].rotation.z
    mouth.scale.y = talking ? .018 + Math.abs(Math.sin(t * 16) * Math.cos(t * 5)) * (point ? .083 : .058) : .014

    for (const { shoulder, elbow, hand, finger, side } of arms) {
      let lift = -.13
      let spread = .16
      let bend = -.22
      if (point) {
        lift = side === lead ? -1.40 - punch * .20 : -.65 - punch * .33
        spread = side === lead ? .48 : .73
        bend = side === lead ? -.13 - (1 - punch) * .42 : -1.08
      } else if (ending) {
        lift = side === lead ? -.96 - punch * .2 : -.39
        spread = side === lead ? .42 : .32
        bend = -.56
      } else if (recoil || uneasy) {
        lift = -.67
        spread = .56
        bend = -1.26 - punch * .24
      } else if (quiet) {
        lift = -.43 - punch * .23
        spread = .23
        bend = -1.35
      } else if (talking) {
        lift = -.48 - punch * (side === lead ? .64 : .38)
        spread = .57 + punch * .35
        bend = -.62 - punch * .48
      } else if (walking && !person.spectral) {
        lift += Math.cos(person.walkDistance / 1.06 * Math.PI * 2) * side * .40 * person.stride
      }
      shoulder.rotation.x = T.MathUtils.lerp(shoulder.rotation.x, lift, settle)
      shoulder.rotation.z = T.MathUtils.lerp(shoulder.rotation.z, side * spread, settle)
      elbow.rotation.x = T.MathUtils.lerp(elbow.rotation.x, bend, settle)
      elbow.rotation.z = T.MathUtils.lerp(elbow.rotation.z, -side * (quiet ? .47 : talking && !point ? .17 : .06), settle)
      finger.visible = point && side === lead
      hand.scale.set(point ? .094 : .083, point ? .089 : .118, .079)
    }

    const cycle = person.walkDistance / 1.06
    for (const leg of legs) {
      const progress = (cycle + (leg.side === 1 ? .5 : 0)) % 1
      const swing = Math.max(0, (progress - .55) / .45)
      // The contact foot moves back by the distance traveled. Only the swing foot lifts.
      const travel = .2915 - Math.min(progress, .55) * 1.06 + .583 * swing ** 2 * (3 - 2 * swing)
      const stride = person.spectral ? 0 : person.stride
      const lift = Math.sin(swing * Math.PI) * .22 * stride
      leg.hip.position.y = 1.125 - .045 * stride
      poseLeg(leg, leg.hip.position.y - .105 - lift, travel * stride + (point ? leg.side * .09 : 0))
    }
    person.motes?.children.forEach((mote, i) => {
      const angle = i * 2.4 + t * .78
      mote.position.set(Math.cos(angle) * (.59 + .03 * i), .25 + (i * .29 + t * .30) % 2.25, Math.sin(angle) * .42)
      mote.scale.setScalar(.015 + .016 * (.5 + .5 * Math.sin(t * 2 + i)))
    })
  }
}
