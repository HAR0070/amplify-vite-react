// src/App.tsx

import { useState } from 'react';
import './App.css';

// Get the URL from the environment variable
const LAMBDA_URL = import.meta.env.SUMMONER_API_URL;

function App() {

  const [summoner, setSummoner] = useState({
    riotId: '',
    region: 'na1', // Default region
  });

  // State for the message from the Lambda
  const [responseMessage, setResponseMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Stop the form from reloading the page
    setResponseMessage('Sending...');

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          riotId: summoner.riotId,
          region: summoner.region,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResponseMessage(`Success: ${JSON.stringify(data)}`);

      // Clear the input after submit
      setSummoner({ ...summoner, riotId: '' });

    } catch (error) {
      console.error('Error sending data:', error);
      setResponseMessage(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <main>

      <div id="lookup-screen" className="lookup-container">
        <div className="lookup-box">
          <div className="lookup-header">
            <div className="lookup-trophy-icon"></div>
            <h1>League of Legends Stats</h1>
            <p>Enter your summoner details to begin</p>
          </div>
          <form
            onSubmit={handleSubmit}
            id="lookup-form"
            className="lookup-form-container">
            <div className="form-group">
              <label htmlFor="summoner-name">Summoner Name</label>
              <input
                type="text"
                id="summoner-name"
                value={summoner.riotId}
                onChange={(e) =>
                  setSummoner({ ...summoner, riotId: e.target.value })
                }
                placeholder="Enter your summoner name"
                required
              />
              <p
                id="lookup-error"
                className="lookup-error"
                style={{ display: 'none' }}
              ></p>
            </div>

            <div className="form-group">
              <label htmlFor="region">Region</label>
              <select
                id="region"
                value={summoner.region}
                onChange={(e) =>
                  setSummoner({ ...summoner, region: e.target.value })
                }
              >
                <option value="na1">NA</option>
                <option value="euw1">EUW</option>
                <option value="eun1">EUNE</option>
                <option value="kr">KR</option>
                <option value="tr1">europe</option>
                <option value="jp1">asia</option>
                <option value="oc1">sea</option>
                <option value="ph2">sea</option>


              </select>
            </div>

            <button
              type="submit"
              id="lookup-submit-btn"
              className="lookup-submit-btn"
            >
              <span>Find Summoner</span>
            </button>
          </form>

          <div className="lookup-footer">
            <p>Data provided by Riot Games API • Not affiliated with Riot Games</p>
          </div>
        </div>
      </div>

      {/* Display the response from the Lambda */}
      {responseMessage && <p>{responseMessage}</p>}

      <div>
        🥳 App successfully hosted
        <br />
        {/* Fixed this comment */}
      </div>
    </main>
  );
}

export default App;

//
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   Search, Send, Trophy, Shield, Swords, ChevronDown, ChevronUp, MessageCircle, Star, X, Check,
//   AlertCircle, Loader2, WifiOff, Wifi, LogOut, ArrowLeft
// } from 'lucide-react';
//
// // const  = 'https://your-summoner-api-gateway-url.execute-api.us-east-1.amazonaws.com/production/summoner'; // Replace with your summoner API URL
// // const  = 'wss://9x0grhrp7g.execute-api.us-east-1.amazonaws.com/production/'; // Your existing WebSocket URL
// const SUMMONER_API_URL = import.meta.env.SUMMONER_API_URL;
// const WEBSOCKET_URL = import.meta.env.WEBSOCKET_URL;
//
//
// function App() {
//   // Lookup state
//   const [hasSubmitted, setHasSubmitted] = useState(false);
//   const [summonerName, setSummonerName] = useState('');
//   const [region, setRegion] = useState('NA');
//   const [isLookingUp, setIsLookingUp] = useState(false);
//   const [lookupError, setLookupError] = useState('');
//
//   // WebSocket state
//   const [socket, setSocket] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [connectionStatus, setConnectionStatus] = useState('Disconnected');
//   const [isConnecting, setIsConnecting] = useState(false);
//   const messageQueueRef = useRef([]);
//
//   // Chat state
//   const [messages, setMessages] = useState([
//     { id: 1, sender: 'RiotBot', text: 'Welcome to Summoner\'s Rift Chat! Type /stats to see your performance stats.', time: '10:30 AM', system: true }
//   ]);
//   const [inputMessage, setInputMessage] = useState('');
//   const [showStats, setShowStats] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const messagesEndRef = useRef(null);
//
//   // User stats state (will be populated from backend)
//   const [currentUser, setCurrentUser] = useState({
//     name: '',
//     level: 0,
//     profileIcon: '',
//     rank: { tier: '', division: '', lp: 0, wins: 0, losses: 0 },
//     topChampions: [],
//     recentMatches: []
//   });
//
//   // Setup WebSocket connection after lookup
//   useEffect(() => {
//     if (hasSubmitted && !isConnected && !isConnecting) {
//       connectToWebSocket();
//     }
//   }, [hasSubmitted]);
//
//   // Auto-scroll to bottom of chat
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isTyping]);
//
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };
//
//   const connectToWebSocket = () => {
//     if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) return;
//
//     setIsConnecting(true);
//     updateConnectionStatus('Connecting...');
//
//     try {
//       const newSocket = new WebSocket(WEBSOCKET_URL);
//
//       newSocket.onopen = () => {
//         console.log('Connected to WebSocket API');
//         updateConnectionStatus('Connected');
//         setIsConnected(true);
//         setIsConnecting(false);
//         setSocket(newSocket);
//
//         // Process queued messages
//         while (messageQueueRef.current.length > 0) {
//           const queuedMessage = messageQueueRef.current.shift();
//           newSocket.send(JSON.stringify(queuedMessage));
//         }
//       };
//
//       newSocket.onmessage = (event) => {
//         try {
//           const response = JSON.parse(event.data);
//           console.log('Received:', response);
//
//           if (response.type === 'chunk' && response.content) {
//             // Add chunk to the last assistant message
//             setMessages(prev => {
//               const lastMessage = prev[prev.length - 1];
//               if (lastMessage && lastMessage.sender === 'RiotBot' && !lastMessage.system) {
//                 return [
//                   ...prev.slice(0, -1),
//                   { ...lastMessage, text: lastMessage.text + response.content }
//                 ];
//               }
//               return prev;
//             });
//           } else if (response.type === 'end') {
//             setIsTyping(false);
//           } else if (response.type === 'error') {
//             setIsTyping(false);
//             addSystemMessage('⚠️ Error processing your request. Please try again.');
//           }
//         } catch (error) {
//           console.error('Error parsing message:', error);
//           setIsTyping(false);
//           addSystemMessage('⚠️ Failed to process server response.');
//         }
//       };
//
//       newSocket.onclose = (evt) => {
//         console.log('WebSocket closed:', evt.reason);
//         setIsConnected(false);
//         updateConnectionStatus('Disconnected');
//
//         // Attempt to reconnect after 3 seconds
//         setTimeout(() => {
//           if (!isConnected && hasSubmitted) {
//             connectToWebSocket();
//           }
//         }, 3000);
//       };
//
//       newSocket.onerror = (error) => {
//         console.error('WebSocket error:', error);
//         updateConnectionStatus('Error');
//         setIsConnected(false);
//         setIsConnecting(false);
//       };
//
//     } catch (error) {
//       console.error('Connection error:', error);
//       updateConnectionStatus('Failed');
//       setIsConnecting(false);
//     }
//   };
//
//   const updateConnectionStatus = (status) => {
//     setConnectionStatus(status);
//   };
//
//   const addSystemMessage = (text) => {
//     const newMessage = {
//       id: Date.now(),
//       sender: 'System',
//       text: text,
//       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//       system: true
//     };
//     setMessages(prev => [...prev, newMessage]);
//   };
//
//   const handleSendMessage = (e) => {
//     e.preventDefault();
//     if (!inputMessage.trim() || isConnecting) return;
//
//     const trimmedMessage = inputMessage.trim();
//
//     // Handle special commands first
//     if (trimmedMessage.toLowerCase() === '/stats') {
//       setShowStats(true);
//       addSystemMessage('📊 Showing your performance stats. Type /hide to close.');
//       setInputMessage('');
//       return;
//     }
//
//     if (trimmedMessage.toLowerCase() === '/hide') {
//       setShowStats(false);
//       addSystemMessage('✅ Stats panel hidden.');
//       setInputMessage('');
//       return;
//     }
//
//     if (trimmedMessage.toLowerCase() === '/logout') {
//       if (socket) {
//         socket.close();
//       }
//       setHasSubmitted(false);
//       setMessages([]);
//       addSystemMessage('🔒 You have been logged out.');
//       setInputMessage('');
//       return;
//     }
//
//     if (trimmedMessage.toLowerCase() === '/help') {
//       addSystemMessage('/stats - Show performance stats\n/hide - Hide stats panel\n/logout - Return to lookup screen\n/help - Show this help');
//       setInputMessage('');
//       return;
//     }
//
//     // Add user message immediately
//     const userMessage = {
//       id: Date.now(),
//       sender: currentUser.name || 'User',
//       text: trimmedMessage,
//       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//       profileIcon: currentUser.profileIcon || 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png',
//       isCurrentUser: true
//     };
//
//     setMessages(prev => [...prev, userMessage]);
//     setInputMessage('');
//     setIsTyping(true);
//
//     // Prepare message for WebSocket
//     const messageData = {
//       messages: [
//         { role: "user", content: trimmedMessage }
//       ]
//     };
//
//     // Add initial bot response placeholder
//     const botMessage = {
//       id: Date.now() + 1,
//       sender: 'RiotBot',
//       text: '',
//       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//       profileIcon: 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png'
//     };
//
//     setMessages(prev => [...prev, botMessage]);
//
//     // Send message through WebSocket
//     if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
//       socket.send(JSON.stringify(messageData));
//     } else {
//       // Queue message if not connected
//       messageQueueRef.current.push(messageData);
//       updateConnectionStatus('Reconnecting...');
//       connectToWebSocket();
//     }
//   };
//
//   // Handle summoner lookup using separate API endpoint
//   const handleLookupSubmit = async (e) => {
//     e.preventDefault();
//     if (!summonerName.trim()) {
//       setLookupError('Summoner name is required');
//       return;
//     }
//
//     setLookupError('');
//     setIsLookingUp(true);
//
//     try {
//       // Call your separate summoner lookup API
//       const response = await fetch(SUMMONER_API_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           summonerName: summonerName.trim(),
//           region: region
//         })
//       });
//
//       const data = await response.json();
//
//       if (response.ok) {
//         // Update user data with real API data
//         setCurrentUser({
//           name: data.name,
//           level: data.level,
//           profileIcon: data.profileIcon,
//           rank: {
//             tier: data.rank.tier,
//             division: data.rank.division,
//             lp: data.rank.lp,
//             wins: data.rank.wins,
//             losses: data.rank.losses
//           },
//           topChampions: data.topChampions,
//           recentMatches: data.recentMatches
//         });
//
//         setHasSubmitted(true);
//         setIsLookingUp(false);
//         addSystemMessage(`✅ Welcome, ${data.name}! Your stats have been loaded.`);
//
//         // Connect to WebSocket after successful lookup
//         if (!isConnected) {
//           connectToWebSocket();
//         }
//       } else {
//         setLookupError(data.message || 'Failed to find summoner. Please check name and region.');
//         setIsLookingUp(false);
//       }
//     } catch (error) {
//       setLookupError('Network error. Please try again.');
//       setIsLookingUp(false);
//       console.error('Lookup error:', error);
//     }
//   };
//
//   // Generate gradient based on rank
//   const getRankGradient = (tier) => {
//     const tierKey = tier.toUpperCase().split(' ')[0];
//     const gradients = {
//       IRON: 'from-gray-700 to-gray-600',
//       BRONZE: 'from-amber-900 to-amber-800',
//       SILVER: 'from-gray-400 to-gray-300',
//       GOLD: 'from-yellow-700 to-yellow-500',
//       PLATINUM: 'from-cyan-600 to-cyan-400',
//       EMERALD: 'from-emerald-700 to-emerald-500',
//       DIAMOND: 'from-blue-600 to-purple-600',
//       MASTER: 'from-violet-800 to-pink-700',
//       GRANDMASTER: 'from-red-800 to-orange-700',
//       CHALLENGER: 'from-yellow-400 to-purple-900'
//     };
//     return gradients[tierKey] || 'from-gray-700 to-gray-600';
//   };
//
//   const getStatusIndicator = () => {
//     switch (connectionStatus) {
//       case 'Connected':
//         return <Wifi className="text-green-500 mr-1" size={18} />;
//       case 'Connecting...':
//         return <Loader2 className="animate-spin text-yellow-500 mr-1" size={18} />;
//       case 'Disconnected':
//         return <WifiOff className="text-red-500 mr-1" size={18} />;
//       default:
//         return <AlertCircle className="text-yellow-500 mr-1" size={18} />;
//     }
//   };
//
//   const handleLogout = () => {
//     if (socket) {
//       socket.close();
//     }
//     setHasSubmitted(false);
//     setMessages([]);
//     setConnectionStatus('Disconnected');
//     setIsConnected(false);
//   };
//
//   // Render lookup screen before chat loads
//   if (!hasSubmitted) {
//     return (
//       <div className="flex h-screen bg-gradient-to-br from-[#0a0e17] to-[#1a1e2b] items-center justify-center p-4">
//         <div className="bg-[#0f1423]/95 backdrop-blur-sm border border-[#3f4c7d]/30 rounded-2xl p-8 w-full max-w-md mx-4">
//           <div className="text-center mb-8">
//             <div className="flex justify-center mb-4">
//               <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] flex items-center justify-center">
//                 <Trophy className="text-white" size={48} />
//               </div>
//             </div>
//             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
//               League of Legends Stats
//             </h1>
//             <p className="text-gray-400 mt-2">Enter your summoner details to begin</p>
//           </div>
//
//           <form onSubmit={handleLookupSubmit} className="space-y-6">
//             <div>
//               <label className="block text-sm font-medium mb-2 text-gray-300">Summoner Name</label>
//               <input
//                 type="text"
//                 value={summonerName}
//                 onChange={(e) => {
//                   setSummonerName(e.target.value);
//                   setLookupError('');
//                 }}
//                 placeholder="Enter your summoner name"
//                 className="w-full bg-[#151e33] border border-[#3f4c7d]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7b61ff] focus:border-transparent"
//                 required
//               />
//               {lookupError && <p className="text-red-400 text-xs mt-1">{lookupError}</p>}
//             </div>
//
//             <div>
//               <label className="block text-sm font-medium mb-2 text-gray-300">Region</label>
//               <select
//                 value={region}
//                 onChange={(e) => setRegion(e.target.value)}
//                 className="w-full bg-[#151e33] border border-[#3f4c7d]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#7b61ff] focus:border-transparent"
//               >
//                 {['NA', 'EUW', 'EUNE', 'KR', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU', 'JP'].map((reg) => (
//                   <option key={reg} value={reg}>{reg}</option>
//                 ))}
//               </select>
//             </div>
//
//             <button
//               type="submit"
//               disabled={isLookingUp || !summonerName.trim()}
//               className="w-full bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
//               {isLookingUp ? (
//                 <>
//                   <Loader2 className="animate-spin mr-2" size={20} />
//                   Looking up summoner...
//                 </>
//               ) : (
//                 'Find Summoner'
//               )}
//             </button>
//           </form>
//
//           <div className="mt-6 pt-6 border-t border-[#3f4c7d]/30 text-center text-xs text-gray-500">
//             <p>Data provided by Riot Games API • Not affiliated with Riot Games</p>
//           </div>
//         </div>
//       </div>
//     );
//   }
//
//   return (
//     <div className="flex h-screen bg-gradient-to-br from-[#0a0e17] to-[#1a1e2b] text-gray-300 font-inter overflow-hidden">
//       {/* Left Sidebar - Performance Stats - 10% wider than original */}
//       <div className={`${
//         showStats ? 'block' : 'hidden md:block'
//       } w-full md:w-[28rem] bg-[#0f1423]/95 backdrop-blur-sm border-r border-[#3f4c7d]/20 flex flex-col transition-all duration-300 ease-in-out`}>
//         {/* Header */}
//         <div className="p-5 border-b border-[#3f4c7d]/30">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="relative">
//                 <div className="w-20 h-20 rounded-full border-4 border-[#7b61ff] overflow-hidden">
//                   <img
//                     src={currentUser.profileIcon}
//                     alt="Profile"
//                     className="w-full h-full object-cover"
//                   />
//                 </div>
//                 <span className="absolute bottom-0 right-0 bg-[#2c3e75] text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-[#0a0e17]">
//                   {currentUser.level}
//                 </span>
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
//                   {currentUser.name}
//                 </h1>
//                 <div className={`mt-1 p-1 px-2 inline-block rounded-lg bg-gradient-to-r ${getRankGradient(currentUser.rank.tier)}`}>
//                   <span className="font-bold text-white text-sm">
//                     {currentUser.rank.tier} {currentUser.rank.division} • {currentUser.rank.lp} LP
//                   </span>
//                 </div>
//               </div>
//             </div>
//             <button
//               onClick={handleLogout}
//               className="p-1.5 text-gray-400 hover:text-[#ff5252] transition-colors rounded-lg hover:bg-[#2c3e75]"
//               title="Logout"
//             >
//               <LogOut size={20} />
//             </button>
//           </div>
//         </div>
//
//         {/* Stats Overview */}
//         <div className="p-5 border-b border-[#3f4c7d]/30">
//           <div className="flex justify-between mb-4">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-[#4d8cff]">{currentUser.rank.wins}</div>
//               <div className="text-xs text-gray-400">Wins</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold text-[#ff5252]">{currentUser.rank.losses}</div>
//               <div className="text-xs text-gray-400">Losses</div>
//             </div>
//             <div className="text-center">
//               <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ffcc00] to-[#ff9900]">
//                 {currentUser.rank.wins > 0 ? Math.round((currentUser.rank.wins / (currentUser.rank.wins + currentUser.rank.losses)) * 100) : 0}%
//               </div>
//               <div className="text-xs text-gray-400">Win Rate</div>
//             </div>
//           </div>
//
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <Trophy className="text-yellow-400" size={18} />
//               <span className="font-medium">Highest Rank: Diamond III</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <Shield className="text-blue-400" size={18} />
//               <span className="font-medium">Top Position: Mid (78%)</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <Swords className="text-red-400" size={18} />
//               <span className="font-medium">Average KDA: 3.8</span>
//             </div>
//           </div>
//         </div>
//
//         {/* Top Champions */}
//         <div className="p-5 border-b border-[#3f4c7d]/30">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="font-bold text-lg text-[#7b61ff] flex items-center">
//               <Star className="mr-2" size={18} /> Top Champions
//             </h2>
//             <span className="text-xs bg-[#2c3e75]/50 px-2 py-0.5 rounded">Last 20 Games</span>
//           </div>
//
//           <div className="grid grid-cols-3 gap-3">
//             {currentUser.topChampions.map((champ, index) => (
//               <div
//                 key={index}
//                 className="bg-[#151e33]/70 rounded-xl p-3 border border-[#3f4c7d]/30 hover:border-[#7b61ff] transition-all"
//               >
//                 <div className="w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-[#7b61ff]/50">
//                   <img
//                     src={champ.icon}
//                     alt={champ.name}
//                     className="w-full h-full object-cover"
//                   />
//                 </div>
//                 <p className="text-center font-medium mt-2 text-sm truncate">{champ.name}</p>
//                 <p className="text-center text-[#4dff91] font-bold text-xs mt-1">{champ.winrate}% WR</p>
//               </div>
//             ))}
//           </div>
//         </div>
//
//         {/* Recent Matches */}
//         <div className="flex-1 overflow-y-auto p-5">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="font-bold text-lg text-[#7b61ff] flex items-center">
//               <MessageCircle className="mr-2" size={18} /> Recent Matches
//             </h2>
//             <span className="text-xs bg-[#2c3e75]/50 px-2 py-0.5 rounded">Last 3 Games</span>
//           </div>
//
//           <div className="space-y-3">
//             {currentUser.recentMatches.map((match, index) => (
//               <div
//                 key={index}
//                 className={`p-3 rounded-xl ${
//                   match.result === 'Victory'
//                     ? 'bg-gradient-to-r from-[#1a3a2a] to-[#0f251a] border border-[#00c853]/30'
//                     : 'bg-gradient-to-r from-[#3a1a1a] to-[#250f0f] border border-[#ff5252]/30'
//                 }`}
//               >
//                 <div className="flex items-center justify-between mb-2">
//                   <div className="flex items-center space-x-3">
//                     <div className="w-8 h-8 rounded bg-[#1e293b] flex items-center justify-center">
//                       <span className="text-xs font-bold text-[#7b61ff]">#{index + 1}</span>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <div className="w-6 h-6 rounded overflow-hidden border border-[#7b61ff]/50">
//                         <img
//                           src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${match.champion}.png`}
//                           alt={match.champion}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
//                       <span className="font-medium">{match.champion}</span>
//                     </div>
//                   </div>
//                   <div className={`px-2 py-0.5 rounded text-xs font-bold ${
//                     match.result === 'Victory' ? 'bg-[#00c853]/20 text-[#00c853]' : 'bg-[#ff5252]/20 text-[#ff5252]'
//                   }`}>
//                     {match.result}
//                   </div>
//                 </div>
//
//                 <div className="grid grid-cols-3 gap-3 text-center text-xs mt-2">
//                   <div>
//                     <div className="font-bold text-[#4dff91]">{match.kda}</div>
//                     <div className="text-gray-400">KDA</div>
//                   </div>
//                   <div>
//                     <div className="font-bold text-[#7b61ff]">{match.cs}</div>
//                     <div className="text-gray-400">CS</div>
//                   </div>
//                   <div>
//                     <div className="font-bold text-[#ffcc00]">{match.vision}</div>
//                     <div className="text-gray-400">Vision</div>
//                   </div>
//                 </div>
//
//                 <div className="text-right text-xs text-gray-400 mt-2">{match.duration}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//
//       {/* Main Chat Area */}
//       <div className="flex-1 flex flex-col">
//         {/* Chat Header */}
//         <div className="p-4 border-b border-[#3f4c7d]/30 bg-[#0f1423]/95 backdrop-blur-sm">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between">
//             <div>
//               <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7b61ff] to-[#4d8cff]">
//                 Summoner's Rift
//               </h1>
//               <div className="flex items-center mt-1">
//                 {getStatusIndicator()}
//                 <span className={`text-sm ${
//                   connectionStatus === 'Connected' ? 'text-green-400' :
//                   connectionStatus === 'Connecting...' ? 'text-yellow-400' : 'text-red-400'
//                 }`}>
//                   {connectionStatus}
//                 </span>
//                 {isConnected && (
//                   <button
//                     onClick={() => {
//                       if (socket) socket.close();
//                       setIsConnected(false);
//                       updateConnectionStatus('Disconnected');
//                     }}
//                     className="ml-3 flex items-center text-xs text-red-400 hover:text-red-300 transition-colors"
//                   >
//                     <LogOut size={14} className="mr-1" /> Disconnect
//                   </button>
//                 )}
//               </div>
//             </div>
//             <div className="mt-3 md:mt-0 flex space-x-2">
//               <button
//                 onClick={() => setShowStats(!showStats)}
//                 className="px-3 py-1.5 bg-[#2c3e75] hover:bg-[#3a529a] transition-colors rounded-lg flex items-center text-sm"
//               >
//                 {showStats ? (
//                   <>
//                     <ChevronDown className="mr-1" size={16} /> Hide Stats
//                   </>
//                 ) : (
//                   <>
//                     <ChevronUp className="mr-1" size={16} /> Show Stats
//                   </>
//                 )}
//               </button>
//               <button className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#2d3d55] transition-colors rounded-lg flex items-center text-sm">
//                 <Search className="mr-1" size={16} /> Find Friends
//               </button>
//             </div>
//           </div>
//         </div>
//
//         {/* Messages Container */}
//         <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
//           {messages.map((message) => (
//             <div
//               key={message.id}
//               className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'} ${
//                 message.system ? 'justify-center' : ''
//               }`}
//             >
//               {!message.system && !message.isCurrentUser && (
//                 <div className="mr-3 mt-6">
//                   <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
//                     <img
//                       src={message.profileIcon || 'https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png'}
//                       alt={message.sender}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
//                 </div>
//               )}
//
//               <div
//                 className={`max-w-[70%] rounded-xl p-4 ${
//                   message.system
//                     ? 'bg-[#2c3e75]/30 border border-[#7b61ff]/30 text-center w-full'
//                     : message.isCurrentUser
//                       ? 'bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white rounded-br-none'
//                       : 'bg-[#151e33] border border-[#3f4c7d]/30 rounded-bl-none'
//                 }`}
//               >
//                 {!message.system && (
//                   <div className="flex items-center justify-between mb-1">
//                     <span className={`font-bold ${message.isCurrentUser ? 'text-white' : 'text-[#7b61ff]'}`}>
//                       {message.sender}
//                     </span>
//                     <span className={`text-xs ${
//                       message.isCurrentUser ? 'text-purple-100/80' : 'text-gray-400'
//                     }`}>
//                       {message.time}
//                     </span>
//                   </div>
//                 )}
//                 <p className={`break-words ${message.system ? 'text-[#7b61ff] italic' : ''}`}>
//                   {message.text}
//                   {isTyping && message.sender === 'RiotBot' && !message.system && message.id === messages[messages.length - 1].id && (
//                     <span className="animate-pulse">_</span>
//                   )}
//                 </p>
//               </div>
//
//               {message.isCurrentUser && !message.system && (
//                 <div className="ml-3 mt-6">
//                   <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
//                     <img
//                       src={message.profileIcon}
//                       alt={message.sender}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           ))}
//
//           {isTyping && (
//             <div className="flex justify-start">
//               <div className="mr-3 mt-6">
//                 <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#7b61ff]">
//                   <img
//                     src="https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/5.png"
//                     alt="RiotBot"
//                     className="w-full h-full object-cover"
//                   />
//                 </div>
//               </div>
//               <div className="bg-[#151e33] border border-[#3f4c7d]/30 rounded-xl p-4 rounded-bl-none max-w-[70%]">
//                 <div className="flex items-center space-x-1">
//                   <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse"></div>
//                   <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse delay-200"></div>
//                   <div className="w-2 h-2 bg-[#7b61ff] rounded-full animate-pulse delay-400"></div>
//                 </div>
//               </div>
//             </div>
//           )}
//
//           <div ref={messagesEndRef} />
//         </div>
//
//         {/* Message Input */}
//         <form onSubmit={handleSendMessage} className="p-4 border-t border-[#3f4c7d]/30 bg-[#0f1423]/95 backdrop-blur-sm">
//           <div className="flex items-center bg-[#151e33] rounded-xl border border-[#3f4c7d]/30 px-4 py-2">
//             <input
//               type="text"
//               value={inputMessage}
//               onChange={(e) => setInputMessage(e.target.value)}
//               onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
//               placeholder={isConnecting ? "Connecting to server..." : "Type a message... (try '/stats', '/help')"}
//               className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 px-2 py-1"
//               disabled={isConnecting || !isConnected}
//             />
//             <button
//               type="submit"
//               className={`p-1.5 ${isConnecting || !inputMessage.trim() || !isConnected ? 'text-gray-600 cursor-not-allowed' : 'text-[#7b61ff] hover:bg-[#2c3e75]'} rounded-lg transition-colors`}
//               disabled={isConnecting || !inputMessage.trim() || !isConnected}
//             >
//               <Send size={20} />
//             </button>
//           </div>
//           <div className="mt-2 flex justify-between text-xs text-gray-500">
//             <div>
//               {isConnected ? (
//                 <span className="text-green-400 flex items-center">
//                   <Wifi size={12} className="mr-1" /> Online
//                 </span>
//               ) : (
//                 <span className="text-red-400 flex items-center">
//                   <WifiOff size={12} className="mr-1" /> Offline
//                 </span>
//               )}
//             </div>
//             <span>Press Enter to send • Commands: /stats /hide /help</span>
//           </div>
//         </form>
//       </div>
//
//       {/* Mobile Stats Toggle Button */}
//       <div className="md:hidden fixed bottom-6 right-6 z-50">
//         <button
//           onClick={() => setShowStats(!showStats)}
//           className={`p-4 rounded-full shadow-lg transition-all ${
//             showStats
//               ? 'bg-[#151e33] text-[#7b61ff] animate-bounce'
//               : 'bg-gradient-to-r from-[#7b61ff] to-[#4d8cff] text-white'
//           }`}
//         >
//           {showStats ? <X size={24} /> : <Trophy size={24} />}
//         </button>
//       </div>
//     </div>
//   );
// };
//
// export default App;
