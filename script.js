const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

function resizeCanvas() {
  const container = document.querySelector(".game-container")
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}

window.addEventListener("load", resizeCanvas)
window.addEventListener("resize", resizeCanvas)


let gameActive = false
let gamePaused = false
let score = 0
let scoreMultiplier = 1
let wave = 1
let enemiesDestroyed = 0
let highScore = localStorage.getItem("highScore") || 0
let gameStartTime = 0
let gameTime = 0
let selectedShipType = "fighter"


const shipTypes = {
  fighter: {
    width: 50,
    height: 60,
    speed: 5,
    health: 100,
    maxHealth: 100,
    weaponDamage: 10,
    weaponCooldown: 250,
    specialCooldown: 5000,
    color: "#00a0ff",
  },
  tank: {
    width: 60,
    height: 70,
    speed: 3,
    health: 200,
    maxHealth: 200,
    weaponDamage: 15,
    weaponCooldown: 350,
    specialCooldown: 7000,
    color: "#f00",
  },
  scout: {
    width: 40,
    height: 50,
    speed: 7,
    health: 80,
    maxHealth: 80,
    weaponDamage: 8,
    weaponCooldown: 200,
    specialCooldown: 4000,
    color: "#0f0",
  },
}


const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 60,
  speed: 5,
  health: 100,
  maxHealth: 100,
  shields: 0,
  weapon: {
    type: "laser",
    damage: 10,
    cooldown: 250,
    lastFired: 0,
  },
  specialAbility: {
    type: "bomb",
    cooldown: 5000,
    lastUsed: 0,
    active: false,
  },
  upgrades: {
    weaponPower: 1,
    healthMax: 1,
    speed: 1,
    specialCooldown: 1,
  },
  invulnerable: false,
  invulnerableTime: 0,
  thrusterParticles: [],
  color: "#00a0ff",
}


let bullets = []
let enemies = []
let enemyBullets = []
let powerUps = []
let particles = []
let stars = []
let asteroids = []


const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false,
}


let lastTime = 0
let enemySpawnTimer = 0
let powerUpSpawnTimer = 0
let waveTimer = 0
let asteroidSpawnTimer = 0
const waveCompleteTimer = 0

let animationFrame


const achievements = {
  firstBlood: { name: "First Blood", description: "Destroy your first enemy", unlocked: false },
  centurion: { name: "Centurion", description: "Reach a score of 1000", unlocked: false },
  survivor: { name: "Survivor", description: "Survive for 2 minutes", unlocked: false },
  destroyer: { name: "Destroyer", description: "Destroy 50 enemies", unlocked: false },
  wavemaster: { name: "Wave Master", description: "Complete 5 waves", unlocked: false },
  shieldmaster: { name: "Shield Master", description: "Collect 5 shield power-ups", unlocked: false },
}


const gameStats = {
  shieldsCollected: 0,
  timePlayed: 0,
}


const sounds = {
  laser: null,
  explosion: null,
  powerUp: null,
  playerHit: null,
  gameOver: null,
  background: null,
  achievement: null,
}


function init() {
  gameActive = false
  gamePaused = false
  score = 0
  scoreMultiplier = 1
  wave = 1
  enemiesDestroyed = 0
  gameTime = 0

  enemySpawnTimer = 0
  powerUpSpawnTimer = 0
  waveTimer = 0
  asteroidSpawnTimer = 0

  
  gameStats.shieldsCollected = 0
  gameStats.timePlayed = 0

  
  applyShipType(selectedShipType)

  
  player.x = canvas.width / 2 - player.width / 2
  player.y = canvas.height - player.height - 50
  player.health = player.maxHealth
  player.shields = 0
  player.weapon.type = "laser"
  player.upgrades = {
    weaponPower: 1,
    healthMax: 1,
    speed: 1,
    specialCooldown: 1,
  }

  
  bullets = []
  enemies = []
  enemyBullets = []
  powerUps = []
  particles = []
  asteroids = []

  initStars()

  updateUI()

  document.getElementById("start-screen").classList.remove("hidden")
  document.getElementById("game-over-screen").classList.add("hidden")
  document.getElementById("pause-screen").classList.add("hidden")
  document.getElementById("level-up-screen").classList.add("hidden")
  document.getElementById("instructions-screen").classList.add("hidden")

  setupEventListeners()

  
  document.getElementById("weapon-cooldown").style.setProperty("--cooldown-scale", "1")
  document.getElementById("special-cooldown").style.setProperty("--special-cooldown-scale", "1")
}


function applyShipType(type) {
  const shipConfig = shipTypes[type]

  player.width = shipConfig.width
  player.height = shipConfig.height
  player.speed = shipConfig.speed
  player.health = shipConfig.health
  player.maxHealth = shipConfig.maxHealth
  player.weapon.damage = shipConfig.weaponDamage
  player.weapon.cooldown = shipConfig.weaponCooldown
  player.specialAbility.cooldown = shipConfig.specialCooldown
  player.color = shipConfig.color
}

function initStars() {
  stars = []
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 2 + 1,
    })
  }
}

function startGame() {
  gameActive = true
  gameStartTime = Date.now()

  enemySpawnTimer = getEnemySpawnRate()
  powerUpSpawnTimer = getPowerUpSpawnRate() / 2
  waveTimer = 0
  asteroidSpawnTimer = 5000

  bullets = []
  enemies = []
  enemyBullets = []
  powerUps = []
  asteroids = []

  player.x = canvas.width / 2 - player.width / 2
  player.y = canvas.height - player.height - 50

  document.getElementById("start-screen").classList.add("hidden")
  document.getElementById("game-over-screen").classList.add("hidden")
  document.getElementById("pause-screen").classList.add("hidden")
  document.getElementById("level-up-screen").classList.add("hidden")

  lastTime = performance.now()
  gameLoop(lastTime)
}


