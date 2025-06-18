class ChamaApp {
  constructor() {
    this.currentPage = "home"
    this.currentSession = null
    this.darkMode = localStorage.getItem("darkMode") === "true"
    this.init()
  }

  init() {
    this.initDarkMode()
    this.bindEvents()
    this.checkURL()
    this.updateSizePreview()
    this.cleanupOldSessions()
  }

  initDarkMode() {
    if (this.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }

  bindEvents() {
    // Dark mode toggle
    document.getElementById("darkModeToggle").addEventListener("click", () => {
      this.toggleDarkMode()
    })

    // Home page events
    document.getElementById("groupSize").addEventListener("input", () => {
      this.updateSizePreview()
    })

    document.getElementById("createSessionBtn").addEventListener("click", () => {
      this.createSession()
    })

    // Session page events
    document.getElementById("copyBtn").addEventListener("click", () => {
      this.copyLink()
    })

    document.getElementById("whatsappBtn").addEventListener("click", () => {
      this.shareOnWhatsApp()
    })

    document.getElementById("qrCodeBtn").addEventListener("click", () => {
      this.showQRCode()
    })

    document.getElementById("viewResultsBtn").addEventListener("click", () => {
      this.showResults()
    })

    document.getElementById("newSessionBtn").addEventListener("click", () => {
      this.showPage("home")
      this.resetForm()
    })

    // Results page events
    document.getElementById("refreshResultsBtn").addEventListener("click", () => {
      this.updateResults()
    })

    document.getElementById("exportResultsBtn").addEventListener("click", () => {
      this.exportResults()
    })

    document.getElementById("backToSessionBtn").addEventListener("click", () => {
      this.showPage("session")
    })

    // Draw page events
    document.getElementById("drawNumberBtn").addEventListener("click", () => {
      this.drawNumber()
    })

    document.getElementById("shareResultBtn").addEventListener("click", () => {
      this.shareResult()
    })

    // Modal events
    document.getElementById("closeQrModal").addEventListener("click", () => {
      this.hideQRCode()
    })

    document.getElementById("qrModal").addEventListener("click", (e) => {
      if (e.target.id === "qrModal") {
        this.hideQRCode()
      }
    })

    // Keyboard events
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideQRCode()
      }
    })
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode
    localStorage.setItem("darkMode", this.darkMode.toString())

    if (this.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-theme")
    }

    this.showToast("Theme updated!", "success")
  }

  checkURL() {
    const path = window.location.pathname
    const hash = window.location.hash

    if (path === "/" && hash.startsWith("#draw/")) {
      const sessionId = hash.replace("#draw/", "")
      this.loadDrawPage(sessionId)
    } else {
      this.showPage("home")
    }
  }

  updateSizePreview() {
    const size = document.getElementById("groupSize").value
    document.getElementById("sizePreview").textContent = size || "X"
  }

  createSession() {
    const groupName = document.getElementById("groupName").value.trim() || "CHAMA Group"
    const groupSize = Number.parseInt(document.getElementById("groupSize").value)
    const groupDescription = document.getElementById("groupDescription").value.trim()

    if (!groupSize || groupSize < 2 || groupSize > 100) {
      this.showToast("Please enter a valid group size (2-100 members)", "error")
      return
    }

    // Show loading state briefly
    const createBtn = document.getElementById("createSessionBtn")
    const originalText = createBtn.innerHTML
    createBtn.innerHTML = '<span class="btn-icon">✨</span>Creating...'
    createBtn.disabled = true

    // Generate session immediately (remove setTimeout)
    const sessionId = this.generateSessionId()

    // Create session data
    const session = {
      id: sessionId,
      groupName: groupName,
      groupSize: groupSize,
      groupDescription: groupDescription,
      availableNumbers: Array.from({ length: groupSize }, (_, i) => i + 1),
      drawnNumbers: [],
      createdAt: new Date().toISOString(),
    }

    // Save to localStorage
    localStorage.setItem(`chama_session_${sessionId}`, JSON.stringify(session))

    // Generate shareable link
    const shareableLink = `${window.location.origin}/#draw/${sessionId}`

    // Update UI
    document.getElementById("totalMembers").textContent = groupSize
    document.getElementById("maxNumber").textContent = groupSize
    document.getElementById("shareableLink").value = shareableLink
    document.getElementById("getMyNumberBtn").href = shareableLink
    document.getElementById("sessionGroupName").textContent = groupName
    document.getElementById("sessionGroupSize").textContent = groupSize
    document.getElementById("sessionId").textContent = sessionId

    this.currentSession = session
    this.showPage("session")
    this.showToast("🎉 Session created instantly!", "success")
    this.playSound()

    // Reset button immediately
    createBtn.innerHTML = originalText
    createBtn.disabled = false
  }

  loadDrawPage(sessionId) {
    const sessionData = localStorage.getItem(`chama_session_${sessionId}`)

    if (!sessionData) {
      this.showDrawError("Session not found or expired")
      return
    }

    try {
      const session = JSON.parse(sessionData)

      // Check if session is expired (24 hours)
      const createdAt = new Date(session.createdAt)
      const now = new Date()
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60)

      if (hoursDiff > 24) {
        localStorage.removeItem(`chama_session_${sessionId}`)
        this.showDrawError("Session has expired (24 hours)")
        return
      }

      this.currentSession = session
      this.updateDrawPageUI()
      this.showPage("draw")
    } catch (error) {
      this.showDrawError("Invalid session data")
    }
  }

  updateDrawPageUI() {
    const session = this.currentSession

    document.getElementById("drawGroupName").textContent = session.groupName
    document.getElementById("drawGroupDescription").textContent = session.groupDescription || "Draw your unique number"
    document.getElementById("numbersDrawn").textContent = session.drawnNumbers.length
    document.getElementById("totalNumbers").textContent = session.groupSize
    document.getElementById("remainingNumbers").textContent = session.availableNumbers.length
    document.getElementById("maxNumberInfo").textContent = session.groupSize

    // Check if user has already drawn
    const userFingerprint = this.getUserFingerprint()
    const hasDrawn = session.drawnNumbers.some((draw) => draw.fingerprint === userFingerprint)

    if (hasDrawn) {
      const userDraw = session.drawnNumbers.find((draw) => draw.fingerprint === userFingerprint)
      this.showDrawResult(userDraw.number)
    } else if (session.availableNumbers.length === 0) {
      this.showDrawError("All numbers have been drawn for this session")
    }
  }

  drawNumber() {
    if (!this.currentSession) return

    const session = this.currentSession
    const userFingerprint = this.getUserFingerprint()

    // Check if user has already drawn
    const hasDrawn = session.drawnNumbers.some((draw) => draw.fingerprint === userFingerprint)
    if (hasDrawn) {
      this.showToast("You have already drawn a number for this session", "warning")
      return
    }

    // Check if numbers are available
    if (session.availableNumbers.length === 0) {
      this.showDrawError("All numbers have been drawn for this session")
      return
    }

    // Show loading state
    const drawBtn = document.getElementById("drawNumberBtn")
    const originalText = drawBtn.innerHTML
    drawBtn.innerHTML = '<span class="btn-icon">🎲</span><span class="btn-text">Drawing...</span>'
    drawBtn.disabled = true

    // Add suspense with timeout
    setTimeout(() => {
      // Draw random number
      const randomIndex = Math.floor(Math.random() * session.availableNumbers.length)
      const drawnNumber = session.availableNumbers[randomIndex]

      // Remove from available numbers
      session.availableNumbers.splice(randomIndex, 1)

      // Add to drawn numbers
      session.drawnNumbers.push({
        number: drawnNumber,
        fingerprint: userFingerprint,
        timestamp: new Date().toISOString(),
      })

      // Save updated session
      localStorage.setItem(`chama_session_${session.id}`, JSON.stringify(session))

      // Show result with celebration
      this.showDrawResult(drawnNumber)
      this.showToast(`🎉 You drew number ${drawnNumber}!`, "success")
      this.playSound()
      this.createConfetti()

      // Reset button  "success")
      this.playSound()
      this.createConfetti()

      // Reset button
      drawBtn.innerHTML = originalText
      drawBtn.disabled = false
    }, 800)
  }

  showDrawResult(number) {
    document.getElementById("beforeDraw").classList.add("hidden")
    document.getElementById("afterDraw").classList.remove("hidden")

    document.getElementById("drawnNumber").textContent = number
    document.getElementById("finalNumbersDrawn").textContent = this.currentSession.drawnNumbers.length
    document.getElementById("finalTotalNumbers").textContent = this.currentSession.groupSize

    // Update explanation
    const explanationText =
      number === 1
        ? "🥇 Congratulations! You are number 1 in the rotation. You'll be the first to receive contributions!"
        : `You are number ${number} in the rotation. You'll receive contributions when it's the ${this.getOrdinalSuffix(number)} person's turn.`

    document.getElementById("explanationText").textContent = explanationText
  }

  showDrawError(message) {
    document.getElementById("beforeDraw").classList.add("hidden")
    document.getElementById("afterDraw").classList.add("hidden")
    document.getElementById("errorState").classList.remove("hidden")
    document.getElementById("errorMessage").textContent = message
  }

  showResults() {
    if (!this.currentSession) return

    document.getElementById("resultsGroupName").textContent = this.currentSession.groupName
    this.updateResults()
    this.showPage("results")
  }

  updateResults() {
    if (!this.currentSession) return

    const session = JSON.parse(localStorage.getItem(`chama_session_${this.currentSession.id}`))
    if (!session) return

    this.currentSession = session

    const drawnCount = session.drawnNumbers.length
    const totalCount = session.groupSize
    const remainingCount = session.availableNumbers.length
    const progressPercent = Math.round((drawnCount / totalCount) * 100)

    document.getElementById("drawnCount").textContent = drawnCount
    document.getElementById("remainingCount").textContent = remainingCount
    document.getElementById("progressPercent").textContent = `${progressPercent}%`
    document.getElementById("progressFill").style.width = `${progressPercent}%`

    // Update drawn numbers list
    const drawnList = document.getElementById("drawnNumbersList")
    if (session.drawnNumbers.length > 0) {
      drawnList.innerHTML = `
        <h4>🎯 Drawn Numbers</h4>
        <div class="numbers-grid">
          ${session.drawnNumbers
            .sort((a, b) => a.number - b.number)
            .map(
              (draw) => `
            <div class="number-badge drawn" title="Drawn on ${new Date(draw.timestamp).toLocaleString()}">
              ${draw.number}
            </div>
          `,
            )
            .join("")}
        </div>
      `
    } else {
      drawnList.innerHTML = `
        <div class="text-center" style="padding: 40px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 16px;">🎲</div>
          <p>No numbers drawn yet</p>
        </div>
      `
    }

    // Update available numbers
    const availableList = document.getElementById("availableNumbersList")
    if (session.availableNumbers.length > 0) {
      document.getElementById("availableGrid").innerHTML = session.availableNumbers
        .sort((a, b) => a - b)
        .map(
          (num) => `
        <div class="number-badge available">
          ${num}
        </div>
      `,
        )
        .join("")
    } else {
      availableList.innerHTML = `
        <div class="text-center" style="padding: 40px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 16px;">🎉</div>
          <h4>All numbers have been drawn!</h4>
          <p>The session is complete</p>
        </div>
      `
    }
  }

  exportResults() {
    if (!this.currentSession) return

    const session = this.currentSession
    const data = {
      groupName: session.groupName,
      groupSize: session.groupSize,
      groupDescription: session.groupDescription,
      sessionId: session.id,
      createdAt: session.createdAt,
      drawnNumbers: session.drawnNumbers.map((draw) => ({
        number: draw.number,
        timestamp: draw.timestamp,
      })),
      availableNumbers: session.availableNumbers,
      progress: `${session.drawnNumbers.length}/${session.groupSize}`,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chama-results-${session.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.showToast("📥 Results exported successfully!", "success")
  }

  shareResult() {
    if (!this.currentSession) return

    const userFingerprint = this.getUserFingerprint()
    const userDraw = this.currentSession.drawnNumbers.find((draw) => draw.fingerprint === userFingerprint)

    if (!userDraw) return

    const shareText = `🎯 I got number ${userDraw.number} in our ${this.currentSession.groupName} rotation! 
    
Join our CHAMA group: ${window.location.origin}/#draw/${this.currentSession.id}`

    if (navigator.share) {
      navigator.share({
        title: "CHAMA Number Draw Result",
        text: shareText,
      })
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast("📤 Result copied to clipboard!", "success")
      })
    }
  }

  copyLink() {
    const linkInput = document.getElementById("shareableLink")
    linkInput.select()
    linkInput.setSelectionRange(0, 99999)

    try {
      navigator.clipboard.writeText(linkInput.value).then(() => {
        const copyBtn = document.getElementById("copyBtn")
        copyBtn.classList.add("copied")
        this.showToast("📋 Link copied to clipboard!", "success")

        setTimeout(() => {
          copyBtn.classList.remove("copied")
        }, 2000)
      })
    } catch (err) {
      document.execCommand("copy")
      this.showToast("📋 Link copied!", "success")
    }
  }

  shareOnWhatsApp() {
    const link = document.getElementById("shareableLink").value
    const message = `🎯 Join our ${this.currentSession?.groupName || "CHAMA"} number draw!
    
Each person gets a unique number to determine the rotation order.

Click here to get your number: ${link}

Powered by CHAMA Draw 🚀`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  showQRCode() {
    const link = document.getElementById("shareableLink").value
    const modal = document.getElementById("qrModal")
    const canvas = document.getElementById("qrCanvas")

    // Simple QR code generation (you could use a library like qrcode.js for better results)
    this.generateQRCode(canvas, link)
    modal.classList.remove("hidden")
  }

  hideQRCode() {
    document.getElementById("qrModal").classList.add("hidden")
  }

  generateQRCode(canvas, text) {
    // Simple QR code placeholder - in production, use a proper QR code library
    const ctx = canvas.getContext("2d")
    canvas.width = 200
    canvas.height = 200

    // Create a simple pattern as placeholder
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = "#fff"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("QR Code", 100, 90)
    ctx.fillText("Scan to join", 100, 110)
    ctx.fillText("session", 100, 130)

    // Add some pattern
    for (let i = 0; i < 200; i += 20) {
      for (let j = 0; j < 200; j += 20) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = "#fff"
          ctx.fillRect(i, j, 10, 10)
        }
      }
    }
  }

  createConfetti() {
    const container = document.getElementById("confettiContainer")
    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7"]

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div")
      confetti.className = "confetti"
      confetti.style.left = Math.random() * 100 + "%"
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.animationDelay = Math.random() * 3 + "s"
      confetti.style.animationDuration = Math.random() * 2 + 2 + "s"
      container.appendChild(confetti)

      // Remove confetti after animation
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti)
        }
      }, 5000)
    }
  }

  playSound() {
    try {
      const audio = document.getElementById("drawSound")
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      })
    } catch (error) {
      // Ignore audio errors
    }
  }

  showPage(pageName) {
    // Hide all pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active")
    })

    // Show selected page
    document.getElementById(`${pageName}Page`).classList.add("active")
    this.currentPage = pageName

    // Update URL without page reload
    if (pageName === "home") {
      window.history.pushState({}, "", "/")
    }
  }

  resetForm() {
    document.getElementById("groupName").value = ""
    document.getElementById("groupSize").value = ""
    document.getElementById("groupDescription").value = ""
    this.updateSizePreview()
    this.currentSession = null
  }

  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  getUserFingerprint() {
    // Enhanced browser fingerprinting
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("CHAMA fingerprint", 2, 2)

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
    ].join("|")

    return this.hashCode(fingerprint).toString()
  }

  hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  getOrdinalSuffix(num) {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return num + "st"
    if (j === 2 && k !== 12) return num + "nd"
    if (j === 3 && k !== 13) return num + "rd"
    return num + "th"
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    container.appendChild(toast)

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = "toastSlideIn 0.3s ease-out reverse"
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 4000)
  }

  cleanupOldSessions() {
    const keys = Object.keys(localStorage)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    keys.forEach((key) => {
      if (key.startsWith("chama_session_")) {
        try {
          const session = JSON.parse(localStorage.getItem(key))
          const createdAt = new Date(session.createdAt)
          if (createdAt < oneDayAgo) {
            localStorage.removeItem(key)
          }
        } catch (error) {
          // Remove invalid session data
          localStorage.removeItem(key)
        }
      }
    })
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ChamaApp()
})

// Handle browser back/forward
window.addEventListener("popstate", () => {
  window.location.reload()
})

// Handle visibility change to refresh results
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && window.chamaApp && window.chamaApp.currentPage === "results") {
    window.chamaApp.updateResults()
  }
})

// Store app instance globally for debugging
window.addEventListener("load", () => {
  if (window.chamaApp) {
    window.chamaApp = new ChamaApp()
  }
})
