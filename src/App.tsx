import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Send, Trophy, Shield, Swords, ChevronDown, ChevronUp, MessageCircle, Star, X,
  AlertCircle, Loader2, WifiOff, Wifi, LogOut
} from 'lucide-react';

// Define TypeScript interfaces
interface RankData {
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
}

interface ChampionData {
  name: string;
  icon: string;
  winrate: number;
}

interface MatchData {
  id: number;
  champion: string;
  result: string;
  kda: string;
  cs: number;
  vision: number;
  duration: string;
}

interface UserData {
  name: string;
  level: number;
  profileIcon: string;
  rank: RankData;
  topChampions: ChampionData[];
  recentMatches: MatchData[];
}

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  system?: boolean;
  profileIcon?: string;
  isCurrentUser?: boolean;
}

const SUMMONER_API_URL = 'https://qijmbjbb26uh273zxckc5shfwi0hvtva.lambda-url.us-east-1.on.aws/';
const WEBSOCKET_URL = 'wss://9x0grhrp7g.execute-api.us-east-1.amazonaws.com/production/';

const App: React.FC = () => {
  // Lookup state
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [summonerName, setSummonerName] = useState<string>('');
  const [region, setRegion] = useState<string>('na1');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>('');

  // WebSocket state
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const messageQueueRef = useRef<any[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'RiotBot', text: 'Welcome to Summoner\'s Rift Chat! Type /stats to see your performance stats.', time: '10:30 AM', system: true }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [showStats, setShowStats] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User stats state (will be populated from backend)
  const [currentUser, setCurrentUser] = useState<UserData>({
    name: '',
    level: 0,
    profileIcon: '',
    rank: { tier: 'UNRANKED', division: '', lp: 0, wins: 0, losses: 0 },
    topChampions: [],
    recentMatches: []
  });

  // Setup WebSocket connection after lookup
  useEffect(() => {
    if (hasSubmitted && !isConnected && !isConnecting) {
      connectToWebSocket();
    }
  }, [hasSubmitted, isConnecting, isConnected]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectToWebSocket = () => {
    if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) return;

    setIsConnecting(true);
    updateConnectionStatus('Connecting...');

    try {
      const newSocket = new WebSocket(WEBSOCKET_URL);

      newSocket.onopen = () => {
        console.log('Connected to WebSocket API');
        updateConnectionStatus('Connected');
        setIsConnected(true);
        setIsConnecting(false);
        setSocket(newSocket);

        // Process queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          newSocket.send(JSON.stringify(queuedMessage));
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('Received:', response);

          if (response.type === 'chunk' && response.content) {
            // Add chunk to the last assistant message
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.sender === 'RiotBot' && !lastMessage.system) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, text: lastMessage.text + response.content }
                ];
              }
              return prev;
            });
          } else if (response.type === 'end') {
            setIsTyping(false);
          } else if (response.type === 'error') {
            setIsTyping(false);
            addSystemMessage('⚠️ Error processing your request. Please try again.');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          setIsTyping(false);
          addSystemMessage('⚠️ Failed to process server response.');
        }
      };

      newSocket.onclose = (evt) => {
        console.log('WebSocket closed:', evt.reason);
        setIsConnected(false);
        updateConnectionStatus('Disconnected');

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!isConnected && hasSubmitted) {
            connectToWebSocket();
          }
        }, 3000);
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('Error');
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Connection error:', error);
      updateConnectionStatus('Failed');
      setIsConnecting(false);
    }
  };

  const updateConnectionStatus = (status: string) => {
    setConnectionStatus(status);
  };

  const addSystemMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now(),
      sender: 'System',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      system: true
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isConnecting) return;

    const trimmedMessage = inputMessage.trim();

    // Handle special commands first
    if (trimmedMessage.toLowerCase() === '/stats') {
      setShowStats(true);
      addSystemMessage('📊 Showing your performance stats. Type /hide to close.');
      setInputMessage('');
      return;
    }

    if (trimmedMessage.toLowerCase() === '/hide') {
      setShowStats(false);
      addSystemMessage('✅ Stats panel hidden.');
      setInputMessage('');
      return;
    }

    if (trimmedMessage.toLowerCase() === '/logout') {
      if (socket) {
        socket.close();
      }
      setHasSubmitted(false);
      setMessages([]);
      addSystemMessage('🔒 You have been logged out.');
      setInputMessage('');
      return;
    }

    if (trimmedMessage.toLowerCase() === '/help') {
      addSystemMessage('/stats - Show performance stats\n/hide - Hide stats panel\n/logout - Return to lookup screen\n/help - Show this help');
      setInputMessage('');
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now(),
      sender: currentUser.name || 'User',
      text: trimmedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      profileIcon: currentUser.profileIcon || 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png',
      isCurrentUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Prepare message for WebSocket
    const messageData = {
      messages: [
        { role: "user", content: trimmedMessage }
      ]
    };

    // Add initial bot response placeholder
    const botMessage: Message = {
      id: Date.now() + 1,
      sender: 'RiotBot',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      profileIcon: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png'
    };

    setMessages(prev => [...prev, botMessage]);

    // Send message through WebSocket
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(messageData));
    } else {
      // Queue message if not connected
      messageQueueRef.current.push(messageData);
      updateConnectionStatus('Reconnecting...');
      connectToWebSocket();
    }
  };

  // Handle summoner lookup using separate API endpoint
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summonerName.trim()) {
      setLookupError('Summoner name is required');
      return;
    }

    if (!summonerName.includes('#')) {
        // FIX: setResponseMessage only takes one argument
        setLookupError('Please use Riot ID format: GameName#TAG');
        return;
    }

    setLookupError('');
    setIsLookingUp(true);

    try {
      // Call your separate summoner lookup API
      const response = await fetch(SUMMONER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summonerName: summonerName.trim(),
          region: region
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Process the API response and create user data
        setLookupError('The response is here');
        const processedData = {
          name: data.summoner.name,
          level: data.summoner.level,
          profileIcon: `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png`, // Using default icon
          rank: {
            tier: data.summoner.tier,
            division: data.summoner.rank,
            lp: data.summoner.leaguePoints,
            wins: data.summoner.wins,
            losses: data.summoner.losses
          },
          topChampions: data.topChampions.slice(0, 3).map((champ: any, index: number) => {
            // Map champion IDs to names and icons
            const championNames: Record<number, string> = {
              92: 'Riven',
              67: 'Vayne',
              126: 'Jayce',
              266: 'Aatrox',
              103: 'Ahri',
              84: 'Akali',
              12: 'Alistar',
              32: 'Amumu',
              34: 'Anivia',
              1: 'Annie',
              22: 'Ashe',
              136: 'Aurelion Sol',
              268: 'Azir',
              432: 'Bard',
              53: 'Blitzcrank',
              63: 'Brand',
              201: 'Braum',
              51: 'Caitlyn',
              164: 'Camille',
              69: 'Cassiopeia',
              31: 'Chogath',
              42: 'Corki',
              122: 'Darius',
              131: 'Diana',
              119: 'Draven',
              36: 'DrMundo',
              245: 'Ekko',
              60: 'Elise',
              28: 'Evelynn',
              81: 'Ezreal',
              9: 'Fiddlesticks',
              114: 'Fiora',
              105: 'Fizz',
              3: 'Galio',
              41: 'Gangplank',
              86: 'Garen',
              150: 'Gnar',
              79: 'Gragas',
              104: 'Graves',
              120: 'Hecarim',
              74: 'Heimerdinger',
              420: 'Illaoi',
              39: 'Irelia',
              427: 'Ivern',
              40: 'Janna',
              24: 'Jax',
              126: 'Jayce',
              59: 'Jax',
              106: 'Volibear',
              202: 'Jhin',
              222: 'Jinx',
              145: 'Kaisa',
              429: 'Kalista',
              43: 'Karma',
              30: 'Karthus',
              38: 'Kassadin',
              55: 'Katarina',
              10: 'Kayle',
              85: 'Kennen',
              121: 'KhaZix',
              203: 'Kindred',
              240: 'Kled',
              96: 'KogMaw',
              7: 'Leblanc',
              64: 'LeeSin',
              89: 'Leona',
              127: 'Lissandra',
              236: 'Lucian',
              117: 'Lulu',
              99: 'Lux',
              54: 'Malphite',
              90: 'Malzahar',
              57: 'Maokai',
              11: 'MasterYi',
              21: 'MissFortune',
              82: 'Mordekaiser',
              25: 'Morgana',
              267: 'Nami',
              75: 'Nasus',
              111: 'Nautilus',
              518: 'Neeko',
              76: 'Nidalee',
              56: 'Nocturne',
              20: 'Nunu',
              2: 'Olaf',
              61: 'Orianna',
              58: 'Orianna',
              80: 'Pantheon',
              78: 'Poppy',
              555: 'Pyke',
              246: 'Qiyana',
              133: 'Quinn',
              497: 'Rakan',
              33: 'Rammus',
              421: 'RekSai',
              526: 'Rell',
              58: 'Renekton',
              107: 'Rengar',
              92: 'Riven',
              68: 'Rumble',
              13: 'Ryze',
              113: 'Sejuani',
              35: 'Shaco',
              98: 'Shen',
              102: 'Shyvana',
              27: 'Singed',
              14: 'Sion',
              15: 'Sivir',
              72: 'Skarner',
              37: 'Sona',
              16: 'Soraka',
              50: 'Swain',
              134: 'Syndra',
              223: 'TahmKench',
              163: 'Taliyah',
              91: 'Talon',
              44: 'Taric',
              17: 'Teemo',
              412: 'Thresh',
              18: 'Tristana',
              48: 'Trundle',
              23: 'Tryndamere',
              4: 'TwistedFate',
              29: 'Twitch',
              77: 'Udyr',
              6: 'Urgot',
              110: 'Varus',
              67: 'Vayne',
              45: 'Veigar',
              161: 'Velkoz',
              254: 'Vi',
              112: 'Viktor',
              8: 'Vladimir',
              106: 'Volibear',
              19: 'Warwick',
              62: 'Wukong',
              498: 'Xayah',
              101: 'Xerath',
              5: 'XinZhao',
              157: 'Yasuo',
              83: 'Yorick',
              154: 'Zac',
              238: 'Zed',
              115: 'Ziggs',
              26: 'Zilean',
              142: 'Zoe',
              143: 'Zyra'
            };

            const championIcons: Record<number, string> = {
              92: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Riven.png',
              67: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Vayne.png',
              126: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jayce.png',
              266: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Aatrox.png',
              103: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ahri.png',
              84: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Akali.png',
              12: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Alistar.png',
              32: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Amumu.png',
              34: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Anivia.png',
              1: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Annie.png',
              22: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ashe.png',
              136: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/AurelionSol.png',
              268: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Azir.png',
              432: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Bard.png',
              53: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Blitzcrank.png',
              63: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Brand.png',
              201: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Braum.png',
              51: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Caitlyn.png',
              164: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Camille.png',
              69: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Cassiopeia.png',
              31: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Chogath.png',
              42: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Corki.png',
              122: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Darius.png',
              131: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Diana.png',
              119: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Draven.png',
              36: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/DrMundo.png',
              245: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ekko.png',
              60: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Elise.png',
              28: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Evelynn.png',
              81: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ezreal.png',
              9: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Fiddlesticks.png',
              114: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Fiora.png',
              105: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Fizz.png',
              3: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Galio.png',
              41: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Gangplank.png',
              86: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Garen.png',
              150: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Gnar.png',
              79: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Gragas.png',
              104: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Graves.png',
              120: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Hecarim.png',
              74: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Heimerdinger.png',
              420: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Illaoi.png',
              39: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Irelia.png',
              427: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ivern.png',
              40: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Janna.png',
              24: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jax.png',
              126: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jayce.png',
              59: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jax.png',
              106: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Volibear.png',
              202: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jhin.png',
              222: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Jinx.png',
              145: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kaisa.png',
              429: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kalista.png',
              43: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Karma.png',
              30: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Karthus.png',
              38: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kassadin.png',
              55: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Katarina.png',
              10: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kayle.png',
              85: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kennen.png',
              121: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/KhaZix.png',
              203: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kindred.png',
              240: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Kled.png',
              96: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/KogMaw.png',
              7: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Leblanc.png',
              64: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/LeeSin.png',
              89: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Leona.png',
              127: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Lissandra.png',
              236: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Lucian.png',
              117: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Lulu.png',
              99: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Lux.png',
              54: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Malphite.png',
              90: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Malzahar.png',
              57: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Maokai.png',
              11: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/MasterYi.png',
              21: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/MissFortune.png',
              82: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Mordekaiser.png',
              25: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Morgana.png',
              267: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nami.png',
              75: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nasus.png',
              111: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nautilus.png',
              518: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Neeko.png',
              76: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nidalee.png',
              56: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nocturne.png',
              20: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Nunu.png',
              2: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Olaf.png',
              61: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Orianna.png',
              58: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Orianna.png',
              80: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Pantheon.png',
              78: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Poppy.png',
              555: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Pyke.png',
              246: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Qiyana.png',
              133: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Quinn.png',
              497: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Rakan.png',
              33: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Rammus.png',
              421: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/RekSai.png',
              526: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Rell.png',
              58: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Renekton.png',
              107: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Rengar.png',
              92: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Riven.png',
              68: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Rumble.png',
              13: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ryze.png',
              113: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Sejuani.png',
              35: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Shaco.png',
              98: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Shen.png',
              102: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Shyvana.png',
              27: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Singed.png',
              14: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Sion.png',
              15: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Sivir.png',
              72: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Skarner.png',
              37: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Sona.png',
              16: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Soraka.png',
              50: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Swain.png',
              134: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Syndra.png',
              223: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/TahmKench.png',
              163: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Taliyah.png',
              91: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Talon.png',
              44: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Taric.png',
              17: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Teemo.png',
              412: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Thresh.png',
              18: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Tristana.png',
              48: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Trundle.png',
              23: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Tryndamere.png',
              4: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/TwistedFate.png',
              29: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Twitch.png',
              77: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Udyr.png',
              6: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Urgot.png',
              110: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Varus.png',
              67: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Vayne.png',
              45: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Veigar.png',
              161: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Velkoz.png',
              254: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Vi.png',
              112: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Viktor.png',
              8: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Vladimir.png',
              106: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Volibear.png',
              19: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Warwick.png',
              62: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Wukong.png',
              498: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Xayah.png',
              101: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Xerath.png',
              5: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/XinZhao.png',
              157: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Yasuo.png',
              83: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Yorick.png',
              154: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Zac.png',
              238: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Zed.png',
              115: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Ziggs.png',
              26: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Zilean.png',
              142: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Zoe.png',
              143: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Zyra.png'
            };

            return {
              name: championNames[champ.championId] || `Champion ${champ.championId}`,
              icon: championIcons[champ.championId] || 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Unknown.png',
              winrate: 50 + Math.random() * 20 // Placeholder winrate since not in API
            };
          }),
          recentMatches: [] // Placeholder - would need additional API call for match history
        };

        // Update user data with real API data
        setCurrentUser(processedData);

        setHasSubmitted(true);
        setIsLookingUp(false);
        addSystemMessage(`✅ Welcome, ${data.summoner.name}! Your stats have been loaded.`);

        // Connect to WebSocket after successful lookup
        if (!isConnected) {
          connectToWebSocket();
        }
      } else {
        setLookupError(data.message || 'Failed to find summoner. Please check name and region.');
        setIsLookingUp(false);
      }
    } catch (error) {
      setLookupError('Network error. Please try again.');
      setIsLookingUp(false);
      console.error('Lookup error:', error);
    }
  };

  // Generate gradient based on rank
  const getRankGradient = (tier: string) => {
    const tierKey = tier.toUpperCase().split(' ')[0];
    const gradients: Record<string, string> = {
      IRON: 'from-gray-700 to-gray-600',
      BRONZE: 'from-amber-900 to-amber-800',
      SILVER: 'from-gray-400 to-gray-300',
      GOLD: 'from-yellow-700 to-yellow-500',
      PLATINUM: 'from-cyan-600 to-cyan-400',
      EMERALD: 'from-emerald-700 to-emerald-500',
      DIAMOND: 'from-blue-600 to-purple-600',
      MASTER: 'from-violet-800 to-pink-700',
      GRANDMASTER: 'from-red-800 to-orange-700',
      CHALLENGER: 'from-yellow-400 to-purple-900',
      UNRANKED: 'from-gray-600 to-gray-500'
    };
    return gradients[tierKey] || 'from-gray-700 to-gray-600';
  };

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'Connected':
        return <Wifi className="text-green-500 mr-1" size={18} />;
      case 'Connecting...':
        return <Loader2 className="animate-spin text-yellow-500 mr-1" size={18} />;
      case 'Disconnected':
        return <WifiOff className="text-red-500 mr-1" size={18} />;
      default:
        return <AlertCircle className="text-yellow-500 mr-1" size={18} />;
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    setHasSubmitted(false);
    setMessages([]);
    setConnectionStatus('Disconnected');
    setIsConnected(false);
  };

  // Render lookup screen before chat loads
  if (!hasSubmitted) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#0a0e17] to-[#1a1e2b] items-center justify-center p-4">
        <div className="bg-[#0f1423]/95 backdrop-blur-sm border border-[#3f4c7d]/30 rounded-2xl p-8 w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] flex items-center justify-center">
                <Trophy className="text-white" size={48} />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
              League of Legends Stats
            </h1>
            <p className="text-gray-400 mt-2">Enter your summoner details to begin</p>
          </div>

          <form onSubmit={handleLookupSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Summoner Name</label>
              <input
                type="text"
                value={summonerName}
                onChange={(e) => {
                  setSummonerName(e.target.value);
                  setLookupError('');
                }}
                placeholder="Enter your summoner name"
                className="w-full bg-[#151e33] border border-[#3f4c7d]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7b61ff] focus:border-transparent"
                required
              />
              {lookupError && <p className="text-red-400 text-xs mt-1">{lookupError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#151e33] border border-[#3f4c7d]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7b61ff] focus:border-transparent"
              >
                {['na1', 'euw1', 'eun1', 'kr', 'tr1', 'jp1', 'oc1', 'ph2'].map((reg) => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLookingUp || !summonerName.trim()}
              className="w-full bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLookingUp ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Looking up summoner...
                </>
              ) : (
                'Find Summoner'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#3f4c7d]/30 text-center text-xs text-gray-500">
            <p>Data provided by Riot Games API • Not affiliated with Riot Games</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0a0e17] to-[#1a1e2b] text-gray-300 font-inter overflow-hidden">
      {/* Left Sidebar - Performance Stats - 10% wider than original */}
      <div className={`${
        showStats ? 'block' : 'hidden md:block'
      } w-full md:w-[28rem] bg-[#0f1423]/95 backdrop-blur-sm border-r border-[#3f4c7d]/20 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="p-5 border-b border-[#3f4c7d]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#7b61ff] overflow-hidden">
                  <img
                    src={currentUser.profileIcon}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 bg-[#2c3e75] text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-[#0a0e17]">
                  {currentUser.level}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
                  {currentUser.name}
                </h1>
                <div className={`mt-1 p-1 px-2 inline-block rounded-lg bg-gradient-to-r ${getRankGradient(currentUser.rank.tier)}`}>
                  <span className="font-bold text-white text-sm">
                    {currentUser.rank.tier} {currentUser.rank.division} • {currentUser.rank.lp} LP
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-[#ff5252] transition-colors rounded-lg hover:bg-[#2c3e75]"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="p-5 border-b border-[#3f4c7d]/30">
          <div className="flex justify-between mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4d8cff]">{currentUser.rank.wins}</div>
              <div className="text-xs text-gray-400">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ff5252]">{currentUser.rank.losses}</div>
              <div className="text-xs text-gray-400">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ffcc00] to-[#ff9900]">
                {currentUser.rank.wins > 0 ? Math.round((currentUser.rank.wins / (currentUser.rank.wins + currentUser.rank.losses)) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Trophy className="text-yellow-400" size={18} />
              <span className="font-medium">Highest Rank: Unranked</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="text-blue-400" size={18} />
              <span className="font-medium">Top Position: N/A</span>
            </div>
            <div className="flex items-center space-x-2">
              <Swords className="text-red-400" size={18} />
              <span className="font-medium">Average KDA: N/A</span>
            </div>
          </div>
        </div>

        {/* Top Champions */}
        <div className="p-5 border-b border-[#3f4c7d]/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-[#7b61ff] flex items-center">
              <Star className="mr-2" size={18} /> Top Champions
            </h2>
            <span className="text-xs bg-[#2c3e75]/50 px-2 py-0.5 rounded">Based on Mastery Points</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {currentUser.topChampions.map((champ, index) => (
              <div
                key={index}
                className="bg-[#151e33]/70 rounded-xl p-3 border border-[#3f4c7d]/30 hover:border-[#7b61ff] transition-all"
              >
                <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-[#7b61ff]/50">
                  <img
                    src={champ.icon}
                    alt={champ.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-center font-medium mt-2 text-sm truncate">{champ.name}</p>
                <p className="text-center text-[#4dff91] font-bold text-xs mt-1">{champ.winrate.toFixed(0)}% WR</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-[#7b61ff] flex items-center">
              <MessageCircle className="mr-2" size={18} /> Recent Matches
            </h2>
            <span className="text-xs bg-[#2c3e75]/50 px-2 py-0.5 rounded">No match data available</span>
          </div>

          <div className="text-center py-10 text-gray-500">
            <p>No recent matches found.</p>
            <p className="text-sm mt-2">Match history data requires additional API integration.</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-[#3f4c7d]/30 bg-[#0f1423]/95 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
                Summoner's Rift
              </h1>
              <div className="flex items-center mt-1">
                {getStatusIndicator()}
                <span className={`text-sm ${
                  connectionStatus === 'Connected' ? 'text-green-400' :
                  connectionStatus === 'Connecting...' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {connectionStatus}
                </span>
                {isConnected && (
                  <button
                    onClick={() => {
                      if (socket) socket.close();
                      setIsConnected(false);
                      updateConnectionStatus('Disconnected');
                    }}
                    className="ml-3 flex items-center text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={14} className="mr-1" /> Disconnect
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 md:mt-0 flex space-x-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3 py-1.5 bg-[#2c3e75] hover:bg-[#3a529a] transition-colors rounded-lg flex items-center text-sm"
              >
                {showStats ? (
                  <>
                    <ChevronDown className="mr-1" size={16} /> Hide Stats
                  </>
                ) : (
                  <>
                    <ChevronUp className="mr-1" size={16} /> Show Stats
                  </>
                )}
              </button>
              <button className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#2d3d55] transition-colors rounded-lg flex items-center text-sm">
                <Search className="mr-1" size={16} /> Find Friends
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'} ${
                message.system ? 'justify-center' : ''
              }`}
            >
              {!message.system && !message.isCurrentUser && (
                <div className="mr-3 mt-6">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
                    <img
                      src={message.profileIcon || 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png'}
                      alt={message.sender}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[70%] rounded-xl p-4 ${
                  message.system
                    ? 'bg-[#2c3e75]/30 border border-[#7b61ff]/30 text-center w-full'
                    : message.isCurrentUser
                      ? 'bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white rounded-br-none'
                      : 'bg-[#151e33] border border-[#3f4c7d]/30 rounded-bl-none'
                }`}
              >
                {!message.system && (
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${message.isCurrentUser ? 'text-white' : 'text-[#7b61ff]'}`}>
                      {message.sender}
                    </span>
                    <span className={`text-xs ${
                      message.isCurrentUser ? 'text-purple-100/80' : 'text-gray-400'
                    }`}>
                      {message.time}
                    </span>
                  </div>
                )}
                <p className={`break-words ${message.system ? 'text-[#7b61ff] italic' : ''}`}>
                  {message.text}
                  {isTyping && message.sender === 'RiotBot' && !message.system && message.id === messages[messages.length - 1].id && (
                    <span className="animate-pulse">_</span>
                  )}
                </p>
              </div>

              {message.isCurrentUser && !message.system && (
                <div className="ml-3 mt-6">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
                    <img
                      src={message.profileIcon}
                      alt={message.sender}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="mr-3 mt-6">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
                  <img
                    src="https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png"
                    alt="RiotBot"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="bg-[#151e33] border border-[#3f4c7d]/30 rounded-xl p-4 rounded-bl-none max-w-[70%]">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse delay-200"></div>
                  <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse delay-400"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#3f4c7d]/30 bg-[#0f1423]/95 backdrop-blur-sm">
          <div className="flex items-center bg-[#151e33] rounded-xl border border-[#3f4c7d]/30 px-4 py-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
              placeholder={isConnecting ? "Connecting to server..." : "Type a message... (try '/stats', '/help')"}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 px-2 py-1"
              disabled={isConnecting || !isConnected}
            />
            <button
              type="submit"
              className={`p-1.5 ${isConnecting || !inputMessage.trim() || !isConnected ? 'text-gray-600 cursor-not-allowed' : 'text-[#7b61ff] hover:bg-[#2c3e75]'} rounded-lg transition-colors`}
              disabled={isConnecting || !inputMessage.trim() || !isConnected}
            >
              <Send size={20} />
            </button>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <div>
              {isConnected ? (
                <span className="text-green-400 flex items-center">
                  <Wifi size={12} className="mr-1" /> Online
                </span>
              ) : (
                <span className="text-red-400 flex items-center">
                  <WifiOff size={12} className="mr-1" /> Offline
                </span>
              )}
            </div>
            <span>Press Enter to send • Commands: /stats /hide /help</span>
          </div>
        </form>
      </div>

      {/* Mobile Stats Toggle Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowStats(!showStats)}
          className={`p-4 rounded-full shadow-lg transition-all ${
            showStats
              ? 'bg-[#151e33] text-[#7b61ff] animate-bounce'
              : 'bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white'
          }`}
        >
          {showStats ? <X size={24} /> : <Trophy size={24} />}
        </button>
      </div>
    </div>
  );
};

export default App;