function gameLoop(timestamp) {
  if (!gameActive || gamePaused) return

  const deltaTime = timestamp - lastTime
  lastTime = timestamp

  
  gameTime = Date.now() - gameStartTime
  gameStats.timePlayed = Math.floor(gameTime / 1000)

  
  checkAchievements()

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  update(deltaTime)

  render()

  animationFrame = requestAnimationFrame(gameLoop)
}

function update(deltaTime) {
  updatePlayer(deltaTime)

  updateBullets(deltaTime)

  updateEnemies(deltaTime)

  updateEnemyBullets(deltaTime)

  updatePowerUps(deltaTime)

  updateParticles(deltaTime)

  updateStars(deltaTime)

  updateAsteroids(deltaTime)

  
  enemySpawnTimer += deltaTime
  if (enemySpawnTimer >= getEnemySpawnRate()) {
    spawnEnemy()
    enemySpawnTimer = 0
  }

  
  powerUpSpawnTimer += deltaTime
  if (powerUpSpawnTimer >= getPowerUpSpawnRate()) {
    spawnPowerUp()
    powerUpSpawnTimer = 0
  }

  
  asteroidSpawnTimer += deltaTime
  if (asteroidSpawnTimer >= getAsteroidSpawnRate()) {
    spawnAsteroid()
    asteroidSpawnTimer = 0
  }

  
  waveTimer += deltaTime
  if (waveTimer >= getWaveDuration()) {
    completeWave()
  }

  checkCollisions()

  updateUI()
}

function updatePlayer(deltaTime) {
  let dx = 0
  let dy = 0

  if (keys.w) dy -= player.speed * player.upgrades.speed
  if (keys.a) dx -= player.speed * player.upgrades.speed
  if (keys.s) dy += player.speed * player.upgrades.speed
  if (keys.d) dx += player.speed * player.upgrades.speed

  if (dx !== 0 && dy !== 0) {
    const factor = 1 / Math.sqrt(2)
    dx *= factor
    dy *= factor
  }

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + dx))
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + dy))

  if (keys.space && performance.now() - player.weapon.lastFired >= player.weapon.cooldown) {
    fireBullet()
    player.weapon.lastFired = performance.now()
  }

  let specialAbilityUsed = false

  if (keys.shift) {
    if (
      performance.now() - player.specialAbility.lastUsed >=
      player.specialAbility.cooldown / player.upgrades.specialCooldown
    ) {
      useSpecialAbility()
      player.specialAbility.lastUsed = performance.now()
      specialAbilityUsed = true
    }
  }

  if (player.invulnerable) {
    player.invulnerableTime -= deltaTime
    if (player.invulnerableTime <= 0) {
      player.invulnerable = false
    }
  }

  if (dx !== 0 || dy !== 0) {
    createThrusterParticles()
  }
}

function fireBullet() {
  const bulletType = player.weapon.type

  if (bulletType === "laser") {
    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * player.upgrades.weaponPower,
      color: "#0ff",
    })
  } else if (bulletType === "double") {
    bullets.push({
      x: player.x + 10,
      y: player.y + 10,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * player.upgrades.weaponPower,
      color: "#0ff",
    })

    bullets.push({
      x: player.x + player.width - 14,
      y: player.y + 10,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * player.upgrades.weaponPower,
      color: "#0ff",
    })
  } else if (bulletType === "triple") {
    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * player.upgrades.weaponPower,
      color: "#0ff",
    })

    bullets.push({
      x: player.x + 10,
      y: player.y + 15,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * 0.7 * player.upgrades.weaponPower,
      color: "#0ff",
      angle: -0.2,
    })

    bullets.push({
      x: player.x + player.width - 14,
      y: player.y + 15,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * 0.7 * player.upgrades.weaponPower,
      color: "#0ff",
      angle: 0.2,
    })
  } else if (bulletType === "quad") {
    
    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * player.upgrades.weaponPower,
      color: "#0ff",
    })

    bullets.push({
      x: player.x + 10,
      y: player.y + 15,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * 0.7 * player.upgrades.weaponPower,
      color: "#0ff",
      angle: -0.2,
    })

    bullets.push({
      x: player.x + player.width - 14,
      y: player.y + 15,
      width: 4,
      height: 15,
      speed: 10,
      damage: player.weapon.damage * 0.7 * player.upgrades.weaponPower,
      color: "#0ff",
      angle: 0.2,
    })

    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y + 5,
      width: 4,
      height: 15,
      speed: 12,
      damage: player.weapon.damage * 0.5 * player.upgrades.weaponPower,
      color: "#f0f",
    })
  }

  
  
}

function useSpecialAbility() {
  if (player.specialAbility.type === "bomb") {
    
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 5

      particles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        size: 5 + Math.random() * 10,
        speed: speed,
        angle: angle,
        color: `hsl(${180 + Math.random() * 60}, 100%, 50%)`,
        alpha: 1,
        decay: 0.01 + Math.random() * 0.02,
      })
    }

    
    enemies.forEach((enemy) => {
      enemy.health -= 50
      if (enemy.health <= 0) {
        destroyEnemy(enemy)
      }
    })

    
    enemyBullets = []

    
    document.querySelector(".game-container").classList.add("shake")
    setTimeout(() => {
      document.querySelector(".game-container").classList.remove("shake")
    }, 500)
  } else if (player.specialAbility.type === "timeWarp") {
    
    enemies.forEach((enemy) => {
      enemy.speedX *= 0.5
      enemy.speedY *= 0.5
      enemy.slowed = true
      enemy.slowTimer = 5000
    })

    enemyBullets.forEach((bullet) => {
      bullet.speed *= 0.5
    })

    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 2 + Math.random() * 3,
        speed: 0.5,
        angle: Math.random() * Math.PI * 2,
        color: "#f0f",
        alpha: 0.7,
        decay: 0.005,
      })
    }
  }
}

