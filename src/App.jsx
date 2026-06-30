import React, { useState, useEffect, useCallback } from 'react'
import { api, setToken, clearAuth } from './api'

// ─── Constantes ───────────────────────────────────────────────
const TABS = ['dashboard','servers','scoreboard','tablist','bossbar','actionbar','chat','nametag','navigation','afk','rewards','channels','chatbot','database','code']
const COLOR_CODES = ['&0','&1','&2','&3','&4','&5','&6','&7','&8','&9','&a','&b','&c','&d','&e','&f','&l','&n','&o','&m','&k','&r']
const COLOR_MAP = {'0':'#000','1':'#00A','2':'#0A0','3':'#0AA','4':'#A00','5':'#A0A','6':'#FA0','7':'#AAA','8':'#555','9':'#55F','a':'#5F5','b':'#5FF','c':'#F55','d':'#F5F','e':'#FF5','f':'#FFF'}

function mcColor(text) {
  if (!text) return ''
  let result = ''
  let i = 0
  let currentColor = '#AAA'
  let bold = false
  while (i < text.length) {
    if (text[i] === '&' && i + 1 < text.length) {
      const code = text[i+1]
      if (COLOR_MAP[code]) { currentColor = COLOR_MAP[code]; bold = false }
      else if (code === 'l') bold = true
      else if (code === 'r') { currentColor = '#AAA'; bold = false }
      i += 2
    } else {
      const style = `color:${currentColor};${bold ? 'font-weight:700;' : ''}`
      result += `<span style="${style}">${text[i].replace(/</g,'&lt;')}</span>`
      i++
    }
  }
  return result
}

function MCPreview({ text, className = '' }) {
  return <span className={`font-mono text-sm ${className}`} dangerouslySetInnerHTML={{ __html: mcColor(text) }} />
}

function Btn({ onClick, children, className = '', disabled = false, variant = 'default' }) {
  const base = 'px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5'
  const variants = {
    default: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    danger:  'bg-red-900/50 hover:bg-red-800/60 text-red-400 border border-red-800',
    green:   'bg-green-900/50 hover:bg-green-800/60 text-green-400 border border-green-800',
  }
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>
}

function Input({ value, onChange, placeholder, className = '', type = 'text', ...rest }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors ${className}`} {...rest} />
}

function TextArea({ value, onChange, placeholder, rows = 3, className = '' }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className={`w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors resize-y ${className}`} />
}

function Select({ value, onChange, children, className = '' }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className={`bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 ${className}`}>
    {children}
  </select>
}

function Card({ children, className = '' }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}>{children}</div>
}

function Badge({ children, color = 'zinc' }) {
  const colors = { zinc:'bg-zinc-800 text-zinc-400', green:'bg-green-900/40 text-green-400', red:'bg-red-900/40 text-red-400', cyan:'bg-cyan-900/40 text-cyan-400', yellow:'bg-yellow-900/40 text-yellow-400' }
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[color]}`}>{children}</span>
}

