import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  LogOut, 
  Settings, 
  User as UserIcon, 
  Play, 
  Search, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

import { Input } from './components/Input';
import { Button } from './components/Button';
import { VideoPlayer } from './components/VideoPlayer';
import { User, ProfileType, Category, StreamItem } from './types';
import { INITIAL_USERS, DEFAULT_M3U_URL, APP_NAME } from './constants';
import { fetchPlaylist, parsePlaylistSubset } from './services/m3uService';

// --- Sub-components for cleaner structure ---

const AdminPanel = ({ 
  users, 
  setUsers, 
  onClose 
}: { 
  users: User[], 
  setUsers: (u: User[]) => void, 
  onClose: () => void 
}) => {
  const [newUser, setNewUser] = useState({ username: '', password: '', date: '' });

  const addUser = () => {
    if(!newUser.username || !newUser.password) return;
    const user: User = {
      id: crypto.randomUUID(),
      username: newUser.username,
      password: newUser.password,
      isAdmin: false,
      active: true,
      expirationDate: newUser.date || '2030-01-01'
    };
    setUsers([...users, user]);
    setNewUser({ username: '', password: '', date: '' });
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl text-cyan-400 font-bold neon-text">Admin Panel</h2>
        <Button onClick={onClose} variant="secondary">Exit Admin</Button>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 mb-8">
        <h3 className="text-xl mb-4 text-white">Add Subscriber</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Username" 
            value={newUser.username} 
            onChange={e => setNewUser({...newUser, username: e.target.value})} 
          />
          <Input 
            label="Password" 
            type="password"
            value={newUser.password} 
            onChange={e => setNewUser({...newUser, password: e.target.value})} 
          />
          <Input 
            label="Expiration" 
            type="date"
            value={newUser.date} 
            onChange={e => setNewUser({...newUser, date: e.target.value})} 
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={addUser}><Plus size={18} className="mr-2 inline" /> Create User</Button>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-cyan-400 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Username</th>
              <th className="p-4">Status</th>
              <th className="p-4">Expires</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50">
                <td className="p-4 font-medium">{u.username} {u.isAdmin && <span className="text-xs bg-cyan-900 text-cyan-200 px-2 py-0.5 rounded ml-2">ADMIN</span>}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">{u.expirationDate}</td>
                <td className="p-4 text-right">
                  {!u.isAdmin && (
                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfileCard = ({ 
  icon: Icon, 
  title, 
  desc, 
  onClick 
}: { 
  icon: React.ElementType, 
  title: string, 
  desc: string, 
  onClick: () => void 
}) => (
  <div 
    onClick={onClick}
    className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-400 rounded-xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col items-center justify-center gap-6"
  >
    <div className="p-6 rounded-full bg-slate-950 group-hover:bg-cyan-950/50 border border-slate-800 group-hover:border-cyan-400/50 transition-colors">
      <Icon size={48} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
    </div>
    <div className="text-center">
      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{title}</h3>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Content State
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);
  const [rawM3U, setRawM3U] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState(DEFAULT_M3U_URL);

  // Player State
  const [playingItem, setPlayingItem] = useState<StreamItem | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    
    if (user) {
      if (!user.active) {
        setLoginError('Subscription expired or inactive.');
        return;
      }
      setCurrentUser(user);
      setLoginError('');
      // If admin, go straight to admin profile/panel logic, handled in render
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProfile(null);
    setRawM3U(null);
    setCategories([]);
    setLoginUsername('');
    setLoginPassword('');
  };

  // 2. Fetch Playlist (Lazy fetch only when entering a profile if not already fetched)
  const loadContent = async (profile: ProfileType) => {
    if (!currentUser) return;

    setSelectedProfile(profile);
    setIsLoading(true);
    setFetchError(null);

    try {
      let content = rawM3U;
      
      // Fetch only if we haven't yet
      if (!content) {
        console.log("Fetching M3U from:", customUrl);
        content = await fetchPlaylist(customUrl);
        setRawM3U(content);
      }

      // Parse subset based on profile to avoid freezing
      console.log("Parsing for profile:", profile);
      // Use a small timeout to allow UI to show "Loading" before heavy parsing
      setTimeout(() => {
        if (content) {
            const parsed = parsePlaylistSubset(content, profile);
            setCategories(parsed);
        }
        setIsLoading(false);
      }, 100);

    } catch (err) {
      console.error(err);
      setFetchError("Failed to load playlist. Ensure the URL supports CORS or use a proxy.");
      setIsLoading(false);
    }
  };

  // AI Recommendation (Mocked integration logic for "World Class" requirement)
  const askAiRecommendation = async () => {
     // In a real app, this would send the visible category names to Gemini
     alert("Gemini AI: Based on your viewing habits, I recommend checking out the 'Action' category!");
  };

  // Render Views

  // VIEW: Login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full max-w-md p-8 bg-black/60 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] neon-box">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
              <span className="text-cyan-400 neon-text">WEXAIT</span> PASS
            </h1>
            <p className="text-slate-400">Premium OTT Experience</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Username" 
              placeholder="Enter username" 
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="Enter password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
            />
            
            {loginError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 text-sm p-3 rounded flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                {loginError}
              </div>
            )}

            <Button type="submit" className="w-full mt-4">ENTER</Button>
          </form>
        </div>
      </div>
    );
  }

  // VIEW: Admin Panel
  if (currentUser.isAdmin && selectedProfile === ProfileType.ADMIN) {
    return <AdminPanel users={users} setUsers={setUsers} onClose={() => setSelectedProfile(null)} />;
  }

  // VIEW: Profile Selection
  if (!selectedProfile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl w-full relative z-10">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Who is watching?</h2>
             <p className="text-slate-400">Select a profile to load specific content</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProfileCard 
              icon={Tv} 
              title="LIVE TV" 
              desc="News, Sports & Live Channels" 
              onClick={() => loadContent(ProfileType.LIVE_TV)}
            />
            <ProfileCard 
              icon={Film} 
              title="MOVIES" 
              desc="Blockbusters & Cinema Classics" 
              onClick={() => loadContent(ProfileType.MOVIES)}
            />
            <ProfileCard 
              icon={Clapperboard} 
              title="SERIES" 
              desc="Binge-worthy TV Shows" 
              onClick={() => loadContent(ProfileType.SERIES)}
            />
          </div>

          <div className="mt-16 flex justify-center gap-4">
            {currentUser.isAdmin && (
              <Button variant="secondary" onClick={() => setSelectedProfile(ProfileType.ADMIN)}>
                <Settings size={18} className="mr-2 inline" /> Admin Panel
              </Button>
            )}
            <Button variant="danger" onClick={handleLogout}>
              <LogOut size={18} className="mr-2 inline" /> Logout
            </Button>
          </div>

           {/* Settings Toggler for URL (Hidden functionality for demo power users) */}
           <div className="mt-12 mx-auto max-w-lg border-t border-slate-900 pt-6">
              <details className="text-slate-600 text-xs cursor-pointer">
                <summary>Connection Settings</summary>
                <div className="mt-4">
                  <Input 
                    label="M3U URL" 
                    value={customUrl} 
                    onChange={e => setCustomUrl(e.target.value)} 
                    className="text-xs"
                  />
                  <p className="mt-2 text-yellow-600">
                    Note: Direct HTTP URLs may be blocked by browsers due to Mixed Content or CORS. 
                    Use a proxy or enable insecure content for the demo.
                  </p>
                </div>
              </details>
           </div>
        </div>
      </div>
    );
  }

  // VIEW: Content Dashboard
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 bg-black/90 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black text-cyan-400 tracking-tighter cursor-pointer" onClick={() => setSelectedProfile(null)}>
            WEXAIT
          </h1>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
            <span className={selectedProfile === ProfileType.LIVE_TV ? "text-white" : "hover:text-white cursor-pointer"} onClick={() => loadContent(ProfileType.LIVE_TV)}>Live TV</span>
            <span className={selectedProfile === ProfileType.MOVIES ? "text-white" : "hover:text-white cursor-pointer"} onClick={() => loadContent(ProfileType.MOVIES)}>Movies</span>
            <span className={selectedProfile === ProfileType.SERIES ? "text-white" : "hover:text-white cursor-pointer"} onClick={() => loadContent(ProfileType.SERIES)}>Series</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search titles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:border-cyan-400 outline-none" 
            />
          </div>
          <div className="w-8 h-8 rounded bg-cyan-900 text-cyan-400 flex items-center justify-center font-bold">
            {currentUser.username[0].toUpperCase()}
          </div>
          <button onClick={() => setSelectedProfile(null)} className="text-slate-400 hover:text-white">
            <UserIcon size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="pt-24 px-6 md:px-12">
        
        {/* Error Handling */}
        {fetchError && (
          <div className="my-8 p-6 bg-red-950/30 border border-red-500/50 rounded-lg flex flex-col items-center justify-center text-center">
            <AlertTriangle className="text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
            <p className="text-slate-400 max-w-2xl mb-6">{fetchError}</p>
            <div className="flex gap-4">
                <Button onClick={() => loadContent(selectedProfile!)} variant="primary">
                  <RefreshCw className="mr-2 inline" size={18} /> Retry
                </Button>
                <Button onClick={() => setSelectedProfile(null)} variant="secondary">
                   Go Back
                </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-cyan-400 animate-pulse font-mono">LOADING CONTENT...</p>
          </div>
        )}

        {/* Content Rows */}
        {!isLoading && !fetchError && categories.length > 0 && (
          <div className="space-y-12 animate-fade-in">
             {/* Hero / AI Suggestion Area (Mock) */}
             <div className="relative h-[40vh] md:h-[50vh] rounded-2xl overflow-hidden mb-12 group border border-slate-900">
                <img 
                  src={`https://picsum.photos/1200/600?random=${selectedProfile}`} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt="Featured"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3">
                  <span className="text-cyan-400 font-bold tracking-widest text-xs uppercase mb-2 block neon-text">
                    Featured in {selectedProfile}
                  </span>
                  <h2 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
                    {categories[0]?.items[0]?.name || "Featured Title"}
                  </h2>
                  <p className="text-slate-300 text-sm md:text-lg mb-8 line-clamp-2">
                    Experience the best in entertainment. Stream high-quality content directly to your device. 
                    Powered by Wexait Pass technology.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => categories[0]?.items[0] && setPlayingItem(categories[0].items[0])}>
                      <Play className="fill-current mr-2 inline" size={18} /> Play Now
                    </Button>
                    <Button variant="secondary" onClick={askAiRecommendation}>
                       ✨ AI Suggestion
                    </Button>
                  </div>
                </div>
             </div>

            {/* Categories */}
            {categories.map((cat, idx) => {
              // Filter items based on search
              const filteredItems = searchQuery 
                ? cat.items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                : cat.items;

              if (filteredItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></span>
                    {cat.name}
                  </h3>
                  
                  <div className="relative">
                    <div className="flex overflow-x-auto gap-4 pb-4 px-1 snap-x no-scrollbar" style={{scrollbarWidth: 'none'}}>
                      {filteredItems.slice(0, 50).map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => setPlayingItem(item)}
                          className="flex-none w-[160px] md:w-[220px] bg-slate-900 rounded-lg overflow-hidden cursor-pointer relative group transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg snap-start border border-transparent hover:border-cyan-400/50"
                        >
                          <div className="aspect-video bg-slate-800 relative">
                             {item.logo ? (
                               <img src={item.logo} alt={item.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.src = `https://picsum.photos/300/170?random=${item.id}`)} />
                             ) : (
                               <img src={`https://picsum.photos/300/170?random=${item.id}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                             )}
                             <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                               <div className="w-12 h-12 rounded-full bg-cyan-400/90 flex items-center justify-center shadow-[0_0_20px_#22d3ee]">
                                 <Play className="fill-black text-black ml-1" size={24} />
                               </div>
                             </div>
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 truncate transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">{item.group}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State / No Results */}
        {!isLoading && !fetchError && categories.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p>No content found for this profile.</p>
          </div>
        )}
      </div>

      {/* Video Overlay */}
      {playingItem && (
        <VideoPlayer 
          url={playingItem.url} 
          title={playingItem.name} 
          onClose={() => setPlayingItem(null)} 
        />
      )}
    </div>
  );
}