function createThrusterParticles() {
  if (Math.random() < 0.3) {
    particles.push({
      x: player.x + player.width / 2 - 5 + Math.random() * 10,
      y: player.y + player.height,
      size: 2 + Math.random() * 3,
      speed: 1 + Math.random() * 2,
      angle: Math.PI / 2,
      color: `hsl(${180 + Math.random() * 60}, 100%, 50%)`,
      alpha: 0.7,
      decay: 0.02 + Math.random() * 0.03,
    })
  }
}

function updateBullets(deltaTime) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]

    if (bullet.angle) {
      bullet.x += Math.sin(bullet.angle) * bullet.speed
      bullet.y -= Math.cos(bullet.angle) * bullet.speed
    } else {
      bullet.y -= bullet.speed
    }

    if (bullet.y + bullet.height < 0) {
      bullets.splice(i, 1)
    }
  }
}

function updateEnemies(deltaTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    
    if (enemy.slowed) {
      enemy.slowTimer -= deltaTime
      if (enemy.slowTimer <= 0) {
        enemy.slowed = false
        enemy.speedX *= 2
        enemy.speedY *= 2
      }
    }

    enemy.x += enemy.speedX
    enemy.y += enemy.speedY

    
    if (enemy.type === "zigzag") {
      enemy.zigzagTimer += deltaTime
      if (enemy.zigzagTimer >= 1000) {
        enemy.speedX *= -1
        enemy.zigzagTimer = 0
      }
    } else if (enemy.type === "homing" && !enemy.slowed) {
      
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      const angle = Math.atan2(dy, dx)
      const homingSpeed = 0.5

      enemy.speedX += Math.cos(angle) * homingSpeed * (deltaTime / 1000)
      enemy.speedY += Math.sin(angle) * homingSpeed * (deltaTime / 1000)

      
      const speed = Math.sqrt(enemy.speedX * enemy.speedX + enemy.speedY * enemy.speedY)
      if (speed > 3) {
        enemy.speedX = (enemy.speedX / speed) * 3
        enemy.speedY = (enemy.speedY / speed) * 3
      }
    }

    if (enemy.x < 0 || enemy.x + enemy.width > canvas.width) {
      enemy.speedX *= -1
    }

    if (enemy.y > canvas.height) {
      enemies.splice(i, 1)
      continue
    }

    enemy.shootTimer += deltaTime
    if (enemy.shootTimer >= enemy.shootRate) {
      enemyShoot(enemy)
      enemy.shootTimer = 0
    }

    enemy.animTimer += deltaTime
    if (enemy.animTimer >= 100) {
      enemy.frame = (enemy.frame + 1) % enemy.frames
      enemy.animTimer = 0
    }
  }
}

function enemyShoot(enemy) {
  if (enemy.type === "basic") {
    enemyBullets.push({
      x: enemy.x + enemy.width / 2 - 2,
      y: enemy.y + enemy.height,
      width: 4,
      height: 10,
      speed: 5,
      damage: 10,
      color: "#f00",
    })
  } else if (enemy.type === "shooter" || enemy.type === "zigzag") {
    const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2)
    const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2)
    const angle = Math.atan2(dy, dx)

    enemyBullets.push({
      x: enemy.x + enemy.width / 2 - 2,
      y: enemy.y + enemy.height / 2,
      width: 6,
      height: 6,
      speed: 6,
      damage: 15,
      color: "#f70",
      angle: angle,
    })
  } else if (enemy.type === "boss") {
    
    if (enemy.attackPattern === "spread") {
      
      for (let i = -2; i <= 2; i++) {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - 3,
          y: enemy.y + enemy.height,
          width: 6,
          height: 12,
          speed: 4,
          damage: 20,
          color: "#f0f",
          angle: Math.PI / 2 + i * 0.2,
        })
      }
    } else if (enemy.attackPattern === "targeted") {
      
      const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2)
      const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2)
      const angle = Math.atan2(dy, dx)

      for (let i = -1; i <= 1; i++) {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - 3,
          y: enemy.y + enemy.height,
          width: 8,
          height: 8,
          speed: 7,
          damage: 25,
          color: "#f0f",
          angle: angle + i * 0.1,
        })
      }
    } else if (enemy.attackPattern === "laser") {
      
      enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 8,
        y: enemy.y + enemy.height,
        width: 16,
        height: 20,
        speed: 9,
        damage: 30,
        color: "#f0f",
      })
    }

    
    const patterns = ["spread", "targeted", "laser"]
    enemy.attackPattern = patterns[Math.floor(Math.random() * patterns.length)]
  } else if (enemy.type === "homing") {
    
    enemyBullets.push({
      x: enemy.x + enemy.width / 2 - 2,
      y: enemy.y + enemy.height,
      width: 4,
      height: 10,
      speed: 6,
      damage: 15,
      color: "#0f0",
    })
  }
}

function updateEnemyBullets(deltaTime) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i]

    if (bullet.angle) {
      bullet.x += Math.cos(bullet.angle) * bullet.speed
      bullet.y += Math.sin(bullet.angle) * bullet.speed
    } else {
      bullet.y += bullet.speed
    }

    if (bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
      enemyBullets.splice(i, 1)
    }
  }
}

function updatePowerUps(deltaTime) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i]

    powerUp.y += powerUp.speed

    powerUp.floatOffset = Math.sin(performance.now() / 200) * 5

    if (powerUp.y > canvas.height) {
      powerUps.splice(i, 1)
    }
  }
}

function updateParticles(deltaTime) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i]

    particle.x += Math.cos(particle.angle) * particle.speed
    particle.y += Math.sin(particle.angle) * particle.speed

    particle.alpha -= particle.decay

    if (particle.alpha <= 0) {
      particles.splice(i, 1)
    }
  }
}