function StatusDot({ online }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-zinc-600'}`} />
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [auth, setAuth]     = useState(false)
  const [user, setUser]     = useState(null)
  const [tab, setTab]       = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs]     = useState(['[VertexMC] Panel initialisé.'])

  // Auth forms
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPass, setAuthPass]   = useState('')
  const [authUser, setAuthUser]   = useState('')
  const [authErr, setAuthErr]     = useState('')

  // Servers
  const [servers, setServers]       = useState([])
  const [selServer, setSelServer]   = useState(null)
  const [newSrvName, setNewSrvName] = useState('')

  // Configs locales (pour le serveur sélectionné)
  const [scoreboards, setScoreboards] = useState([{ id:'1', name:'Scoreboard Défaut', title:'&b&lVERTEX-MC', lines:['&8—————————','&fJoueur: &a%player_name%','&fGrade: &e%vault_prefix%','&fArgent: &e%vault_eco_balance%$','&8—————————'], permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [tabs, setTabs]         = useState([{ id:'1', name:'Tab Défaut', header:'&6&l✦ VERTEX-MC ✦\n&fBienvenue &d%player_name%&f !', footer:'&7Joueurs: &a%server_online%&7/&a%server_max%', permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [bossbars, setBossbars] = useState([{ id:'1', name:'Bossbar Défaut', title:'&6✦ VERTEX-MC &e— Bienvenue ! &6✦', color:'YELLOW', style:'PROGRESS', progress:'100', textHudMode:false, permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [actionbars, setActionbars] = useState([{ id:'1', name:'Actionbar Défaut', message:'&aBienvenue sur &b%player_world% &a!', permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [chats, setChats]       = useState([{ id:'1', name:'Format Standard', format:'&7[%player_world%] &r%vault_prefix%%player_name%&7: &f%message%', permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [motds, setMotds]       = useState([{ id:'1', name:'MOTD Défaut', line1:'&b&lVERTEX MC &f» &aBienvenue !', line2:'&fServeur Minecraft 1.21', permission:'all', priority:1, targetServer:'all' }])
  const [warps, setWarps]       = useState([{ id:'1', name:'spawn', world:'world', x:0, y:64, z:0, permission:'all', targetServer:'all' }])
  const [nametags, setNametags] = useState([{ id:'1', name:'Nametag Défaut', format:'%vault_prefix%%player_name%', permission:'all', world:'all', priority:1, targetServer:'all' }])
  const [afkZones, setAfkZones] = useState([])
  const [rewardsList, setRewards] = useState([])
  const [channels, setChannels] = useState([])
  const [members, setMembers] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("viewer")
  const [copiedKey, setCopiedKey] = useState("")

  // IA / Chatbot
  const [chatbotQuery, setChatbotQuery]     = useState('')
  const [chatbotReply, setChatbotReply]     = useState('Bonjour ! Je suis l\'assistant IA de VertexMC. Posez vos questions sur la configuration de votre serveur.')
  const [chatbotLoading, setChatbotLoading] = useState(false)
  const [aiProvider, setAiProvider]         = useState('groq')
  const [aiTier, setAiTier]                 = useState('free')
  const [groqKey, setGroqKey]               = useState('')
  const [geminiKey, setGeminiKey]           = useState('')
  const [serverDoc, setServerDoc]           = useState('')
  const [neonDbUrl, setNeonDbUrl]           = useState('')

  // Selected IDs
  const [selSbId, setSelSbId]   = useState('1')
  const [selTabId, setSelTabId] = useState('1')
  const [selBbId, setSelBbId]   = useState('1')
  const [selAbId, setSelAbId]   = useState('1')
  const [selChatId, setSelChatId] = useState('1')

  const addLog = (msg) => setLogs(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l.slice(0, 49)])

  // ─── Auto-login depuis localStorage ──────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('vtx_token')
    const savedUser  = localStorage.getItem('vtx_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setAuth(true)
      setUser({ username: savedUser })
      loadServers()
    }
  }, [])

  // ─── Copy clé API ─────────────────────────────────────────
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopiedKey(label)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  // ─── Charger les membres d'un serveur ────────────────────
  const loadMembers = async (srvUuid) => {
    try {
      const data = await api.servers.getMembers(srvUuid)
      setMembers(data.members || [])
    } catch (e) { setMembers([]) }
  }

  // ─── Charger les serveurs depuis Neon ────────────────────────
  const loadServers = async () => {
    try {
      setLoading(true)
      const data = await api.servers.list()
      const mapped = data.servers.map(s => ({
        ...s,
        id: s.uuid,
        apiKey: s.api_key,
        playerCount: s.player_count,
        maxPlayers: s.max_players,
        lastPing: s.last_ping ? new Date(s.last_ping).toLocaleTimeString() : 'Jamais',
        neonDbUrl: s.neon_db_url || '',
        groqApiKey: s.groq_api_key || '',
        geminiApiKey: s.gemini_api_key || '',
        aiProvider: s.ai_provider || 'groq',
        aiModelTier: s.ai_model_tier || 'free',
        serverDoc: s.server_doc || '',
        scoreboardEnabled: s.scoreboard_enabled,
        tablistEnabled: s.tablist_enabled,
        bossbarEnabled: s.bossbar_enabled,
        actionbarEnabled: s.actionbar_enabled,
        chatEnabled: s.chat_enabled,
        nametagEnabled: s.nametag_enabled,
        navigationEnabled: s.navigation_enabled,
        chatbotEnabled: s.chatbot_enabled,
        afkZoneEnabled: s.afk_zone_enabled,
        rewardsEnabled: s.rewards_enabled,
      }))
      setServers(mapped)
      if (mapped.length > 0 && !selServer) {
        selectServer(mapped[0])
      }
      addLog(`NEON: ${mapped.length} serveur(s) chargé(s).`)
    } catch (e) {
      addLog(`ERR: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const selectServer = (srv) => {
    setSelServer(srv)
    if (srv.scoreboards?.length) setScoreboards(srv.scoreboards)
    if (srv.tabs?.length) setTabs(srv.tabs)
    if (srv.bossbars?.length) setBossbars(srv.bossbars)
    if (srv.actionbars?.length) setActionbars(srv.actionbars)
    if (srv.chats?.length) setChats(srv.chats)
    if (srv.motds?.length) setMotds(srv.motds)
    if (srv.warps?.length) setWarps(srv.warps)
    if (srv.nametags?.length) setNametags(srv.nametags)
    if (srv.afk_zones?.length) setAfkZones(srv.afk_zones)
    if (srv.rewards?.length) setRewards(srv.rewards)
    if (srv.channels?.length) setChannels(srv.channels)
    setNeonDbUrl(srv.neonDbUrl || '')
    setGroqKey(srv.groqApiKey || '')
    setGeminiKey(srv.geminiApiKey || '')
    setAiProvider(srv.aiProvider || 'groq')
    setAiTier(srv.aiModelTier || 'free')
    setServerDoc(srv.serverDoc || '')
    loadMembers(srv.id)
  }

  // ─── Login / Register ─────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthErr('')
    try {
      setLoading(true)
      let data
      if (authMode === 'login') {
        data = await api.login(authEmail, authPass)
      } else {
        if (!authUser.trim()) { setAuthErr('Pseudo requis.'); setLoading(false); return }
        data = await api.register(authUser, authEmail, authPass)
      }
      setToken(data.token)
      localStorage.setItem('vtx_user', data.user.username)
      setAuth(true)
      setUser(data.user)
      addLog(`AUTH: Connecté en tant que ${data.user.username}.`)
      await loadServers()
    } catch (err) {
      setAuthErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    setAuth(false)
    setUser(null)
    setServers([])
    setSelServer(null)
    addLog('AUTH: Déconnexion.')
  }

  // ─── Créer serveur ────────────────────────────────────────────
  const handleCreateServer = async () => {
    if (!newSrvName.trim()) return
    if (servers.length >= 10) { alert('Limite de 10 serveurs atteinte.'); return }
    try {
      setLoading(true)
      const data = await api.servers.create(newSrvName.trim())
      addLog(`NEON: Serveur "${data.server.name}" créé.`)
      alert(`✅ Serveur créé !\n\n⚠️ ${data.warning}\n\nClé API :\n${data.server.api_key}\n\nCopiez-la dans config.yml du plugin.`)
      setNewSrvName('')
      await loadServers()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Supprimer serveur ────────────────────────────────────────
  const handleDeleteServer = async (srv) => {
    if (!confirm(`Supprimer "${srv.name}" ? Cette action est irréversible.`)) return
    try {
      await api.servers.delete(srv.id)
      addLog(`NEON: Serveur "${srv.name}" supprimé.`)
      if (selServer?.id === srv.id) setSelServer(null)
      await loadServers()
    } catch (e) { alert(e.message) }
  }

  // ─── Régénérer clé API ────────────────────────────────────────
  const handleRegenKey = async (srv) => {
    if (!confirm('Régénérer la clé API ? L\'ancienne sera invalide immédiatement.')) return
    try {
      const data = await api.servers.regenKey(srv.id)
      alert(`Nouvelle clé API :\n${data.api_key}\n\n${data.warning}`)
      addLog(`NEON: Clé API régénérée pour "${srv.name}".`)
      await loadServers()
    } catch (e) { alert(e.message) }
  }

  // ─── Sauvegarder configs ──────────────────────────────────────
  const handleSaveConfigs = async () => {
    if (!selServer) { alert('Sélectionnez un serveur.'); return }
    try {
      setLoading(true)
      await api.servers.saveConfigs(selServer.id, { scoreboards, tabs, bossbars, actionbars, chats, motds, warps, nametags })
      addLog(`NEON: Configs sauvegardées pour "${selServer.name}".`)
      alert('✅ Configurations sauvegardées dans Neon !')
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  // ─── Sauvegarder config IA ────────────────────────────────────
  const handleSaveAI = async () => {
    if (!selServer) { alert('Sélectionnez un serveur.'); return }
    try {
      setLoading(true)
      await api.servers.update(selServer.id, {
        groq_api_key: groqKey, gemini_api_key: geminiKey,
        ai_provider: aiProvider, ai_model_tier: aiTier,
        server_doc: serverDoc, neon_db_url: neonDbUrl,
      })
      addLog('NEON: Config IA sauvegardée.')
      alert('✅ Config IA sauvegardée !')
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  // ─── Chatbot ──────────────────────────────────────────────────
  const handleChatbot = async (e) => {
    e.preventDefault()
    if (!chatbotQuery.trim()) return
    const q = chatbotQuery
    setChatbotQuery('')
    setChatbotLoading(true)
    setChatbotReply('Recherche en cours...')
    try {
      const data = await api.chatbot(q, {
        groqApiKey: groqKey, geminiApiKey: geminiKey,
        aiProvider, aiModelTier: aiTier, serverDoc
      })
      setChatbotReply(data.reply)
    } catch (e) {
      setChatbotReply(`Erreur: ${e.message}`)
    } finally {
      setChatbotLoading(false)
    }
  }

  // ─── Helpers configs ──────────────────────────────────────────
  const updateItem = (list, setList, id, field, value) =>
    setList(list.map(i => i.id === id ? { ...i, [field]: value } : i))

  const addLine = (list, setList, id) =>
    setList(list.map(i => i.id === id ? { ...i, lines: [...(i.lines || []), '&7Nouvelle ligne'] } : i))

  const removeLine = (list, setList, id, idx) =>
    setList(list.map(i => i.id === id ? { ...i, lines: i.lines.filter((_, li) => li !== idx) } : i))

  const updateLine = (list, setList, id, idx, value) =>
    setList(list.map(i => i.id === id ? { ...i, lines: i.lines.map((l, li) => li === idx ? value : l) } : i))

  const addConfig = (list, setList, template) => {
    const id = String(Date.now())
    setList([...list, { ...template, id, name: template.name + ' ' + (list.length + 1) }])
    return id
  }

  const removeConfig = (list, setList, id) => setList(list.filter(i => i.id !== id))

  // ─── Page d'auth ──────────────────────────────────────────────
  if (!auth) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-4 bg-cyan-400 rounded-sm shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              <span className="text-xl font-black tracking-tight text-white uppercase">VERTEX ESSENTIAL</span>
            </div>
            <p className="text-zinc-500 text-sm">Panel de gestion Minecraft</p>
          </div>

          <div className="flex mb-6 bg-zinc-900 rounded-lg p-1">
            <button onClick={() => setAuthMode('login')} className={`flex-1 py-1.5 text-sm rounded-md transition-all ${authMode === 'login' ? 'bg-cyan-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              Connexion
            </button>
            <button onClick={() => setAuthMode('register')} className={`flex-1 py-1.5 text-sm rounded-md transition-all ${authMode === 'register' ? 'bg-cyan-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              Inscription
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'register' && (
              <Input value={authUser} onChange={setAuthUser} placeholder="Pseudo" />
            )}
            <Input value={authEmail} onChange={setAuthEmail} placeholder="Email ou pseudo" type="email" />
            <Input value={authPass} onChange={setAuthPass} placeholder="Mot de passe" type="password" />
            {authErr && <p className="text-red-400 text-xs bg-red-900/20 px-3 py-2 rounded border border-red-800">{authErr}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
              {loading ? 'Chargement...' : authMode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Sidebar ──────────────────────────────────────────────────
  const NAV = [
    { id:'dashboard',  label:'Dashboard',   icon:'⚡' },
    { id:'servers',    label:'Serveurs',     icon:'🖥' },
    { id:'scoreboard', label:'Scoreboard',   icon:'📊' },
    { id:'tablist',    label:'TAB List',     icon:'📋' },
    { id:'bossbar',    label:'Boss Bar',     icon:'🎯' },
    { id:'actionbar',  label:'Action Bar',   icon:'⚡' },
    { id:'chat',       label:'Chat Format',  icon:'💬' },
    { id:'nametag',    label:'NameTag',      icon:'🏷' },
    { id:'navigation', label:'Navigation',   icon:'🧭' },
    { id:'afk',        label:'AFK Zones',    icon:'💤' },
    { id:'rewards',    label:'Rewards',      icon:'🎁' },
    { id:'channels',   label:'Channels',     icon:'📡' },
    { id:'chatbot',    label:'IA Chatbot',   icon:'🤖' },
    { id:'database',   label:'Base de données', icon:'🗄' },
    { id:'code',       label:'Code Plugin',  icon:'</>' },
  ]

  const srv = selServer
  const sbItem = scoreboards.find(s => s.id === selSbId) || scoreboards[0]
  const tabItem = tabs.find(t => t.id === selTabId) || tabs[0]
  const bbItem  = bossbars.find(b => b.id === selBbId) || bossbars[0]
  const abItem  = actionbars.find(a => a.id === selAbId) || actionbars[0]
  const chatItem = chats.find(c => c.id === selChatId) || chats[0]

  return (
    <div className="flex h-screen overflow-hidden bg-[#070707] text-zinc-100">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-sm font-black tracking-tight text-white uppercase">VERTEX MC</span>
          </div>
          <p className="text-xs text-zinc-600 mt-1 truncate">{user?.username}</p>
        </div>

        {/* Server selector */}
        <div className="p-3 border-b border-zinc-900">
          <p className="text-xs text-zinc-600 mb-2 uppercase tracking-wider">Serveur actif</p>
          {servers.length > 0 ? (
            <select value={srv?.id || ''} onChange={e => selectServer(servers.find(s => s.id === e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300">
              {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <p className="text-xs text-zinc-600">Aucun serveur</p>
          )}
          {srv && (
            <div className="flex items-center gap-1.5 mt-2">
              <StatusDot online={srv.status === 'online'} />
              <span className="text-xs text-zinc-500">{srv.status === 'online' ? `${srv.playerCount}/${srv.maxPlayers} joueurs` : 'Hors ligne'}</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs mb-0.5 transition-all text-left ${tab === n.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-900">
          <button onClick={handleLogout} className="w-full text-xs text-zinc-600 hover:text-red-400 transition-colors py-1">
            ← Déconnexion
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-900 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-zinc-200">{NAV.find(n => n.id === tab)?.label}</h1>
            {srv && <p className="text-xs text-zinc-600">Serveur: {srv.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {srv && (
              <Btn onClick={handleSaveConfigs} variant="primary" disabled={loading}>
                💾 Sauvegarder Neon
              </Btn>
            )}
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto">

          {/* ─── DASHBOARD ─── */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Serveurs</p>
                  <p className="text-2xl font-bold text-cyan-400">{servers.length}<span className="text-zinc-600 text-sm font-normal">/10</span></p>
                </Card>
                <Card>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">En ligne</p>
                  <p className="text-2xl font-bold text-green-400">{servers.filter(s => s.status === 'online').length}</p>
                </Card>
                <Card>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Joueurs total</p>
                  <p className="text-2xl font-bold text-purple-400">{servers.reduce((a, s) => a + (s.playerCount || 0), 0)}</p>
                </Card>
              </div>

              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Serveurs connectés</h2>
                {servers.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-6">Aucun serveur. Créez-en un dans l'onglet Serveurs.</p>
                ) : (
                  <div className="space-y-2">
                    {servers.map(s => (
                      <div key={s.id} onClick={() => { selectServer(s); setTab('servers') }}
                        className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <StatusDot online={s.status === 'online'} />
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{s.name}</p>
                            <p className="text-xs text-zinc-600 font-mono flex items-center gap-1">
                              {s.apiKey?.substring(0, 20)}...
                              <button onClick={e => { e.stopPropagation(); copyToClipboard(s.apiKey, s.id) }}
                                className="text-zinc-600 hover:text-cyan-400 transition-colors ml-1" title="Copier la clé API">
                                {copiedKey === s.id ? '✓' : '📋'}
                              </button>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge color={s.status === 'online' ? 'green' : 'zinc'}>{s.status === 'online' ? `${s.playerCount} joueurs` : 'offline'}</Badge>
                          <p className="text-xs text-zinc-600 mt-0.5">{s.version} · Ping: {s.lastPing}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Logs</h2>
                <div className="bg-zinc-950 rounded p-3 h-40 overflow-y-auto font-mono text-xs text-zinc-500 space-y-0.5">
                  {logs.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              </Card>
            </div>
          )}

          {/* ─── SERVERS ─── */}
          {tab === 'servers' && (
            <div className="space-y-6">
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Créer un serveur</h2>
                <div className="flex gap-2">
                  <Input value={newSrvName} onChange={setNewSrvName} placeholder="Nom du serveur (ex: Survival)" className="max-w-xs" />
                  <Btn onClick={handleCreateServer} variant="primary" disabled={loading || !newSrvName.trim()}>
                    + Créer
                  </Btn>
                </div>
                <p className="text-xs text-zinc-600 mt-2">La clé API sera affichée une seule fois à la création.</p>
              </Card>

              <div className="space-y-3">
                {servers.map(s => (
                  <Card key={s.id} className={`${selServer?.id === s.id ? 'border-cyan-800' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusDot online={s.status === 'online'} />
                          <span className="font-semibold text-zinc-200">{s.name}</span>
                          <Badge color={s.status === 'online' ? 'green' : 'zinc'}>{s.status}</Badge>
                        </div>
                        <p className="text-xs text-zinc-600 font-mono mb-2 flex items-center gap-2">
                          Clé: {s.apiKey?.substring(0, 24)}...
                          <button onClick={() => copyToClipboard(s.apiKey, 'key_' + s.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${copiedKey === 'key_' + s.id ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-400 hover:text-cyan-400'}`}>
                            {copiedKey === 'key_' + s.id ? '✓ Copié !' : '📋 Copier clé'}
                          </button>
                        </p>
                        <div className="flex gap-4 text-xs text-zinc-500">
                          <span>Version: {s.version}</span>
                          <span>Joueurs: {s.playerCount}/{s.maxPlayers}</span>
                          <span>Dernier ping: {s.lastPing}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Btn onClick={() => selectServer(s)} variant={selServer?.id === s.id ? 'primary' : 'default'}>
                          {selServer?.id === s.id ? '✓ Actif' : 'Sélectionner'}
                        </Btn>
                        <Btn onClick={() => handleRegenKey(s)}>🔑 Régénérer clé</Btn>
                        <Btn onClick={() => handleDeleteServer(s)} variant="danger">🗑</Btn>
                      </div>
                    </div>

                    {selServer?.id === s.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">
                        {/* Modules */}
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Modules actifs</p>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              ['scoreboard_enabled','Scoreboard'], ['tablist_enabled','TAB'],
                              ['bossbar_enabled','BossBar'], ['actionbar_enabled','ActionBar'],
                              ['chat_enabled','Chat'], ['nametag_enabled','NameTag'],
                              ['navigation_enabled','Navigation'], ['chatbot_enabled','Chatbot'],
                              ['afk_zone_enabled','AFK Zone'], ['rewards_enabled','Rewards'],
                            ].map(([field, label]) => (
                              <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={s[field.replace(/_enabled/, 'Enabled').replace(/_./g, m => m[1].toUpperCase())] ?? s[field] ?? true}
                                  onChange={async (e) => {
                                    try {
                                      await api.servers.update(s.id, { [field]: e.target.checked })
                                      await loadServers()
                                    } catch(err) { alert(err.message) }
                                  }}
                                  className="accent-cyan-500 w-3.5 h-3.5" />
                                <span className="text-xs text-zinc-400">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Membres — accès panel par email */}
                        {s.is_owner !== false && (
                          <div className="border-t border-zinc-800 pt-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">👥 Membres — Accès panel partagé</p>
                            <div className="flex gap-2 mb-3">
                              <Input value={newMemberEmail} onChange={setNewMemberEmail}
                                placeholder="email@exemple.com" className="flex-1 text-xs py-1" />
                              <Select value={newMemberRole} onChange={setNewMemberRole} className="text-xs py-1">
                                <option value="viewer">Lecteur</option>
                                <option value="editor">Éditeur</option>
                              </Select>
                              <Btn onClick={async () => {
                                if (!newMemberEmail.trim()) return
                                try {
                                  await api.servers.addMember(s.id, newMemberEmail.trim(), newMemberRole)
                                  setNewMemberEmail('')
                                  await loadMembers(s.id)
                                  addLog(`Membre ${newMemberEmail} ajouté au serveur ${s.name}`)
                                } catch(e) { alert(e.message) }
                              }} variant="primary" className="text-xs py-1">+ Ajouter</Btn>
                            </div>
                            <div className="space-y-1.5">
                              {members.length === 0 && (
                                <p className="text-xs text-zinc-600">Aucun membre ajouté. Les membres partagés peuvent voir et modifier ce serveur.</p>
                              )}
                              {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-300">{m.email}</span>
                                    {m.username && <span className="text-xs text-zinc-600">({m.username})</span>}
                                    <Badge color={m.role === 'editor' ? 'cyan' : 'zinc'}>{m.role}</Badge>
                                  </div>
                                  <button onClick={async () => {
                                    await api.servers.removeMember(s.id, m.id)
                                    await loadMembers(s.id)
                                  }} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">✕</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ─── SCOREBOARD ─── */}
          {tab === 'scoreboard' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {scoreboards.map(sb => (
                  <button key={sb.id} onClick={() => setSelSbId(sb.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${selSbId === sb.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {sb.name}
                  </button>
                ))}
                <Btn onClick={() => { const id = addConfig(scoreboards, setScoreboards, scoreboards[0]); setSelSbId(id) }} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {sbItem && (
                  <>
                    <Card>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Nom du profil</label>
                          <Input value={sbItem.name} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'name', v)} placeholder="Nom" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Titre</label>
                          <Input value={sbItem.title} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'title', v)} placeholder="&b&lMON SERVEUR" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={sbItem.permission} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'permission', v)} placeholder="all ou vertex.vip" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Monde</label>
                          <Input value={sbItem.world} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'world', v)} placeholder="all" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={sbItem.luckpermsGroup||''} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'luckpermsGroup', v)} placeholder="vip, admin..." />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={sbItem.placeholderCondition||''} onChange={v => updateItem(scoreboards, setScoreboards, sbItem.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000" />
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-zinc-300">Lignes</h3>
                        <Btn onClick={() => addLine(scoreboards, setScoreboards, sbItem.id)} className="text-xs">+ Ligne</Btn>
                      </div>
                      <div className="space-y-2">
                        {(sbItem.lines || []).map((line, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input value={line} onChange={v => updateLine(scoreboards, setScoreboards, sbItem.id, i, v)} placeholder={`&7Ligne ${i+1}`} />
                            <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 min-w-[140px]">
                              <MCPreview text={line} />
                            </div>
                            <Btn onClick={() => removeLine(scoreboards, setScoreboards, sbItem.id, i)} variant="danger" className="text-xs px-2">✕</Btn>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Prévisualisation</h3>
                      <div className="bg-zinc-950 rounded p-4 border border-zinc-800 max-w-[200px]">
                        <div className="text-center mb-1"><MCPreview text={sbItem.title} /></div>
                        <div className="h-px bg-zinc-700 mb-1" />
                        {(sbItem.lines || []).map((l, i) => (
                          <div key={i} className="text-xs py-0.5"><MCPreview text={l} /></div>
                        ))}
                      </div>
                    </Card>
                    <Btn onClick={() => removeConfig(scoreboards, setScoreboards, sbItem.id)} variant="danger">🗑 Supprimer ce profil</Btn>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── TABLIST ─── */}
          {tab === 'tablist' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setSelTabId(t.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${selTabId === t.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {t.name}
                  </button>
                ))}
                <Btn onClick={() => { const id = addConfig(tabs, setTabs, tabs[0]); setSelTabId(id) }} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {tabItem && (
                  <>
                    <Card>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Nom du profil</label>
                          <Input value={tabItem.name} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'name', v)} />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={tabItem.permission} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'permission', v)} placeholder="all ou vertex.vip" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={tabItem.luckpermsGroup||''} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'luckpermsGroup', v)} placeholder="vip, admin..." />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Monde</label>
                          <Input value={tabItem.world||'all'} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'world', v)} placeholder="all" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={tabItem.placeholderCondition||''} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-zinc-500 block mb-1">Header (utilisez \n pour les sauts de ligne)</label>
                          <TextArea value={tabItem.header} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'header', v)} rows={3} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-zinc-500 block mb-1">Footer</label>
                          <TextArea value={tabItem.footer} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'footer', v)} rows={2} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-zinc-500 block mb-1">
                            Format du joueur dans la liste <span className="text-zinc-600 normal-case font-normal">(PAPI supporté)</span>
                          </label>
                          <Input value={tabItem.playerFormat||'%vault_prefix%%player_name%'} onChange={v => updateItem(tabs, setTabs, tabItem.id, 'playerFormat', v)} placeholder="%vault_prefix%%player_name%" />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['%vault_prefix%','%player_name%','%vault_suffix%','%player_ping%','%player_world%'].map(p => (
                              <button key={p} onClick={() => updateItem(tabs, setTabs, tabItem.id, 'playerFormat', (tabItem.playerFormat||'') + p)}
                                className="text-xs font-mono text-cyan-600 hover:text-cyan-400 bg-zinc-800 px-1.5 py-0.5 rounded">{p}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Prévisualisation</h3>
                      <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
                        <div className="border-b border-zinc-700 pb-2 mb-2">
                          {tabItem.header?.split('\n').map((l, i) => <div key={i}><MCPreview text={l} /></div>)}
                        </div>
                        <div className="py-2 space-y-0.5">
                          {['Steve','Alex','Notch'].map(name => (
                            <div key={name} className="text-xs flex items-center justify-center gap-1.5">
                              <span className="w-3 h-3 bg-zinc-600 rounded-sm inline-block" />
                              <MCPreview text={(tabItem.playerFormat||'%player_name%').replace('%player_name%', name).replace('%vault_prefix%','[VIP] ').replace('%vault_suffix%','').replace('%player_ping%','32').replace('%player_world%','lobby')} />
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-zinc-700 pt-2">
                          {tabItem.footer?.split('\n').map((l, i) => <div key={i}><MCPreview text={l} /></div>)}
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── BOSSBAR ─── */}
          {tab === 'bossbar' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {bossbars.map(b => (
                  <button key={b.id} onClick={() => setSelBbId(b.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${selBbId === b.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {b.hudMode ? '🖥 ' : '🎯 '}{b.name}
                  </button>
                ))}
                <Btn onClick={() => { const id = addConfig(bossbars, setBossbars, { ...bossbars[0], hudMode:true, titles:['&b⚡ VERTEX-MC &8| &f%player_name%'], rotationInterval:80, luckpermsGroup:'', placeholderCondition:'' }); setSelBbId(id) }} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {bbItem && (
                  <>
                    <Card>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-zinc-500 block mb-1">Nom du profil</label>
                          <Input value={bbItem.name} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'name', v)} /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Priorité</label>
                          <Input value={String(bbItem.priority||0)} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'priority', parseInt(v)||0)} type="number" /></div>

                        {/* Mode HUD */}
                        <div className="col-span-2 bg-zinc-800/50 rounded-lg p-3">
                          <label className="flex items-center gap-3 cursor-pointer mb-2">
                            <input type="checkbox" checked={bbItem.hudMode||bbItem.textHudMode||false}
                              onChange={e => updateItem(bossbars, setBossbars, bbItem.id, 'hudMode', e.target.checked)}
                              className="w-4 h-4 accent-cyan-500" />
                            <div>
                              <span className="text-sm text-zinc-200 font-medium">Mode HUD (texte seul, comme TAB by Nezamy)</span>
                              <p className="text-xs text-zinc-500 mt-0.5">Barre invisible — seul le texte s'affiche en haut de l'écran</p>
                            </div>
                          </label>
                        </div>

                        {/* Textes en rotation */}
                        <div className="col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-zinc-500">Textes en rotation (PAPI supporté)</label>
                            <Btn className="text-xs" onClick={() => {
                              const titles = [...(bbItem.titles || [bbItem.title || '']), '&7Nouveau texte']
                              updateItem(bossbars, setBossbars, bbItem.id, 'titles', titles)
                            }}>+ Ligne</Btn>
                          </div>
                          <div className="space-y-2">
                            {(bbItem.titles || [bbItem.title || '']).map((t, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <Input value={t} onChange={v => {
                                  const titles = [...(bbItem.titles || [bbItem.title || ''])]
                                  titles[i] = v
                                  updateItem(bossbars, setBossbars, bbItem.id, 'titles', titles)
                                }} placeholder="&b⚡ VERTEX-MC &8| &f%player_name%" />
                                <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 min-w-[160px]">
                                  <MCPreview text={t} />
                                </div>
                                <Btn onClick={() => {
                                  const titles = (bbItem.titles || []).filter((_,li) => li !== i)
                                  updateItem(bossbars, setBossbars, bbItem.id, 'titles', titles)
                                }} variant="danger" className="text-xs px-2">✕</Btn>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div><label className="text-xs text-zinc-500 block mb-1">Intervalle rotation (ticks)</label>
                          <Input value={String(bbItem.rotationInterval||80)} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'rotationInterval', parseInt(v)||80)} type="number" placeholder="80" />
                          <p className="text-xs text-zinc-600 mt-0.5">80 ticks = ~4s</p>
                        </div>

                        {/* Barre (si pas HUD) */}
                        {!(bbItem.hudMode||bbItem.textHudMode) && (<>
                          <div><label className="text-xs text-zinc-500 block mb-1">Couleur barre</label>
                            <Select value={bbItem.color||'BLUE'} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'color', v)}>
                              {['BLUE','GREEN','PINK','PURPLE','RED','WHITE','YELLOW'].map(c => <option key={c}>{c}</option>)}
                            </Select></div>
                          <div><label className="text-xs text-zinc-500 block mb-1">Style barre</label>
                            <Select value={bbItem.style||'SOLID'} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'style', v)}>
                              {['SOLID','NOTCHED_6','NOTCHED_10','NOTCHED_12','NOTCHED_20'].map(s => <option key={s}>{s}</option>)}
                            </Select></div>
                          <div><label className="text-xs text-zinc-500 block mb-1">Progression (%)</label>
                            <Input value={bbItem.progress||'100'} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'progress', v)} type="number" min="0" max="100" /></div>
                        </>)}
                      </div>
                    </Card>

                    {/* Conditions */}
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Conditions d'affichage</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tout le monde)</span></label>
                          <Input value={bbItem.permission||'all'} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'permission', v)} placeholder="all ou vertex.vip" /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={bbItem.luckpermsGroup||''} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'luckpermsGroup', v)} placeholder="vip, admin..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Monde <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={bbItem.world||'all'} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'world', v)} placeholder="all, survival..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={bbItem.placeholderCondition||''} onChange={v => updateItem(bossbars, setBossbars, bbItem.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000" /></div>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">Opérateurs: &gt; &lt; &gt;= &lt;= == != &nbsp;|&nbsp; Ex: %player_world%==survival</p>
                    </Card>

                    {/* Préview */}
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Prévisualisation</h3>
                      <div className="bg-[#0a0a1a] rounded-lg p-4 border border-zinc-800 relative">
                        <div className="text-center mb-3 text-xs text-zinc-600">— En haut de l'écran —</div>
                        {!(bbItem.hudMode||bbItem.textHudMode) && (
                          <div className="h-3 rounded overflow-hidden bg-zinc-800 mb-2">
                            <div className="h-full rounded bg-cyan-400" style={{ width: `${Math.min(100, parseInt(bbItem.progress)||100)}%` }} />
                          </div>
                        )}
                        <div className="text-center">
                          <MCPreview text={(bbItem.titles||[bbItem.title||''])[0]} />
                        </div>
                        {(bbItem.titles||[]).length > 1 && (
                          <p className="text-center text-xs text-zinc-600 mt-1">+{(bbItem.titles||[]).length-1} autre(s) texte(s) en rotation</p>
                        )}
                      </div>
                    </Card>
                    <Btn onClick={() => removeConfig(bossbars, setBossbars, bbItem.id)} variant="danger">🗑 Supprimer ce profil</Btn>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── ACTIONBAR ─── */}
          {tab === 'actionbar' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {actionbars.map(a => (
                  <button key={a.id} onClick={() => setSelAbId(a.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${selAbId === a.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {a.name}
                  </button>
                ))}
                <Btn onClick={() => { const id = addConfig(actionbars, setActionbars, actionbars[0]); setSelAbId(id) }} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {abItem && (
                  <>
                    <Card>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-zinc-500 block mb-1">Nom</label>
                          <Input value={abItem.name} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'name', v)} /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Priorité</label>
                          <Input value={String(abItem.priority||0)} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'priority', parseInt(v)||0)} type="number" /></div>
                        <div className="col-span-2"><label className="text-xs text-zinc-500 block mb-1">Message (PAPI supporté)</label>
                          <Input value={abItem.message} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'message', v)} placeholder="&aBienvenue sur &b%player_world% !" /></div>
                      </div>
                      <div className="mt-3 bg-zinc-950 rounded p-3 border border-zinc-800 text-center">
                        <MCPreview text={abItem.message} />
                      </div>
                    </Card>
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Conditions d'affichage</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={abItem.permission||'all'} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'permission', v)} placeholder="all ou vertex.vip" /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={abItem.luckpermsGroup||''} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'luckpermsGroup', v)} placeholder="vip, admin..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Monde <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={abItem.world||'all'} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'world', v)} placeholder="all, survival..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={abItem.placeholderCondition||''} onChange={v => updateItem(actionbars, setActionbars, abItem.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000" /></div>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">Opérateurs: &gt; &lt; &gt;= &lt;= == !=  |  Ex: %player_world%==survival</p>
                    </Card>
                    <Btn onClick={() => removeConfig(actionbars, setActionbars, abItem.id)} variant="danger">🗑 Supprimer</Btn>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── CHAT ─── */}
          {tab === 'chat' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {chats.map(c => (
                  <button key={c.id} onClick={() => setSelChatId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${selChatId === c.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {c.name}
                  </button>
                ))}
                <Btn onClick={() => { const id = addConfig(chats, setChats, chats[0]); setSelChatId(id) }} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {chatItem && (
                  <>
                    <Card>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-zinc-500 block mb-1">Nom</label>
                          <Input value={chatItem.name} onChange={v => updateItem(chats, setChats, chatItem.id, 'name', v)} /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Priorité</label>
                          <Input value={String(chatItem.priority||0)} onChange={v => updateItem(chats, setChats, chatItem.id, 'priority', parseInt(v)||0)} type="number" /></div>
                        <div className="col-span-2"><label className="text-xs text-zinc-500 block mb-1">Format</label>
                          <Input value={chatItem.format} onChange={v => updateItem(chats, setChats, chatItem.id, 'format', v)} placeholder="&7[%player_world%] %vault_prefix%%player_name%&7: &f%message%" /></div>
                      </div>
                      <div className="mt-3 bg-zinc-950 rounded p-3 border border-zinc-800">
                        <MCPreview text={chatItem.format?.replace('%player_name%','Steve').replace('%message%','Bonjour !').replace('%vault_prefix%','[VIP] ').replace('%player_world%','survival')} />
                      </div>
                      <div className="mt-3 p-3 bg-zinc-900/50 rounded text-xs text-zinc-500">
                        <p className="font-semibold text-zinc-400 mb-1">Placeholders rapides :</p>
                        <div className="flex flex-wrap gap-1 font-mono">
                          {['%player_name%','%player_world%','%message%','%vault_prefix%','%vault_suffix%','%player_health%','%server_online%'].map(p => (
                            <button key={p} onClick={() => updateItem(chats, setChats, chatItem.id, 'format', (chatItem.format||'') + p)}
                              className="text-cyan-600 hover:text-cyan-400 bg-zinc-800 px-1.5 py-0.5 rounded transition-colors">{p}</button>
                          ))}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Conditions d'affichage</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={chatItem.permission||'all'} onChange={v => updateItem(chats, setChats, chatItem.id, 'permission', v)} placeholder="all ou vertex.vip" /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={chatItem.luckpermsGroup||''} onChange={v => updateItem(chats, setChats, chatItem.id, 'luckpermsGroup', v)} placeholder="vip, admin, default..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Monde <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={chatItem.world||'all'} onChange={v => updateItem(chats, setChats, chatItem.id, 'world', v)} placeholder="all, survival, lobby..." /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={chatItem.placeholderCondition||''} onChange={v => updateItem(chats, setChats, chatItem.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000" /></div>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">Opérateurs: &gt; &lt; &gt;= &lt;= == !=  |  Ex: %player_world%==survival</p>
                    </Card>
                    <Btn onClick={() => removeConfig(chats, setChats, chatItem.id)} variant="danger">🗑 Supprimer</Btn>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── NAMETAG ─── */}
          {tab === 'nametag' && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Profiles</p>
                {nametags.map(nt => (
                  <button key={nt.id} onClick={() => updateItem(nametags, setNametags, nt.id, '_sel', true)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${nametags.find(n=>n._sel)?.id===nt.id ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/50' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                    {nt.name}
                  </button>
                ))}
                <Btn onClick={() => addConfig(nametags, setNametags, { ...nametags[0], _sel:false })} className="w-full justify-center text-xs">+ Nouveau</Btn>
              </div>
              <div className="col-span-4 space-y-4">
                {nametags.map(nt => (
                  <Card key={nt.id}>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="text-xs text-zinc-500 block mb-1">Nom</label>
                        <Input value={nt.name} onChange={v => updateItem(nametags, setNametags, nt.id, 'name', v)} /></div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Priorité</label>
                        <Input value={String(nt.priority||0)} onChange={v => updateItem(nametags, setNametags, nt.id, 'priority', parseInt(v)||0)} type="number" /></div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Monde</label>
                        <Input value={nt.world||'all'} onChange={v => updateItem(nametags, setNametags, nt.id, 'world', v)} placeholder="all" /></div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Préfixe (au-dessus tête)</label>
                        <Input value={nt.prefix||''} onChange={v => updateItem(nametags, setNametags, nt.id, 'prefix', v)} placeholder="&6[VIP] " /></div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Couleur nom</label>
                        <Input value={nt['name-color']||nt.nameColor||'&f'} onChange={v => updateItem(nametags, setNametags, nt.id, 'name-color', v)} placeholder="&f, &e, &a..." /></div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Suffixe</label>
                        <Input value={nt.suffix||''} onChange={v => updateItem(nametags, setNametags, nt.id, 'suffix', v)} placeholder="" /></div>
                    </div>
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Conditions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                          <Input value={nt.permission||'all'} onChange={v => updateItem(nametags, setNametags, nt.id, 'permission', v)} placeholder="all ou vertex.vip" /></div>
                        <div><label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                          <Input value={nt.luckpermsGroup||''} onChange={v => updateItem(nametags, setNametags, nt.id, 'luckpermsGroup', v)} placeholder="vip, admin..." /></div>
                        <div className="col-span-2"><label className="text-xs text-zinc-500 block mb-1">Condition Placeholder</label>
                          <Input value={nt.placeholderCondition||''} onChange={v => updateItem(nametags, setNametags, nt.id, 'placeholderCondition', v)} placeholder="%vault_eco_balance%>1000 ou %player_world%==survival" /></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                      <div className="text-xs text-zinc-600">
                        Préview: <span style={{color: nt['name-color']?.replace('&','§').replace('§','') === 'f' ? '#fff' : '#aaa'}}>
                          {(nt.prefix||'')}{nt['name-color']||''} Steve{nt.suffix||''}
                        </span>
                      </div>
                      <Btn onClick={() => removeConfig(nametags, setNametags, nt.id)} variant="danger" className="text-xs">🗑 Supprimer</Btn>
                    </div>
                  </Card>
                ))}
                {nametags.length === 0 && (
                  <Card className="text-center py-8"><p className="text-zinc-500 text-sm">Aucun profil NameTag.</p></Card>
                )}
              </div>
            </div>
          )}

          {/* ─── NAVIGATION ─── */}
          {tab === 'navigation' && (
            <div className="space-y-6">
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Warps configurés</h2>
                <div className="space-y-2 mb-4">
                  {warps.map(w => (
                    <div key={w.id} className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-3">
                      <Input value={w.name} onChange={v => updateItem(warps, setWarps, w.id, 'name', v)} placeholder="Nom" className="w-24" />
                      <Input value={w.world} onChange={v => updateItem(warps, setWarps, w.id, 'world', v)} placeholder="Monde" className="w-28" />
                      <Input value={String(w.x)} onChange={v => updateItem(warps, setWarps, w.id, 'x', parseFloat(v)||0)} placeholder="X" className="w-20" type="number" />
                      <Input value={String(w.y)} onChange={v => updateItem(warps, setWarps, w.id, 'y', parseFloat(v)||0)} placeholder="Y" className="w-20" type="number" />
                      <Input value={String(w.z)} onChange={v => updateItem(warps, setWarps, w.id, 'z', parseFloat(v)||0)} placeholder="Z" className="w-20" type="number" />
                      <Input value={w.permission || 'all'} onChange={v => updateItem(warps, setWarps, w.id, 'permission', v)} placeholder="Permission" className="w-28" />
                      <Btn onClick={() => removeConfig(warps, setWarps, w.id)} variant="danger" className="text-xs px-2">✕</Btn>
                    </div>
                  ))}
                </div>
                <Btn onClick={() => addConfig(warps, setWarps, { name:'nouveau', world:'world', x:0, y:64, z:0, permission:'all', targetServer:'all' })}>+ Ajouter warp</Btn>
              </Card>
            </div>
          )}

          {/* ─── AFK ZONES ─── */}
          {tab === 'afk' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-300">Zones AFK ({afkZones.length})</h2>
                {srv && <Btn onClick={async () => {
                  const data = await api.servers.createAfk(srv.id, { name:'Zone AFK', world:'world', x:0, y:64, z:0, radius:8, reward_interval:60, reward_amount:10, command:'coins add %player_name% 10' })
                  setAfkZones([...afkZones, data.afk_zone])
                }} variant="primary">+ Nouvelle zone</Btn>}
              </div>
              {afkZones.map(z => (
                <Card key={z.id || z.uuid}>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-zinc-500 block mb-1">Nom</label><Input value={z.name} onChange={() => {}} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Monde</label><Input value={z.world} onChange={() => {}} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Rayon (blocs)</label><Input value={String(z.radius)} onChange={() => {}} type="number" /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Intervalle récompense (s)</label><Input value={String(z.reward_interval)} onChange={() => {}} type="number" /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Commande récompense</label><Input value={z.command} onChange={() => {}} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Message entrée</label><Input value={z.msg_enter} onChange={() => {}} /></div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Btn onClick={async () => {
                      if (srv) { await api.servers.deleteAfk(srv.id, z.uuid || z.id); setAfkZones(afkZones.filter(a => (a.uuid || a.id) !== (z.uuid || z.id))) }
                    }} variant="danger" className="text-xs">🗑 Supprimer</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ─── REWARDS ─── */}
          {tab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-300">Récompenses ({rewardsList.length})</h2>
                  <p className="text-xs text-zinc-600 mt-0.5">Ouverture en jeu via <span className="font-mono text-cyan-600">/rewards</span> — cooldowns stockés en Neon DB</p>
                </div>
                {srv && <Btn onClick={async () => {
                  const data = await api.servers.createReward(srv.id, {
                    name:'Récompense Quotidienne', type:'daily', icon:'GOLD_INGOT',
                    description:['&7Réclamez vos coins quotidiens !','&fRécompense: &e+500 Coins'],
                    commands:['eco give %player% 500'], permission:'all',
                    luckperms_group:'', placeholder_condition:'', cooldown_hours:24,
                    message_claim:'&a[✦] +500 Coins réclamés !',
                    message_cooldown:'&c[✦] Revenez dans &e%time% !'
                  })
                  setRewards([...rewardsList, data.reward])
                }} variant="primary">+ Nouvelle récompense</Btn>}
              </div>

              {rewardsList.length === 0 && (
                <Card className="text-center py-10">
                  <p className="text-zinc-500 text-sm">Aucune récompense. Créez-en une !</p>
                  <p className="text-zinc-600 text-xs mt-1">Les joueurs l'ouvriront avec <span className="font-mono">/rewards</span></p>
                </Card>
              )}

              {rewardsList.map(r => (
                <Card key={r.id || r.uuid}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{r.icon === 'GOLD_INGOT' ? '🪙' : r.icon === 'NETHER_STAR' ? '⭐' : r.icon === 'CHEST' ? '📦' : '🎁'}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{r.name?.replace(/&./g,'')}</p>
                      <Badge color={r.type==='daily'?'cyan':r.type==='weekly'?'yellow':'zinc'}>{r.type}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-zinc-500 block mb-1">Nom (MiniMessage)</label>
                      <Input value={r.name||''} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,name:v} : rw))} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Type</label>
                      <Select value={r.type||'daily'} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,type:v} : rw))}>
                        <option value="daily">daily (quotidien)</option>
                        <option value="weekly">weekly (hebdo)</option>
                        <option value="playtime">playtime</option>
                        <option value="vote">vote</option>
                      </Select></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Icône (Material)</label>
                      <Select value={r.icon||'CHEST'} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,icon:v} : rw))}>
                        {['CHEST','GOLD_INGOT','DIAMOND','EMERALD','NETHER_STAR','BOOK','EXPERIENCE_BOTTLE','CLOCK','CAKE','BEACON'].map(m => <option key={m}>{m}</option>)}
                      </Select></div>

                    <div><label className="text-xs text-zinc-500 block mb-1">Cooldown (heures)</label>
                      <Input value={String(r.cooldown_hours||24)} type="number" onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,cooldown_hours:parseInt(v)||24} : rw))} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Permission <span className="text-zinc-600">(all = tous)</span></label>
                      <Input value={r.permission||'all'} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,permission:v} : rw))} placeholder="all ou vertex.vip" /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Groupe LuckPerms <span className="text-zinc-600">(vide = tous)</span></label>
                      <Input value={r.luckperms_group||''} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,luckperms_group:v} : rw))} placeholder="vip, admin..." /></div>

                    <div className="col-span-3"><label className="text-xs text-zinc-500 block mb-1">Condition Placeholder <span className="text-zinc-600">(vide = toujours visible)</span></label>
                      <Input value={r.placeholder_condition||''} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,placeholder_condition:v} : rw))} placeholder="%vault_eco_balance%>1000 ou %player_world%==survival" /></div>

                    {/* Commandes */}
                    <div className="col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-zinc-500">Commandes console (une par ligne, %player% = joueur)</label>
                        <Btn className="text-xs" onClick={() => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw, commands:[...(rw.commands||[]), 'eco give %player% 100']} : rw))}>+ Commande</Btn>
                      </div>
                      {(r.commands||[]).map((cmd, i) => (
                        <div key={i} className="flex gap-2 mb-1.5">
                          <Input value={cmd} onChange={v => setRewards(rewardsList.map(rw => {
                            if ((rw.uuid||rw.id) !== (r.uuid||r.id)) return rw
                            const commands = [...(rw.commands||[])]
                            commands[i] = v
                            return {...rw, commands}
                          }))} placeholder="eco give %player% 500" />
                          <Btn onClick={() => setRewards(rewardsList.map(rw => {
                            if ((rw.uuid||rw.id) !== (r.uuid||r.id)) return rw
                            return {...rw, commands: (rw.commands||[]).filter((_,ci) => ci !== i)}
                          }))} variant="danger" className="text-xs px-2">✕</Btn>
                        </div>
                      ))}
                      {(!r.commands||r.commands.length===0) && <p className="text-xs text-zinc-600">Aucune commande. Ajoutez-en une.</p>}
                    </div>

                    {/* Messages */}
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-zinc-500 block mb-1">Message réclamation</label>
                        <Input value={r.message_claim||'&a[✦] Récompense réclamée !'} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,message_claim:v} : rw))} />
                      </div>
                      <div><label className="text-xs text-zinc-500 block mb-1">Message cooldown <span className="text-zinc-600">(%time% = temps restant)</span></label>
                        <Input value={r.message_cooldown||'&c[✦] Revenez dans &e%time% !'} onChange={v => setRewards(rewardsList.map(rw => (rw.uuid||rw.id)===(r.uuid||r.id) ? {...rw,message_cooldown:v} : rw))} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                    <div className="text-xs text-zinc-600">
                      Cooldown: <span className="text-zinc-400">{r.cooldown_hours}h</span>
                      {r.luckperms_group && <> · Groupe: <span className="text-cyan-600">{r.luckperms_group}</span></>}
                      {r.permission !== 'all' && <> · Perm: <span className="text-cyan-600">{r.permission}</span></>}
                    </div>
                    <div className="flex gap-2">
                      <Btn onClick={async () => {
                        if (!srv) return
                        try {
                          await api.servers.deleteReward(srv.id, r.uuid||r.id)
                          setRewards(rewardsList.filter(rw => (rw.uuid||rw.id) !== (r.uuid||r.id)))
                        } catch(e) { alert(e.message) }
                      }} variant="danger" className="text-xs">🗑 Supprimer</Btn>
                    </div>
                  </div>
                </Card>
              ))}

              {rewardsList.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500">
                  <p className="font-medium text-zinc-400 mb-2">ℹ️ Informations</p>
                  <ul className="space-y-1">
                    <li>• Les cooldowns sont stockés dans <span className="text-cyan-600">Neon DB</span> (ou fichier local si DB désactivée)</li>
                    <li>• Le menu s'ouvre avec <span className="font-mono text-cyan-600">/rewards</span>, <span className="font-mono text-cyan-600">/reward</span> ou <span className="font-mono text-cyan-600">/daily</span></li>
                    <li>• Les conditions LuckPerms vérifient les groupes hérités</li>
                    <li>• <span className="font-mono">%player%</span> et <span className="font-mono">%player_name%</span> sont remplacés dans les commandes</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ─── CHANNELS ─── */}
          {tab === 'channels' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-300">Canaux de chat ({channels.length})</h2>
                {srv && <Btn onClick={async () => {
                  const data = await api.servers.createChannel(srv.id, { name:'global', prefix:'[G] ', format:'&7%player_name%: %message%', permission:'all' })
                  setChannels([...channels, data.channel])
                }} variant="primary">+ Nouveau canal</Btn>}
              </div>
              {channels.map(ch => (
                <Card key={ch.id || ch.uuid}>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-zinc-500 block mb-1">Nom</label><Input value={ch.name} onChange={() => {}} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Préfixe</label><Input value={ch.prefix} onChange={() => {}} /></div>
                    <div><label className="text-xs text-zinc-500 block mb-1">Permission</label><Input value={ch.permission} onChange={() => {}} /></div>
                    <div className="col-span-3"><label className="text-xs text-zinc-500 block mb-1">Format</label><Input value={ch.format} onChange={() => {}} /></div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Btn onClick={async () => {
                      if (srv) { await api.servers.deleteChannel(srv.id, ch.uuid || ch.id); setChannels(channels.filter(c => (c.uuid||c.id) !== (ch.uuid||ch.id))) }
                    }} variant="danger" className="text-xs">🗑 Supprimer</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ─── CHATBOT IA ─── */}
          {tab === 'chatbot' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <h2 className="text-sm font-semibold text-zinc-300 mb-4">Configuration IA</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Fournisseur</label>
                      <Select value={aiProvider} onChange={setAiProvider}>
                        <option value="groq">Groq (gratuit)</option>
                        <option value="gemini">Google Gemini (gratuit)</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Tier</label>
                      <Select value={aiTier} onChange={setAiTier}>
                        <option value="free">Gratuit</option>
                        <option value="paid">Payant</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Clé Groq (console.groq.com)</label>
                      <Input value={groqKey} onChange={setGroqKey} placeholder="gsk_xxxx" type="password" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Clé Gemini (aistudio.google.com)</label>
                      <Input value={geminiKey} onChange={setGeminiKey} placeholder="AIza..." type="password" />
                    </div>
                    <Btn onClick={handleSaveAI} variant="primary" disabled={loading} className="w-full justify-center">
                      💾 Sauvegarder config IA
                    </Btn>
                  </div>
                </Card>
                <Card>
                  <h2 className="text-sm font-semibold text-zinc-300 mb-4">Documentation serveur</h2>
                  <TextArea value={serverDoc} onChange={setServerDoc}
                    placeholder="Décrivez votre serveur ici : règles, commandes, rangs, économie... L'IA utilisera ce contexte pour répondre aux joueurs."
                    rows={10} />
                </Card>
              </div>
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">🤖 Tester le chatbot IA</h2>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 mb-4 min-h-[80px]">
                  <p className="text-sm text-zinc-300">{chatbotLoading ? '...' : chatbotReply}</p>
                </div>
                <form onSubmit={handleChatbot} className="flex gap-2">
                  <Input value={chatbotQuery} onChange={setChatbotQuery} placeholder="Posez une question..." className="flex-1" />
                  <Btn variant="primary" disabled={chatbotLoading || !chatbotQuery.trim()}>
                    {chatbotLoading ? '...' : '→ Envoyer'}
                  </Btn>
                </form>
              </Card>
            </div>
          )}

          {/* ─── DATABASE ─── */}
          {tab === 'database' && (
            <div className="space-y-6">
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Base de données Neon (par serveur)</h2>
                <p className="text-xs text-zinc-500 mb-3">Chaque serveur MC peut avoir sa propre base Neon pour stocker homes, warps, etc.</p>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">URL Neon du serveur sélectionné</label>
                  <Input value={neonDbUrl} onChange={setNeonDbUrl} placeholder="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require" />
                </div>
                <Btn onClick={handleSaveAI} variant="primary" className="mt-3">💾 Sauvegarder</Btn>
              </Card>
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-2">Tables créées par le plugin</h2>
                <div className="font-mono text-xs text-zinc-500 space-y-1">
                  {['homes (player_uuid, home_name, world, x, y, z, yaw, pitch)', 'warps (name, world, x, y, z, permission)', 'player_cooldowns (player_uuid, action, expires_at)', 'afk_sessions (player_uuid, zone_name, last_reward)'].map(t => (
                    <p key={t} className="text-cyan-600">• {t}</p>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ─── CODE PLUGIN ─── */}
          {tab === 'code' && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">config.yml du plugin</h2>
                <pre className="bg-zinc-950 rounded p-4 text-xs text-zinc-400 font-mono overflow-x-auto border border-zinc-800">{`# VertexMC Essential — config.yml
panel:
  api-url: "https://VOTRE-BACKEND.onrender.com/api/v1"
  api-key: "${srv?.apiKey || 'vtx_key_METTEZ_VOTRE_CLE_ICI'}"
  sync-interval: 30

neo-database:
  enabled: ${!!neonDbUrl}
  url: "${neonDbUrl || 'postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require'}"
  pool-settings:
    maximum-pool-size: 8
    minimum-idle: 3
    idle-timeout: 30000
    connection-timeout: 20000

modules:
  scoreboard: true
  tablist: true
  bossbar: true
  actionbar: true
  chat-format: true
  nametag: true
  navigation: true
  chatbot: true
  afk-zone: false`}</pre>
                <Btn onClick={() => navigator.clipboard.writeText(document.querySelector('pre').textContent)} className="mt-2 text-xs">
                  📋 Copier
                </Btn>
              </Card>
              <Card>
                <h2 className="text-sm font-semibold text-zinc-300 mb-2">Compilation Maven</h2>
                <pre className="bg-zinc-950 rounded p-3 text-xs text-green-400 font-mono border border-zinc-800">{`cd plugin
mvn clean package -DskipTests
# .jar → target/vertexessential-1.0.0.jar`}</pre>
              </Card>
            </div>
          )}

          {/* Color codes help - toujours visible en bas */}
          <div className="mt-8 pt-4 border-t border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Codes couleur Minecraft :</p>
            <div className="flex flex-wrap gap-1">
              {COLOR_CODES.slice(0,16).map(c => (
                <span key={c} className="text-xs font-mono px-1.5 py-0.5 bg-zinc-900 rounded cursor-pointer hover:bg-zinc-800"
                  style={{ color: COLOR_MAP[c[1]] || '#fff' }}
                  onClick={() => navigator.clipboard.writeText(c)}>
                  {c}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