function updateStars(deltaTime) {
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i]

    star.y += star.speed

    if (star.y > canvas.height) {
      star.y = 0
      star.x = Math.random() * canvas.width
    }
  }
}


function updateAsteroids(deltaTime) {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i]

    asteroid.x += asteroid.speedX
    asteroid.y += asteroid.speedY

    
    asteroid.rotation += asteroid.rotationSpeed

    
    if (asteroid.y > canvas.height || asteroid.x < -asteroid.size || asteroid.x > canvas.width + asteroid.size) {
      asteroids.splice(i, 1)
    }
  }
}

function spawnEnemy() {
  
  const types = ["basic"]

  if (wave >= 2) types.push("shooter")
  if (wave >= 3) types.push("zigzag")
  if (wave >= 4) types.push("homing")

  const type = types[Math.floor(Math.random() * types.length)]

  
  if (wave % 5 === 0 && enemies.filter((e) => e.type === "boss").length === 0 && Math.random() < 0.1) {
    spawnBoss()
    return
  }

  const baseHealth = Math.max(20, 30 + wave * 5)

  const enemy = {
    type: type,
    x: Math.random() * (canvas.width - 40),
    y: -50,
    width: 40,
    height: 40,
    health: baseHealth,
    maxHealth: baseHealth,
    speedX: (Math.random() - 0.5) * 2,
    speedY: 1 + Math.random() * 0.5,
    shootRate: 2000,
    shootTimer: Math.random() * 1000,
    frame: 0,
    frames: 2,
    animTimer: 0,
    value: 100,
    slowed: false,
    slowTimer: 0,
  }

  if (type === "shooter") {
    enemy.health = Math.max(15, 20 + wave * 4)
    enemy.maxHealth = enemy.health
    enemy.shootRate = 1500
    enemy.value = 150
  } else if (type === "zigzag") {
    enemy.health = Math.max(25, 30 + wave * 4)
    enemy.maxHealth = enemy.health
    enemy.speedX = 3 * (Math.random() > 0.5 ? 1 : -1)
    enemy.speedY = 0.8
    enemy.shootRate = 2000
    enemy.value = 200
    enemy.zigzagTimer = 0
  } else if (type === "homing") {
    enemy.health = Math.max(15, 20 + wave * 3)
    enemy.maxHealth = enemy.health
    enemy.speedX = 0
    enemy.speedY = 0.5
    enemy.shootRate = 3000
    enemy.value = 250
  }

  enemies.push(enemy)
}

function spawnBoss() {
  const boss = {
    type: "boss",
    x: canvas.width / 2 - 75,
    y: -100,
    width: 150,
    height: 100,
    health: 500 + wave * 100,
    maxHealth: 500 + wave * 100,
    speedX: 1,
    speedY: 0.5,
    shootRate: 1000,
    shootTimer: 0,
    frame: 0,
    frames: 3,
    animTimer: 0,
    value: 1000,
    attackPattern: "spread",
    slowed: false,
    slowTimer: 0,
  }

  enemies.push(boss)

  
  const warning = document.createElement("div")
  warning.textContent = "WARNING: BOSS APPROACHING"
  warning.style.position = "absolute"
  warning.style.top = "50%"
  warning.style.left = "50%"
  warning.style.transform = "translate(-50%, -50%)"
  warning.style.color = "#f00"
  warning.style.fontSize = "36px"
  warning.style.fontWeight = "bold"
  warning.style.textShadow = "0 0 10px rgba(255, 0, 0, 0.7)"
  warning.style.zIndex = "5"
  warning.style.animation = "pulse 0.5s infinite alternate"

  document.querySelector(".game-container").appendChild(warning)

  setTimeout(() => {
    warning.remove()
  }, 3000)

  
  document.querySelector(".game-container").classList.add("shake")
  setTimeout(() => {
    document.querySelector(".game-container").classList.remove("shake")
  }, 500)
}

function spawnPowerUp() {
  const types = ["health", "shield", "weapon", "score", "special"]
  const type = types[Math.floor(Math.random() * types.length)]

  const powerUp = {
    type: type,
    x: Math.random() * (canvas.width - 30),
    y: -30,
    width: 30,
    height: 30,
    speed: 1 + Math.random() * 0.5,
    floatOffset: 0,
  }

  powerUps.push(powerUp)
}


function spawnAsteroid() {
  const size = 20 + Math.random() * 40
  const x = Math.random() * canvas.width
  const speedX = (Math.random() - 0.5) * 2
  const speedY = 1 + Math.random() * 2
  const rotationSpeed = (Math.random() - 0.5) * 0.05

  asteroids.push({
    x: x,
    y: -size,
    size: size,
    speedX: speedX,
    speedY: speedY,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: rotationSpeed,
    vertices: generateAsteroidVertices(size),
  })
}


function generateAsteroidVertices(size) {
  const vertices = []
  const numVertices = 8 + Math.floor(Math.random() * 5)

  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2
    const distance = size * (0.7 + Math.random() * 0.3)

    vertices.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    })
  }

  return vertices
}

function checkCollisions() {
  
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j]

      if (checkCollision(bullet, enemy)) {
        enemy.health -= bullet.damage

        createHitParticles(bullet.x, bullet.y)

        bullets.splice(i, 1)

        if (enemy.health <= 0) {
          destroyEnemy(enemy)

          
          if (!achievements.firstBlood.unlocked) {
            unlockAchievement("firstBlood")
          }
        }

        break
      }
    }
  }

  
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]

    for (let j = asteroids.length - 1; j >= 0; j--) {
      const asteroid = asteroids[j]

      if (checkCircleCollision(bullet, asteroid)) {
        createHitParticles(bullet.x, bullet.y)
        bullets.splice(i, 1)

        
        if (asteroid.size > 30) {
          splitAsteroid(asteroid)
        }

        
        asteroids.splice(j, 1)

        
        score += 50

        break
      }
    }
  }

  
  if (!player.invulnerable) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i]

      if (checkCollision(bullet, player)) {
        if (player.shields > 0) {
          player.shields--
        } else {
          player.health -= bullet.damage

          if (player.health <= 0) {
            gameOver()
            return
          }

          player.invulnerable = true
          player.invulnerableTime = 1000

          
          document.querySelector(".game-container").classList.add("shake")
          setTimeout(() => {
            document.querySelector(".game-container").classList.remove("shake")
          }, 300)
        }

        createHitParticles(bullet.x, bullet.y)

        enemyBullets.splice(i, 1)
      }
    }
  }

  
  if (!player.invulnerable) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]

      if (checkCollision(enemy, player)) {
        if (player.shields > 0) {
          player.shields = 0
        } else {
          player.health -= 30

          if (player.health <= 0) {
            gameOver()
            return
          }

          player.invulnerable = true
          player.invulnerableTime = 1500

          
          document.querySelector(".game-container").classList.add("shake")
          setTimeout(() => {
            document.querySelector(".game-container").classList.remove("shake")
          }, 300)
        }

        destroyEnemy(enemy)
      }
    }
  }

  
  if (!player.invulnerable) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i]

      if (checkCircleCollision(player, asteroid)) {
        if (player.shields > 0) {
          player.shields--
        } else {
          player.health -= 20

          if (player.health <= 0) {
            gameOver()
            return
          }

          player.invulnerable = true
          player.invulnerableTime = 1000

          
          document.querySelector(".game-container").classList.add("shake")
          setTimeout(() => {
            document.querySelector(".game-container").classList.remove("shake")
          }, 300)
        }

        
        if (asteroid.size > 30) {
          splitAsteroid(asteroid)
        }

        
        asteroids.splice(i, 1)
      }
    }
  }

  
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i]

    if (checkCollision(powerUp, player)) {
      applyPowerUp(powerUp)

      powerUps.splice(i, 1)
    }
  }
}


function splitAsteroid(asteroid) {
  for (let i = 0; i < 2; i++) {
    const newSize = asteroid.size / 2

    asteroids.push({
      x: asteroid.x,
      y: asteroid.y,
      size: newSize,
      speedX: asteroid.speedX + (Math.random() - 0.5) * 2,
      speedY: asteroid.speedY + (Math.random() - 0.5),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      vertices: generateAsteroidVertices(newSize),
    })
  }

  
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 2

    particles.push({
      x: asteroid.x,
      y: asteroid.y,
      size: 2 + Math.random() * 3,
      speed: speed,
      angle: angle,
      color: "#aaa",
      alpha: 1,
      decay: 0.02 + Math.random() * 0.02,
    })
  }
}

function checkCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}


function checkCircleCollision(obj, circle) {
  
  const closestX = Math.max(obj.x, Math.min(circle.x, obj.x + obj.width))
  const closestY = Math.max(obj.y, Math.min(circle.y, obj.y + obj.height))

  
  const distanceX = circle.x - closestX
  const distanceY = circle.y - closestY
  const distanceSquared = distanceX * distanceX + distanceY * distanceY

  return distanceSquared < circle.size * circle.size
}

function destroyEnemy(enemy) {
  createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)

  score += enemy.value * scoreMultiplier

  enemiesDestroyed++

  
  if (score >= 1000 && !achievements.centurion.unlocked) {
    unlockAchievement("centurion")
  }

  
  if (enemiesDestroyed >= 50 && !achievements.destroyer.unlocked) {
    unlockAchievement("destroyer")
  }

  const index = enemies.indexOf(enemy)
  if (index !== -1) {
    enemies.splice(index, 1)
  }
}

function applyPowerUp(powerUp) {
  switch (powerUp.type) {
    case "health":
      player.health = Math.min(player.maxHealth, player.health + 30)
      createTextPopup(powerUp.x, powerUp.y, "+30 HEALTH", "#0f0")
      break
    case "shield":
      player.shields = Math.min(3, player.shields + 1)
      createTextPopup(powerUp.x, powerUp.y, "SHIELD", "#0ff")
      gameStats.shieldsCollected++

      
      if (gameStats.shieldsCollected >= 5 && !achievements.shieldmaster.unlocked) {
        unlockAchievement("shieldmaster")
      }
      break
    case "weapon":
      upgradeWeapon()
      createTextPopup(powerUp.x, powerUp.y, "WEAPON UP", "#f00")
      break
    case "score":
      scoreMultiplier = Math.min(4, scoreMultiplier + 0.5)
      createTextPopup(powerUp.x, powerUp.y, `x${scoreMultiplier} SCORE`, "#ff0")
      setTimeout(() => {
        scoreMultiplier = 1
      }, 10000)
      break
    case "special":
      
      createTextPopup(powerUp.x, powerUp.y, "SPECIAL READY", "#f0f")
      player.specialAbility.lastUsed = 0
      break
  }

  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    let color

    switch (powerUp.type) {
      case "health":
        color = "#0f0"
        break
      case "shield":
        color = "#0ff"
        break
      case "weapon":
        color = "#f00"
        break
      case "score":
        color = "#ff0"
        break
      case "special":
        color = "#f0f"
        break
    }

    particles.push({
      x: powerUp.x + powerUp.width / 2,
      y: powerUp.y + powerUp.height / 2,
      size: 3 + Math.random() * 5,
      speed: speed,
      angle: angle,
      color: color,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.02,
    })
  }
}

function upgradeWeapon() {
  if (player.weapon.type === "laser") {
    player.weapon.type = "double"
    player.weapon.damage = 12
  } else if (player.weapon.type === "double") {
    player.weapon.type = "triple"
    player.weapon.damage = 15
  } else if (player.weapon.type === "triple") {
    player.weapon.type = "quad"
    player.weapon.damage = 18
  } else if (player.weapon.type === "quad") {
    player.weapon.damage += 5
    player.weapon.cooldown = Math.max(150, player.weapon.cooldown - 25)
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3

    particles.push({
      x: x,
      y: y,
      size: 3 + Math.random() * 7,
      speed: speed,
      angle: angle,
      color: `hsl(${30 + Math.random() * 30}, 100%, 50%)`,
      alpha: 1,
      decay: 0.01 + Math.random() * 0.02,
    })
  }
}

function createHitParticles(x, y) {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 2

    particles.push({
      x: x,
      y: y,
      size: 2 + Math.random() * 3,
      speed: speed,
      angle: angle,
      color: "#fff",
      alpha: 1,
      decay: 0.05 + Math.random() * 0.05,
    })
  }
}

function createTextPopup(x, y, text, color) {
  const popup = document.createElement("div")
  popup.className = "text-popup"
  popup.textContent = text
  popup.style.position = "absolute"
  popup.style.left = `${x}px`
  popup.style.top = `${y}px`
  popup.style.color = color
  popup.style.fontFamily = "Orbitron, sans-serif"
  popup.style.fontWeight = "bold"
  popup.style.fontSize = "16px"
  popup.style.textShadow = `0 0 5px ${color}`
  popup.style.zIndex = "5"
  popup.style.pointerEvents = "none"
  popup.style.transition = "transform 1s, opacity 1s"
  popup.style.opacity = "1"

  document.querySelector(".game-container").appendChild(popup)

  setTimeout(() => {
    popup.style.transform = "translateY(-50px)"
    popup.style.opacity = "0"
  }, 100)

  setTimeout(() => {
    popup.remove()
  }, 1100)
}

function completeWave() {
  gamePaused = true
  cancelAnimationFrame(animationFrame)

  document.getElementById("completed-wave").textContent = wave
  document.getElementById("wave-score").textContent = score
  document.getElementById("next-wave").textContent = wave + 1

  document.getElementById("level-up-screen").classList.remove("hidden")

  
  if (wave >= 5 && !achievements.wavemaster.unlocked) {
    unlockAchievement("wavemaster")
  }

  const upgradeOptions = document.querySelectorAll(".upgrade-option")
  upgradeOptions.forEach((option) => {
    option.classList.remove("selected")

    const newOption = option.cloneNode(true)
    option.parentNode.replaceChild(newOption, option)

    newOption.addEventListener("click", function () {
      upgradeOptions.forEach((opt) => opt.classList.remove("selected"))
      this.classList.add("selected")
    })
  })

  setTimeout(() => {
    if (!document.querySelector(".upgrade-option.selected")) {
      document.querySelector(".upgrade-option").classList.add("selected")
    }
  }, 100)

  const continueButton = document.getElementById("continue-button")

  const newContinueButton = continueButton.cloneNode(true)
  continueButton.parentNode.replaceChild(newContinueButton, continueButton)

  newContinueButton.addEventListener("click", () => {
    const selectedUpgrade = document.querySelector(".upgrade-option.selected")
    if (selectedUpgrade) {
      const upgradeType = selectedUpgrade.getAttribute("data-upgrade")
      applyUpgrade(upgradeType)
    }

    wave++

    waveTimer = 0

    document.getElementById("wave-number").textContent = wave

    document.getElementById("level-up-screen").classList.add("hidden")

    gamePaused = false
    lastTime = performance.now()
    gameLoop(lastTime)
  })
}

function applyUpgrade(type) {
  switch (type) {
    case "weapon":
      player.upgrades.weaponPower += 0.25
      break
    case "health":
      player.upgrades.healthMax += 0.2
      player.maxHealth = player.maxHealth * 1.2
      player.health = player.maxHealth
      break
    case "speed":
      player.upgrades.speed += 0.15
      break
    case "special":
      player.upgrades.specialCooldown += 0.2
      break
  }
}

function gameOver() {
  gameActive = false
  cancelAnimationFrame(animationFrame)

  if (score > highScore) {
    highScore = score
    localStorage.setItem("highScore", highScore)
  }

  document.getElementById("final-score").textContent = score
  document.getElementById("high-score").textContent = highScore
  document.getElementById("waves-survived").textContent = wave
  document.getElementById("enemies-destroyed").textContent = enemiesDestroyed
  document.getElementById("time-survived").textContent = formatTime(gameTime)

  document.getElementById("game-over-screen").classList.remove("hidden")

  const restartButton = document.getElementById("restart-button")
  const newRestartButton = restartButton.cloneNode(true)
  restartButton.parentNode.replaceChild(newRestartButton, restartButton)

  newRestartButton.addEventListener("click", () => {
    document.getElementById("game-over-screen").classList.add("hidden")

    init()

    startGame()
  })
}


function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}


function checkAchievements() {
  
  if (gameStats.timePlayed >= 120 && !achievements.survivor.unlocked) {
    unlockAchievement("survivor")
  }
}


function unlockAchievement(id) {
  if (achievements[id] && !achievements[id].unlocked) {
    achievements[id].unlocked = true

    
    const achievementPopup = document.getElementById("achievement-popup")
    achievementPopup.querySelector(".achievement-name").textContent = achievements[id].name
    achievementPopup.classList.add("show")

    
    setTimeout(() => {
      achievementPopup.classList.remove("show")
    }, 3000)

    
    

    
    localStorage.setItem("achievements", JSON.stringify(achievements))
  }
}

function render() {
  renderStars()

  renderParticles()

  renderPowerUps()

  renderBullets()

  renderEnemyBullets()

  renderAsteroids()

  renderEnemies()

  renderPlayer()
}

function renderStars() {
  ctx.fillStyle = "#fff"

  stars.forEach((star) => {
    ctx.globalAlpha = 0.5 + star.size / 3
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.globalAlpha = 1
}

function renderParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = particle.alpha
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.globalAlpha = 1
}

function renderPowerUps() {
  powerUps.forEach((powerUp) => {
    let color

    switch (powerUp.type) {
      case "health":
        color = "#0f0"
        break
      case "shield":
        color = "#0ff"
        break
      case "weapon":
        color = "#f00"
        break
      case "score":
        color = "#ff0"
        break
      case "special":
        color = "#f0f"
        break
    }

    ctx.shadowBlur = 15
    ctx.shadowColor = color

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(
      powerUp.x + powerUp.width / 2,
      powerUp.y + powerUp.height / 2 + powerUp.floatOffset,
      powerUp.width / 2,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(
      powerUp.x + powerUp.width / 2,
      powerUp.y + powerUp.height / 2 + powerUp.floatOffset,
      powerUp.width / 4,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.shadowBlur = 0
  })
}

function renderBullets() {
  bullets.forEach((bullet) => {
    ctx.shadowBlur = 10
    ctx.shadowColor = bullet.color

    ctx.fillStyle = bullet.color
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)

    ctx.shadowBlur = 0
  })
}

function renderEnemyBullets() {
  enemyBullets.forEach((bullet) => {
    ctx.shadowBlur = 10
    ctx.shadowColor = bullet.color

    ctx.fillStyle = bullet.color
    if (bullet.angle) {
      ctx.beginPath()
      ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    }

    ctx.shadowBlur = 0
  })
}


function renderAsteroids() {
  asteroids.forEach((asteroid) => {
    ctx.save()
    ctx.translate(asteroid.x, asteroid.y)
    ctx.rotate(asteroid.rotation)

    ctx.fillStyle = "#aaa"
    ctx.beginPath()
    ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y)

    for (let i = 1; i < asteroid.vertices.length; i++) {
      ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y)
    }

    ctx.closePath()
    ctx.fill()

    ctx.restore()
  })
}

function renderEnemies() {
  enemies.forEach((enemy) => {
    let color

    switch (enemy.type) {
      case "basic":
        color = "#f00"
        break
      case "shooter":
        color = "#f70"
        break
      case "zigzag":
        color = "#f0f"
        break
      case "homing":
        color = "#0f0"
        break
      case "boss":
        color = "#f0f"
        break
    }

    
    if (enemy.slowed) {
      ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200) * 0.2
    }

    ctx.shadowBlur = 15
    ctx.shadowColor = color

    ctx.fillStyle = color
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)

    ctx.fillStyle = "#fff"

    if (enemy.type === "basic") {
      ctx.fillRect(enemy.x + 10, enemy.y + 10, 5, 5)
      ctx.fillRect(enemy.x + enemy.width - 15, enemy.y + 10, 5, 5)

      ctx.fillRect(enemy.x + 15, enemy.y + 25, 10, 5)
    } else if (enemy.type === "shooter") {
      ctx.beginPath()
      ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 4, 0, Math.PI * 2)
      ctx.fill()
    } else if (enemy.type === "zigzag") {
      
      ctx.beginPath()
      ctx.moveTo(enemy.x + 10, enemy.y + 10)
      ctx.lineTo(enemy.x + 20, enemy.y + 20)
      ctx.lineTo(enemy.x + 30, enemy.y + 10)
      ctx.stroke()

      
      ctx.fillRect(enemy.x + 10, enemy.y + 25, 5, 5)
      ctx.fillRect(enemy.x + enemy.width - 15, enemy.y + 25, 5, 5)
    } else if (enemy.type === "homing") {
      
      ctx.beginPath()
      ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 8, 0, Math.PI * 2)
      ctx.fill()
    } else if (enemy.type === "boss") {
      ctx.fillRect(enemy.x + 30, enemy.y + 30, 15, 15)
      ctx.fillRect(enemy.x + enemy.width - 45, enemy.y + 30, 15, 15)

      ctx.fillRect(enemy.x + 50, enemy.y + 60, 50, 10)
    }

    const healthPercent = enemy.health / enemy.maxHealth
    ctx.fillStyle = "#333"
    ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5)
    ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.2 ? "#ff0" : "#f00"
    ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * healthPercent, 5)

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  })
}

function renderPlayer() {
  if (player.invulnerable && Math.floor(performance.now() / 100) % 2 === 0) {
    return
  }

  ctx.shadowBlur = 15
  ctx.shadowColor = "#0ff"

  ctx.fillStyle = player.color

  
  if (selectedShipType === "fighter") {
    
    ctx.beginPath()
    ctx.moveTo(player.x + player.width / 2, player.y)
    ctx.lineTo(player.x + player.width, player.y + player.height)
    ctx.lineTo(player.x, player.y + player.height)
    ctx.closePath()
    ctx.fill()

    
    ctx.fillStyle = "#fff"
    ctx.fillRect(player.x + player.width / 2 - 5, player.y + 10, 10, 30)
  } else if (selectedShipType === "tank") {
    
    ctx.beginPath()
    ctx.moveTo(player.x + player.width * 0.2, player.y)
    ctx.lineTo(player.x + player.width * 0.8, player.y)
    ctx.lineTo(player.x + player.width, player.y + player.height)
    ctx.lineTo(player.x, player.y + player.height)
    ctx.closePath()
    ctx.fill()

    
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 15, 0, Math.PI * 2)
    ctx.fill()
  } else if (selectedShipType === "scout") {
    
    ctx.beginPath()
    ctx.moveTo(player.x + player.width / 2, player.y)
    ctx.lineTo(player.x + player.width, player.y + player.height / 2)
    ctx.lineTo(player.x + player.width / 2, player.y + player.height)
    ctx.lineTo(player.x, player.y + player.height / 2)
    ctx.closePath()
    ctx.fill()

    
    ctx.fillStyle = "#fff"
    ctx.fillRect(player.x + player.width / 2 - 2.5, player.y + 10, 5, 30)
  }

  
  ctx.fillStyle = "#f70"
  ctx.fillRect(player.x + player.width * 0.2, player.y + player.height - 5, player.width * 0.2, 10)
  ctx.fillRect(player.x + player.width * 0.6, player.y + player.height - 5, player.width * 0.2, 10)

  
  if (player.shields > 0) {
    ctx.strokeStyle = "#0ff"
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 1.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.shadowBlur = 0
}

function updateUI() {
  document.getElementById("score").textContent = score
  document.getElementById("multiplier").textContent = `x${scoreMultiplier}`

  const healthPercent = (player.health / player.maxHealth) * 100
  document.getElementById("health-fill").style.width = `${healthPercent}%`

  const shieldSegments = document.querySelectorAll(".shield-segment")
  shieldSegments.forEach((segment, index) => {
    segment.classList.toggle("active", index < player.shields)
  })

  document.getElementById("wave-number").textContent = wave

  
  const timeSinceLastFired = performance.now() - player.weapon.lastFired
  const cooldownPercentage = Math.min(timeSinceLastFired / player.weapon.cooldown, 1)
  document.getElementById("weapon-cooldown").style.setProperty("--cooldown-scale", cooldownPercentage)

  
  const timeSinceLastSpecial = performance.now() - player.specialAbility.lastUsed
  const specialCooldownPercentage = Math.min(
    timeSinceLastSpecial / (player.specialAbility.cooldown / player.upgrades.specialCooldown),
    1,
  )
  document.getElementById("special-cooldown").style.setProperty("--special-cooldown-scale", specialCooldownPercentage)
}


function getEnemySpawnRate() {
  return Math.max(500, 2000 - wave * 150)
}

function getPowerUpSpawnRate() {
  return Math.max(5000, 10000 - wave * 300)
}

function getWaveDuration() {
  return Math.max(45000, 60000 - (wave === 1 ? 20000 : 0))
}

function getAsteroidSpawnRate() {
  return Math.max(3000, 8000 - wave * 500)
}


function setupEventListeners() {
  
  const shipOptions = document.querySelectorAll(".ship-option")
  shipOptions.forEach((option) => {
    option.addEventListener("click", function () {
      shipOptions.forEach((opt) => opt.classList.remove("selected"))
      this.classList.add("selected")
      selectedShipType = this.getAttribute("data-ship")
    })
  })

  const startButton = document.getElementById("start-button")
  const restartButton = document.getElementById("restart-button")
  const menuButton = document.getElementById("menu-button")
  const resumeButton = document.getElementById("resume-button")
  const quitButton = document.getElementById("quit-button")
  const instructionsButton = document.getElementById("instructions-button")
  const backButton = document.getElementById("back-button")

  const newStartButton = startButton.cloneNode(true)
  const newRestartButton = restartButton.cloneNode(true)
  const newMenuButton = menuButton.cloneNode(true)
  const newResumeButton = resumeButton.cloneNode(true)
  const newQuitButton = quitButton.cloneNode(true)
  const newInstructionsButton = instructionsButton.cloneNode(true)
  const newBackButton = backButton.cloneNode(true)

  startButton.parentNode.replaceChild(newStartButton, startButton)
  restartButton.parentNode.replaceChild(newRestartButton, restartButton)
  menuButton.parentNode.replaceChild(newMenuButton, menuButton)
  resumeButton.parentNode.replaceChild(newResumeButton, resumeButton)
  quitButton.parentNode.replaceChild(newQuitButton, quitButton)
  instructionsButton.parentNode.replaceChild(newInstructionsButton, instructionsButton)
  backButton.parentNode.replaceChild(newBackButton, backButton)

  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "w":
        keys.w = true
        break
      case "a":
        keys.a = true
        break
      case "s":
        keys.s = true
        break
      case "d":
        keys.d = true
        break
      case " ":
        keys.space = true
        break
      case "shift":
        keys.shift = true
        break
      case "p":
        if (gameActive) {
          togglePause()
        }
        break
    }
  })

  window.addEventListener("keyup", (e) => {
    switch (e.key.toLowerCase()) {
      case "w":
        keys.w = false
        break
      case "a":
        keys.a = false
        break
      case "s":
        keys.s = false
        break
      case "d":
        keys.d = false
        break
      case " ":
        keys.space = false
        break
      case "shift":
        keys.shift = false
        break
    }
  })

  newStartButton.addEventListener("click", startGame)

  newRestartButton.addEventListener("click", () => {
    init()
    startGame()
  })
  newMenuButton.addEventListener("click", init)
  newResumeButton.addEventListener("click", togglePause)
  newQuitButton.addEventListener("click", init)
  newInstructionsButton.addEventListener("click", showInstructions)
  newBackButton.addEventListener("click", hideInstructions)
}

function togglePause() {
  if (!gameActive) return

  gamePaused = !gamePaused

  if (gamePaused) {
    cancelAnimationFrame(animationFrame)
    document.getElementById("pause-screen").classList.remove("hidden")

    
    document.getElementById("pause-score").textContent = score
    document.getElementById("pause-wave").textContent = wave
    document.getElementById("pause-enemies").textContent = enemiesDestroyed
  } else {
    document.getElementById("pause-screen").classList.add("hidden")
    lastTime = performance.now()
    gameLoop(lastTime)
  }
}

function showInstructions() {
  document.getElementById("start-screen").classList.add("hidden")
  document.getElementById("instructions-screen").classList.remove("hidden")
}

function hideInstructions() {
  document.getElementById("instructions-screen").classList.add("hidden")
  document.getElementById("start-screen").classList.remove("hidden")
}


function loadAchievements() {
  const savedAchievements = localStorage.getItem("achievements")
  if (savedAchievements) {
    const parsed = JSON.parse(savedAchievements)
    for (const key in parsed) {
      if (achievements[key]) {
        achievements[key].unlocked = parsed[key].unlocked
      }
    }
  }
}

window.onload = () => {
  init()
  initStars()
  loadAchievements()
}

