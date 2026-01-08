import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Layout, Search, Filter, Plus, Trash2, LogOut, User, Crown, Store, Tag,
  Image as ImageIcon, CheckCircle, Loader2, Menu, X, ArrowRight, ShieldCheck,
  Upload, FileText, Heart, QrCode, Phone, MessageCircle, FolderHeart, Box,
  FileImage, DownloadCloud, Pencil, Gavel, ClipboardList, TrendingDown, Send,
  Paperclip, FileDigit, Camera, ScanLine, Eye, EyeOff, Building2, BadgeCheck, Trophy,
  FileUp, Home, Grid, AlertCircle, Ruler, Settings, ChevronRight, ChevronDown,
  FolderTree, List, Users, CreditCard, Wallet, RefreshCw, ImagePlus, Lock
} from 'lucide-react';

// --- 初始数据常量 (用于重置) ---
// Note: In a real app, these might be fetched from a 'constants' collection or config
const INITIAL_CATEGORIES = [
  {
    id: 'hard_main', name: '硬装主材', children: [
      { id: 'mech', name: '机电设备类', children: [{ id: 'mech_air', name: '全空气系统' }, { id: 'mech_hvac', name: '空调新风锅炉地暖' }, { id: 'mech_pipe', name: '管道给排水' }, { id: 'mech_pool', name: '泳池设备' }, { id: 'mech_elevator', name: '电梯' }] },
      { id: 'tile_stone', name: '瓷砖石材类', children: [{ id: 'tile_domestic', name: '国产瓷砖' }, { id: 'tile_import', name: '进口瓷砖' }, { id: 'tile_slab', name: '岩板' }, { id: 'tile_mosaic', name: '马赛克' }, { id: 'stone_mat', name: '石材' }] },
      { id: 'floor', name: '地板类', children: [{ id: 'floor_common', name: '地板' }] },
      { id: 'bath', name: '卫浴类', children: [{ id: 'bath_import', name: '进口卫浴' }, { id: 'bath_domestic', name: '国产卫浴' }, { id: 'bath_shower', name: '淋浴房' }, { id: 'bath_cabinet', name: '浴室柜' }] },
      { id: 'wood', name: '木作类', children: [{ id: 'wood_whole', name: '整木' }, { id: 'wood_door', name: '室内门' }] },
      { id: 'cabinet', name: '橱柜类', children: [{ id: 'cab_cupboard', name: '橱柜' }, { id: 'cab_sink', name: '水槽' }] },
      { id: 'win_door', name: '门窗类', children: [{ id: 'win_common', name: '门窗' }, { id: 'win_sun', name: '户外遮阳系统' }, { id: 'win_garage', name: '车库门' }, { id: 'win_entry', name: '入户门' }] },
      { id: 'custom', name: '装饰定制类', children: [{ id: 'cust_copper', name: '铜艺定制' }, { id: 'cust_steel', name: '不锈钢定制' }, { id: 'cust_tatami', name: '榻榻米' }] },
      { id: 'special', name: '特殊空间', children: [{ id: 'spec_stair', name: '楼梯' }, { id: 'spec_garden', name: '园林' }, { id: 'spec_fire', name: '壁炉' }, { id: 'spec_wine', name: '酒窖' }, { id: 'spec_smart', name: '智能影音/安防' }] }
    ]
  },
  {
    id: 'hard_aux', name: '硬装辅材', children: [
      { id: 'aux_base', name: '基础辅材', children: [{ id: 'aux_paint', name: '涂料' }, { id: 'aux_gypsum', name: '国产石膏线' }, { id: 'aux_damp', name: '防潮防结露系统' }, { id: 'aux_seam', name: '美缝剂' }] },
      { id: 'hw_elec', name: '五金电气', children: [{ id: 'hw_metal', name: '五金' }, { id: 'hw_switch', name: '开关面板' }] },
      { id: 'env', name: '环保治理', children: [{ id: 'env_form', name: '除甲醛' }, { id: 'env_clean', name: '保洁' }] }
    ]
  },
  {
    id: 'soft', name: '软装陈设', children: [
      { id: 'soft_furn', name: '家具类', children: [{ id: 'sf_custom', name: '定制家具' }, { id: 'sf_mobile', name: '活动家具' }, { id: 'sf_mattress', name: '床垫' }] },
      { id: 'appliance', name: '电器类', children: [{ id: 'app_kitchen', name: '厨电' }] },
      { id: 'fitness', name: '健身器材', children: [{ id: 'fit_equip', name: '健身器材' }] },
      { id: 'fabric', name: '布艺软装', children: [{ id: 'fab_whole', name: '整体软装' }, { id: 'fab_carpet', name: '地毯地垫' }, { id: 'fab_wall', name: '壁纸布艺' }] },
      { id: 'light', name: '灯饰类', children: [{ id: 'light_comm', name: '灯饰商照' }] }
    ]
  }
];
const INITIAL_UNITS = ['件', '套', '个', '米', 'm²', '卷', '包', '箱', 'kg', 'L'];

// --- Firebase Init ---
import { auth, db, storage } from './firebase';

const appId = 'design-app-v1';

// --- Contexts ---
const AuthContext = createContext(null);
const DataContext = createContext(null);

// --- Helper Components ---
// --- Helper Components ---
// Basic image compression
const compressImage = (file, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Ensure strictly under 1MB (approx)
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function FileUploader({ onUpload, accept = '*', className = '', children }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("文件过大 (超过10MB)");
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        // Attempt 1: Firebase Storage
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytes(storageRef, file);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timed out")), 15000));

        await Promise.race([uploadTask, timeoutPromise]);
        const downloadURL = await getDownloadURL(storageRef);
        onUpload(downloadURL, file.name);

      } catch (error) {
        console.warn("Storage upload failed, trying fallback...", error);

        // Attempt 2: Client-side Compression -> Base64 (Firestore)
        try {
          setUploadError("网络慢，尝试压缩模式...");

          let validBase64 = null;

          if (file.type.startsWith('image/')) {
            // Images: Compress
            const compressed = await compressImage(file);
            if (compressed.length < 950 * 1024) validBase64 = compressed;
          } else {
            // Documents: Try raw base64 if small (< 1MB)
            if (file.size < 950 * 1024) {
              validBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
            }
          }

          if (validBase64) {
            onUpload(validBase64, file.name);
            setUploadError(null);
          } else {
            throw new Error("文件过大且网络不畅，无法保存");
          }
        } catch (backupError) {
          console.error("Fallback failed:", backupError);
          let msg = "上传失败";
          if (error.message.includes('time')) msg = "网络超时，且文件过大无法离线保存 (V4)";
          else msg = "上传失败 (V4): " + backupError.message;
          setUploadError(msg);
          alert(msg);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div onClick={handleClick} className={`relative flex items-center cursor-pointer ${className}`}>
      <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleFileChange} />
      {children ? (
        children
      ) : (
        <div className="flex flex-col items-center">
          <button
            type="button"
            disabled={isUploading}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 ${uploadError ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-[#0058a3] hover:bg-blue-50'}`}
            title="上传本地文件"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          </button>
          {uploadError && <span className="text-[10px] text-red-500 absolute -bottom-4 whitespace-nowrap">{uploadError.includes('压缩') ? '已转离线模式' : '上传失败'}</span>}
        </div>
      )}
    </div>
  );
}

function SimpleModal({ title, children, onClose, onConfirm, confirmText = '确定', isDestructive = false, disableConfirm = false }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <h3 className="text-lg font-bold text-[#111] mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">取消</button>
          <button
            onClick={onConfirm}
            disabled={disableConfirm}
            className={`flex-1 py-2 rounded-lg text-sm font-bold text-white ${disableConfirm ? 'bg-gray-300 cursor-not-allowed' : (isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0058a3] hover:bg-[#004f93]')
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Components ---
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const lastUser = localStorage.getItem('last_user_role');
    if (lastUser) {
      const { role, profile } = JSON.parse(lastUser);
      loginAs(role, profile);
    }
    setLoading(false);
  }, []);

  const loginAs = (newRole, profileData = null) => {
    setRole(newRole);
    if (profileData) setUserProfile(profileData);
    const mockUser = { uid: profileData?.phone || 'mock-uid', ...profileData };
    setUser(mockUser);

    localStorage.setItem('last_user_role', JSON.stringify({ role: newRole, profile: profileData }));
    setShowAuthModal(false);
  };

  const logout = () => {
    setRole('guest');
    setUserProfile(null);
    setUser(null);
    localStorage.removeItem('last_user_role');
  };

  // ✅ VIP升级持久化：更新 user_accounts + localStorage
  const upgradeRole = async (newRole) => {
    if (!userProfile?.phone) return;
    const phone = userProfile.phone;

    // REAL FIREBASE UPDATE
    // Try to find the user document by phone
    try {
      const q = query(collection(db, 'user_accounts'), where('phone', '==', phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await updateDoc(docRef, { role: newRole });
      } else {
        // Check if it's the current user by ID directly?
        // If phone is used as ID, try that
        // But we don't know the schema for sure. 
        // Fallback: don't error out if not found, just update local.
      }
    } catch (e) {
      console.error("Error updating role in DB:", e);
    }

    const updatedProfile = { ...userProfile, role: newRole };
    setRole(newRole);
    setUserProfile(updatedProfile);
    setUser({ uid: phone, ...updatedProfile });

    localStorage.setItem('last_user_role', JSON.stringify({ role: newRole, profile: updatedProfile }));
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-[#0058a3] w-8 h-8" /></div>;

  return (
    <AuthContext.Provider value={{ user, role, userProfile, loginAs, logout, upgradeRole, showAuthModal, setShowAuthModal }}>
      <DataProvider>
        <MainLayout />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={loginAs} />}
      </DataProvider>
    </AuthContext.Provider>
  );
}

function DataProvider({ children }) {
  const { user, userProfile } = useContext(AuthContext);
  const userId = userProfile?.phone || user?.uid;

  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]); // Array of objects
  const [favoriteGroups, setFavoriteGroups] = useState([]); // Array of groups
  const [requests, setRequests] = useState([]);
  const [bids, setBids] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // All users for lookup
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [sourcingPosts, setSourcingPosts] = useState([]);
  const [sourcingComments, setSourcingComments] = useState([]);

  // --- 加载 Settings ---
  useEffect(() => {
    const unsubCat = onSnapshot(doc(db, 'settings', 'categories'), (docSnap) => {
      if (docSnap.exists()) setCategories(docSnap.data().tree);
      else setCategories(INITIAL_CATEGORIES);
    });
    const unsubUnit = onSnapshot(doc(db, 'settings', 'units'), (docSnap) => {
      if (docSnap.exists()) setUnits(docSnap.data().list);
      else setUnits(INITIAL_UNITS);
    });
    return () => { unsubCat(); unsubUnit(); };
  }, []);

  // --- 加载业务数据 ---
  useEffect(() => {
    setLoadingProducts(true);
    const unsubProd = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingProducts(false);
    });
    const unsubReq = onSnapshot(collection(db, 'requests'), (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubBids = onSnapshot(collection(db, 'bids'), (snap) => {
      setBids(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'user_accounts'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const favQuery = userId ? query(collection(db, 'favorites'), where('userId', '==', userId)) : null;
    const unsubFav = favQuery ? onSnapshot(favQuery, (snap) => {
      setFavorites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }) : () => setFavorites([]);

    const groupQuery = userId ? query(collection(db, 'favorite_groups'), where('userId', '==', userId)) : null;
    const unsubGroups = groupQuery ? onSnapshot(groupQuery, (snap) => {
      setFavoriteGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }) : () => setFavoriteGroups([]);

    // Sourcing Module Listeners
    const unsubPosts = onSnapshot(collection(db, 'sourcing_posts'), (snap) => {
      setSourcingPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubComments = onSnapshot(collection(db, 'sourcing_comments'), (snap) => {
      setSourcingComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProd(); unsubReq(); unsubBids(); unsubFav(); unsubGroups(); unsubUsers(); unsubPosts(); unsubComments(); };
  }, [user, userId]);

  // --- Actions ---
  const addProduct = async (data) => userId && await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp(), supplier_id: userId });
  const updateProduct = async (id, data) => user && await updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
  const removeProduct = async (id) => user && await deleteDoc(doc(db, 'products', id));

  const toggleFavorite = async (p) => {
    if (!userId) return;
    const existing = favorites.find(f => f.productId === p.id);
    if (existing) await deleteDoc(doc(db, 'favorites', existing.id));
    else await addDoc(collection(db, 'favorites'), { userId, productId: p.id, groupId: 'default', createdAt: serverTimestamp() });
  };

  const createFavoriteGroup = async (name) => userId && await addDoc(collection(db, 'favorite_groups'), { userId, name, createdAt: serverTimestamp() });
  const moveFavoriteToGroup = async (favId, groupId) => await updateDoc(doc(db, 'favorites', favId), { groupId });

  const createRequest = async (data) => userId && await addDoc(collection(db, 'requests'), { ...data, designer_id: userId, status: 'open', createdAt: serverTimestamp() });
  const updateRequest = async (id, data) => userId && await updateDoc(doc(db, 'requests', id), { ...data });
  const submitBid = async (data) => userId && await addDoc(collection(db, 'bids'), { ...data, supplier_id: userId, createdAt: serverTimestamp() });

  const createSourcingPost = async (data) => userId && await addDoc(collection(db, 'sourcing_posts'), { ...data, designer_id: userId, createdAt: serverTimestamp() });
  const addSourcingComment = async (data) => userId && await addDoc(collection(db, 'sourcing_comments'), { ...data, author_id: userId, createdAt: serverTimestamp() });
  const deleteSourcingComment = async (id) => userId && await deleteDoc(doc(db, 'sourcing_comments', id));

  const saveCategories = async (tree) => await setDoc(doc(db, 'settings', 'categories'), { tree });
  const saveUnits = async (list) => await setDoc(doc(db, 'settings', 'units'), { list });

  const searchByImage = () => new Promise(resolve => setTimeout(() => {
    resolve([...products].sort(() => 0.5 - Math.random()).slice(0, 2));
  }, 2000));

  const seedData = async (type) => {
    if (!userId) return;
    if (type === 'products') {
      await addProduct({ title: '意大利进口卡拉拉白大理石', category: '石材', price_market: 1200, price_member: 680, unit: 'm²', image: 'https://images.unsplash.com/photo-1594241075677-4581451a5c60?auto=format&fit=crop&q=80&w=800', supplier_name: '米兰石业', texture_url: 'mock_url' });
      await addProduct({ title: '北欧极简布艺沙发', category: '布艺沙发', price_market: 4500, price_member: 3200, unit: '件', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800', supplier_name: '宜家代工' });
    }
    if (type === 'requests') {
      await createRequest({ title: '海淀别墅石材采购', category: '石材', quantity: '500', unit: 'm²', budget: '200000', description: '需要鱼肚白大理石', attachment_url: 'mock.pdf' });
    }
  };

  return (
    <DataContext.Provider value={{
      products, favorites, favoriteGroups, requests, bids, loadingProducts,
      categories, units, sourcingPosts, sourcingComments,
      addProduct, updateProduct, removeProduct,
      toggleFavorite, createFavoriteGroup, moveFavoriteToGroup,
      createRequest, updateRequest, submitBid,
      createSourcingPost, addSourcingComment, deleteSourcingComment,
      searchByImage, saveCategories, saveUnits,
      seedData,
      getSupplier: (id) => allUsers.find(u => u.phone === id || u.id === id)
    }}>
      {children}
    </DataContext.Provider>
  );
}

function MainLayout() {
  const { role, logout, setShowAuthModal } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (role === 'admin') setCurrentView('admin_dashboard');
    else if (role === 'supplier') {
      if (currentView === 'home' || currentView === 'market') setCurrentView('dashboard');
    }
    else if (role.startsWith('designer') && currentView === 'home') setCurrentView('market');
  }, [role]); // eslint-disable-line

  const NavItem = ({ view, label, icon }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`px-4 py-2 text-sm font-bold flex items-center transition-colors ${currentView === view ? 'text-[#0058a3] border-b-2 border-[#0058a3]' : 'text-gray-600 hover:text-[#0058a3]'}`}
    >
      {icon && <span className="mr-2">{icon}</span>}{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-[#111]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer flex-shrink-0" onClick={() => setCurrentView('home')}>
              <img
                src="WechatIMG87.jpg"
                alt="Logo"
                className="h-8 w-auto object-contain mr-3"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement.querySelector('.fallback-logo');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="fallback-logo hidden items-center"><span className="text-xl font-black tracking-tighter text-[#0058a3]">GONGHESHE</span></div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-2">
              {role === 'admin' ? (
                <NavItem view="admin_dashboard" label="系统维护" icon={<Settings className="w-4 h-4" />} />
              ) : (
                <>
                  {role !== 'supplier' && <NavItem view="market" label="选材大厅" />}
                  <NavItem view="sourcing_hall" label="寻品大厅" />
                  {role.startsWith('designer') && (
                    <>
                      <NavItem view="collection" label="选材库" />
                      <NavItem view="rfp_market" label="招标项目" />
                    </>
                  )}
                  {role === 'supplier' && (
                    <>
                      <NavItem view="rfp_market" label="投标机会" />
                      <NavItem view="dashboard" label="商家后台" />
                    </>
                  )}
                </>
              )}

              <div className="h-6 w-px bg-gray-300 mx-4"></div>

              {role === 'guest' ? (
                <div className="flex space-x-3">
                  <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-[#111] hover:text-[#0058a3]">登录</button>
                  <button onClick={() => setShowAuthModal(true)} className="px-5 py-2 text-sm font-bold bg-[#0058a3] text-white rounded-full hover:bg-[#004f93]">注册</button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end mr-2">
                    <span className="text-xs font-bold text-[#111]">
                      {role === 'admin' ? '管理员' : role.includes('designer') ? '设计师' : '品牌商'}
                    </span>
                    {role === 'designer_vip' && <span className="text-[10px] text-[#ffdb00] bg-[#0058a3] px-1 rounded">PLUS</span>}
                  </div>
                  <button onClick={logout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><LogOut className="w-5 h-5" /></button>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#111] hover:bg-gray-100 rounded-full">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Mobile menu with频道选择 */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 absolute w-full left-0 z-50 shadow-xl">
            <div className="flex flex-col p-3 space-y-2">

              {role !== 'guest' && (
                <div className="px-2 py-2">
                  <div className="text-xs font-bold text-gray-400 mb-2">频道</div>

                  {role === 'admin' ? (
                    <button
                      onClick={() => { setCurrentView('admin_dashboard'); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center ${currentView === 'admin_dashboard' ? 'bg-[#0058a3] text-white' : 'bg-gray-50 text-gray-700'
                        }`}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      系统维护
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {role.startsWith('designer') && (
                        <>
                          <button
                            onClick={() => { setCurrentView('market'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'market' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            选材大厅
                          </button>
                          <button
                            onClick={() => { setCurrentView('sourcing_hall'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'sourcing_hall' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            寻品大厅
                          </button>
                          <button
                            onClick={() => { setCurrentView('collection'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'collection' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            选材库
                          </button>
                          <button
                            onClick={() => { setCurrentView('rfp_market'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'rfp_market' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            招标项目
                          </button>
                        </>
                      )}

                      {role === 'supplier' && (
                        <>
                          <button
                            onClick={() => { setCurrentView('sourcing_hall'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'sourcing_hall' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            寻品大厅
                          </button>
                          <button
                            onClick={() => { setCurrentView('rfp_market'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'rfp_market' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            投标机会
                          </button>
                          <button
                            onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'dashboard' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            商家后台
                          </button>
                        </>
                      )}

                      {role !== 'supplier' && !role.startsWith('designer') && (
                        <>
                          <button
                            onClick={() => { setCurrentView('market'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'market' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            选材大厅
                          </button>
                          <button
                            onClick={() => { setCurrentView('sourcing_hall'); setIsMobileMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold ${currentView === 'sourcing_hall' ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-700'
                              }`}
                          >
                            寻品大厅
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-gray-200 my-2" />

              {role === 'guest' ? (
                <button
                  onClick={() => { setShowAuthModal(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-center py-3 font-bold bg-[#0058a3] text-white rounded-xl"
                >
                  登录/注册
                </button>
              ) : (
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full text-center py-3 font-bold bg-gray-100 text-gray-700 rounded-xl"
                >
                  退出登录
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'home' && <HomeView onExplore={() => role === 'guest' ? setShowAuthModal(true) : setCurrentView('market')} />}
        {currentView === 'market' && role !== 'supplier' && <MarketView />}
        {currentView === 'sourcing_hall' && <SourcingView />}
        {currentView === 'collection' && <MarketView showFavoritesOnly={true} />}
        {currentView === 'rfp_market' && <RFPManager role={role} />}
        {currentView === 'dashboard' && role === 'supplier' && <SupplierDashboard />}
        {currentView === 'admin_dashboard' && role === 'admin' && <AdminDashboard />}
      </main>

      <footer className="bg-[#f5f5f5] mt-auto py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-[#111]">&copy; 2024 共合设设计师选品平台</p>
        </div>
      </footer>
    </div>
  );
}

// --- Views & Modals ---
function HomeView({ onExplore }) {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl md:text-7xl font-black text-[#111] mb-6">设计自由<br />思想独立</h1>
      <button onClick={onExplore} className="px-10 py-4 bg-[#0058a3] text-white font-bold rounded-full shadow-lg hover:bg-[#004f93] transition-colors">立即探索</button>
    </div>
  );
}

function VipUpgradeModal({ onClose, onUpgrade }) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
      setTimeout(() => {
        onUpgrade('designer_vip');
        onClose();
      }, 1200);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>

        {step === 1 && (
          <>
            <div className="text-center mb-8 mt-4">
              <div className="w-20 h-20 bg-[#ffdb00] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0058a3] shadow-lg"><Crown className="w-10 h-10" /></div>
              <h2 className="text-3xl font-black text-[#111]">升级共合设会员</h2>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-sm font-bold text-gray-700"><CheckCircle className="w-5 h-5 text-[#0058a3] mr-3" /> 查看工厂出厂底价，立省30%</li>
              <li className="flex items-center text-sm font-bold text-gray-700"><CheckCircle className="w-5 h-5 text-[#0058a3] mr-3" /> 无限下载 4K 高清贴图/模型</li>
              <li className="flex items-center text-sm font-bold text-gray-700"><CheckCircle className="w-5 h-5 text-[#0058a3] mr-3" /> 专属选材顾问一对一服务</li>
            </ul>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-center">
              <p className="text-xs text-gray-500 mb-1">年度会员特惠</p>
              <p className="text-2xl font-black text-[#111]">¥365 <span className="text-sm font-normal text-gray-500">/ 年</span></p>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] transition-colors">立即开通</button>
          </>
        )}

        {step === 2 && (
          <div className="text-center py-4">
            <h3 className="text-xl font-bold mb-6">扫码支付</h3>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-48 h-48 mx-auto mb-6 flex items-center justify-center relative">
              <QrCode className="w-40 h-40 text-[#111]" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"><Crown className="w-20 h-20" /></div>
            </div>
            <p className="text-sm font-bold text-gray-500 mb-8">请使用微信或支付宝扫码支付 <br /> <span className="text-[#111] text-lg">¥365.00</span></p>

            <button onClick={handlePay} disabled={isProcessing} className="w-full py-4 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] transition-colors flex items-center justify-center">
              {isProcessing ? <><Loader2 className="animate-spin w-5 h-5 mr-2" /> 支付确认中...</> : '我已完成支付'}
            </button>
            <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">返回上一步</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-in zoom-in">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-[#111] mb-2">开通成功！</h3>
            <p className="text-gray-500">已为你保存会员身份，下次登录默认 VIP。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactModal({ product, onClose }) {
  const { getSupplier } = useContext(DataContext);
  if (!product) return null;

  const supplier = getSupplier(product.supplier_id);
  // Fallback to product fields if supplier user not found or fields missing (backward compatibility)
  const wechatId = supplier?.wechatId || product.supplier_id || 'wx_id_888';
  const qrCode = supplier?.qrCode; // If no QR, show QrCode icon
  const phone = supplier?.phone || '138-xxxx-xxxx';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-10"><X className="w-5 h-5" /></button>
        <div className="bg-[#111] p-8 text-center text-white">
          <h3 className="font-bold text-xl mb-1">联系商家</h3>
          <p className="text-white/60 text-sm">{product.supplier_name}</p>
        </div>
        <div className="p-8 flex flex-col items-center">
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-4">
            {qrCode ? (
              <img src={qrCode} className="w-40 h-40 object-cover" />
            ) : (
              <QrCode className="w-40 h-40 text-[#111]" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-500 mb-6">微信扫一扫 · 直接沟通</p>

          <div className="w-full space-y-3">
            <button className="w-full py-3 bg-[#f5f5f5] hover:bg-[#eee] rounded-full font-bold text-sm text-[#111] flex items-center justify-center">
              <Phone className="w-4 h-4 mr-2" /> 拨打电话: {phone}
            </button>
            <button className="w-full py-3 bg-[#f5f5f5] hover:bg-[#eee] rounded-full font-bold text-sm text-[#111] flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2" /> 复制微信号: {wechatId}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ product, onClose, onContact, isFavorite, onToggleFavorite }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white md:text-black"><X className="w-5 h-5" /></button>

        <div className="w-full md:w-1/2 bg-gray-100 relative group">
          <img src={product.image} className="w-full h-full object-cover" />
          <div className="absolute bottom-4 right-4 flex gap-2">
            {product.texture_url && <button className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs font-bold shadow-sm">高清材质</button>}
            {product.model_url && <button className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs font-bold shadow-sm">3D模型</button>}
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 overflow-y-auto">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-[#0058a3] bg-blue-50 px-2 py-1 rounded">{product.category}</span>
              <button onClick={() => onToggleFavorite(product)} className="text-gray-400 hover:text-red-500">
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
            <h2 className="text-3xl font-black text-[#111] mb-2">{product.title}</h2>
            <div className="flex items-center text-sm font-bold text-gray-500">
              <Store className="w-4 h-4 mr-2" /> {product.supplier_name}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">会员底价</p>
                <p className="text-3xl font-black text-[#d00]">¥{product.price_member}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">市场价</p>
                <p className="text-lg font-bold text-gray-900 line-through">¥{product.price_market}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 text-xs block">单位</span>
                <span className="font-bold">{product.unit || 'm²'}</span>
              </div>
              {/* Extended fields placeholders */}
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 text-xs block">材质</span>
                <span className="font-bold">{product.material || '未标注'}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 text-xs block">产地</span>
                <span className="font-bold">{product.origin || '未标注'}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 text-xs block">规格</span>
                <span className="font-bold">{product.specs || '常规'}</span>
              </div>
            </div>
          </div>

          <button onClick={() => onContact(product)} className="w-full py-4 bg-[#111] text-white rounded-full font-bold hover:bg-gray-800 flex items-center justify-center mb-4">
            <QrCode className="w-5 h-5 mr-2" /> 联系商家
          </button>

          {product.description && (
            <div>
              <h4 className="font-bold text-[#111] mb-2">产品描述</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageSearchModal({ onClose, onSearch }) {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setIsAnalyzing(true);
      onSearch(f).then(res => { setResults(res); setIsAnalyzing(false); });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden">
        <div className="w-1/3 bg-gray-900 p-6 flex flex-col border-r border-gray-800 relative">
          <button onClick={onClose} className="absolute top-6 left-6 text-white hover:text-gray-300"><X className="w-6 h-6" /></button>
          <h3 className="text-white font-black text-2xl mt-12 mb-2">图找产品</h3>
          <div
            className={`flex-1 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-[#0058a3] hover:bg-blue-900/20 transition-all relative overflow-hidden group ${file ? 'bg-black' : ''}`}
            onClick={() => fileInputRef.current.click()}
          >
            {file ? (
              <>
                <img src={URL.createObjectURL(file)} className="w-full h-full object-contain opacity-50 p-4" />
                {isAnalyzing && <div className="absolute inset-0 bg-transparent flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#0058a3] animate-spin" /></div>}
              </>
            ) : (
              <div className="text-center p-4">
                <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-bold text-sm">点击上传图片</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div className="w-2/3 bg-white p-8 overflow-y-auto">
          {isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#0058a3]" />
              <p className="font-bold">正在全库搜索...</p>
            </div>
          ) : results ? (
            <div>
              <h4 className="font-bold text-[#111] text-xl mb-6 flex items-center"><ScanLine className="w-6 h-6 mr-2 text-[#0058a3]" />匹配结果 ({results.length})</h4>
              <div className="grid grid-cols-2 gap-6">{results.map(product => (<ProductCard key={product.id} product={product} />))}</div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ImageIcon className="w-24 h-24 mb-6 opacity-20" />
              <p className="font-bold">请上传图片开始搜索</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- RFP / Bid Logic ---
function RFPManager({ role }) {
  const { requests, bids, createRequest, submitBid, updateRequest, seedData, categories } = useContext(DataContext);
  const { user, userProfile } = useContext(AuthContext);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  const userId = userProfile?.phone || user?.uid;

  const handleSelectWinner = async (reqId, bid) => {
    if (confirm(`确定选择 ${bid.supplier_name} 为中标方吗？`)) {
      await updateRequest(reqId, { status: 'closed', winner_bid_id: bid.id });
      alert('选标成功！');
    }
  };

  const isCategoryMatch = (rfpCategory, supplierCategory) => {
    if (!rfpCategory || !supplierCategory) return false;
    if (rfpCategory === supplierCategory) return true;

    const findNode = (nodes, targetName) => {
      for (const node of nodes) {
        if (node.name === targetName) return node;
        if (node.children) {
          const found = findNode(node.children, targetName);
          if (found) return found;
        }
      }
      return null;
    };

    const supplierNode = findNode(categories, supplierCategory);
    if (supplierNode) {
      const checkDescendants = (node) => {
        if (node.name === rfpCategory) return true;
        if (node.children) return node.children.some(child => checkDescendants(child));
        return false;
      };
      if (supplierNode.children) return supplierNode.children.some(child => checkDescendants(child));
    }
    return false;
  };

  const displayRequests = role.startsWith('designer')
    ? requests.filter(r => r.designer_id === userId)
    : requests.filter(r => {
      // If supplier has no category, show all or none? Show all for opportunity.
      if (!userProfile?.category) return true;
      // If request has no category, show it.
      if (!r.category) return true;
      return isCategoryMatch(r.category, userProfile.category);
    });

  const myBids = role === 'supplier' ? bids.filter(b => b.supplier_id === userId) : bids;
  const hasBid = (reqId) => myBids.some(b => b.request_id === reqId);
  const toggleExpand = (reqId) => setExpandedRequestId(expandedRequestId === reqId ? null : reqId);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#111]">{role.startsWith('designer') ? '我的招标项目' : '投标机会'}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {role.startsWith('designer') ? '管理您的采购需求' : `当前主营品类：${userProfile?.category || '未设置'}`}
          </p>
        </div>
        {role.startsWith('designer') && (
          <button onClick={() => setShowForm(true)} className="flex items-center px-6 py-3 bg-[#0058a3] text-white rounded-full font-bold shadow-lg hover:bg-[#004f93] transition-transform active:scale-95">
            <Plus className="w-5 h-5 mr-2" /> 发布新需求
          </button>
        )}
      </div>

      {showForm && <CreateRFPForm onClose={() => setShowForm(false)} onSubmit={createRequest} />}

      <div className={`grid grid-cols-1 ${role === 'supplier' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
        <div className={`${role === 'supplier' ? 'lg:col-span-2' : ''} space-y-6`}>
          {displayRequests.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold mb-4">{role === 'supplier' ? `暂无${userProfile?.category || ''}相关招标` : '暂无招标项目'}</p>
              {role.startsWith('designer') && requests.length === 0 && (
                <button onClick={() => seedData('requests')} className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full font-bold text-sm hover:bg-indigo-100">一键加载演示数据</button>
              )}
            </div>
          ) : displayRequests.map(req => {
            const requestBids = bids.filter(b => b.request_id === req.id);
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                {role === 'supplier' && hasBid(req.id) && (
                  <div className="absolute top-6 right-6 text-green-700 flex items-center text-xs font-black bg-green-100 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4 mr-1" /> 已投标</div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {req.category && <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-[#0058a3] text-white mb-2">{req.category}</span>}
                    {req.status === 'closed' && <span className="ml-2 inline-block px-2 py-1 rounded-md text-xs font-bold bg-green-600 text-white mb-2">已选标</span>}
                    <h3 className="text-xl font-bold text-[#111]">{req.title}</h3>
                  </div>
                  {role.startsWith('designer') && (
                    <div className="flex items-center text-[#0058a3] font-bold text-sm bg-blue-50 px-3 py-1 rounded-full">
                      {requestBids.length} 个报价
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-500 mb-4">
                  <span className="bg-gray-100 px-3 py-1 rounded-md">量: {req.quantity} {req.unit}</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-md">预算: ¥{req.budget}</span>
                </div>

                <p className="text-sm text-gray-600 mb-6 line-clamp-2">{req.description}</p>

                {/* Display Reference Images */}
                {req.images && req.images.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {req.images.map((img, i) => (
                      <img key={i} src={img} onClick={() => window.open(img, '_blank')} className="w-20 h-20 rounded-lg object-cover bg-gray-100 border border-gray-100 cursor-zoom-in hover:shadow-md transition-shadow" />
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {req.attachment_url && (
                    <button onClick={() => {
                      const link = document.createElement('a');
                      link.href = req.attachment_url;
                      link.download = `tender_document_${req.id}`;
                      // For data URLs, this triggers download. For regular URLs, it tries.
                      // If it's a cross-origin URL, 'download' might be ignored, behaving like a link.
                      // But we can try targeting _blank for fallback.
                      link.target = "_blank";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }} className="flex items-center px-4 py-2 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50"><FileDigit className="w-4 h-4 mr-2" /> 招标文件</button>
                  )}

                  {role === 'supplier' && (
                    <button onClick={() => setSelectedRequest(req)} disabled={hasBid(req.id)} className={`flex-1 py-2 rounded-full font-bold text-sm ${hasBid(req.id) ? 'bg-gray-100 text-gray-400' : 'bg-[#111] text-white hover:bg-[#333]'}`}>{hasBid(req.id) ? '已报价' : '立即报价'}</button>
                  )}

                  {role.startsWith('designer') && (
                    <button onClick={() => toggleExpand(req.id)} className={`flex-1 py-2 rounded-full font-bold text-sm transition-colors ${expandedRequestId === req.id ? 'bg-[#111] text-white' : 'bg-gray-100 text-[#111] hover:bg-gray-200'}`}>
                      {expandedRequestId === req.id ? '收起详情' : '查看/管理报价'}
                    </button>
                  )}
                </div>

                {role.startsWith('designer') && expandedRequestId === req.id && (
                  <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300">
                    <h4 className="font-bold text-sm text-gray-500 mb-4 uppercase flex items-center"><List className="w-4 h-4 mr-2" /> 收到报价 ({requestBids.length})</h4>
                    {requestBids.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">暂无供应商报价</p>
                    ) : (
                      <div className="space-y-3">
                        {requestBids.map(bid => (
                          <div key={bid.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[#111] text-lg">{bid.supplier_name}</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">已认证</span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2 max-w-xl">{bid.tech_specs}</p>
                              {bid.image_url && (
                                <button onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = bid.image_url;
                                  link.download = `bid_attachment_${bid.id}`;
                                  link.target = "_blank";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }} className="mt-2 text-[#0058a3] text-xs font-bold hover:underline flex items-center">
                                  <FileText className="w-3 h-3 mr-1" /> 下载附件 / 方案
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-400 font-bold uppercase">报价金额</p>
                                <p className="text-xl font-black text-[#d00]">¥{bid.price}</p>
                              </div>
                              <button className="p-2 bg-white border border-gray-200 rounded-full hover:bg-[#0058a3] hover:text-white hover:border-[#0058a3] transition-colors" title="联系供应商">
                                <MessageCircle className="w-5 h-5" />
                              </button>
                            </div>
                            {req.status !== 'closed' && (
                              <button onClick={() => handleSelectWinner(req.id, bid)} className="w-full md:w-auto px-4 py-2 bg-[#111] text-white md:bg-white md:text-[#111] md:border md:border-gray-200 rounded-full font-bold text-sm hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors">
                                确认中标
                              </button>
                            )}
                            {req.status === 'closed' && req.winner_bid_id === bid.id && (
                              <div className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full flex items-center">
                                <Trophy className="w-3 h-3 mr-1" /> 中标
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {role === 'supplier' && selectedRequest && (
          <div className="lg:col-span-1 fixed inset-0 z-50 lg:static lg:z-auto bg-black/50 lg:bg-transparent flex justify-end lg:block">
            <div className="w-full lg:w-auto h-full lg:h-auto bg-white lg:rounded-3xl lg:border border-gray-200 shadow-2xl lg:shadow-xl p-8 overflow-y-auto animate-in slide-in-from-right lg:animate-none lg:sticky lg:top-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-[#111]">提交报价</h3>
                <button onClick={() => setSelectedRequest(null)} className="lg:hidden p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm border border-gray-100">
                <p className="text-gray-500 text-xs mb-1">当前项目</p>
                <p className="font-bold text-[#111]">{selectedRequest.title}</p>
              </div>
              <BidForm request={selectedRequest} userProfile={userProfile} onSubmit={submitBid} onComplete={() => setSelectedRequest(null)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRFPForm({ onClose, onSubmit }) {
  const { categories, units } = useContext(DataContext);
  const [formData, setFormData] = useState({ title: '', category: '', quantity: '', unit: 'm²', budget: '', description: '', attachment_url: '', house_type: '', area: '', rooms: '', invite_ids: [] });
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    // Load suppliers for invitation
    // Simple fetch from Firestore
    const q = query(collection(db, 'user_accounts'), where('role', '==', 'supplier'));
    const unsub = onSnapshot(q, (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !u.isDisabled && u.status === 'active'));
    });
    return () => unsub();
  }, []);

  const flattenCategories = (nodes, level = 0) => {
    let result = [];
    if (!nodes) return result;
    nodes.forEach(node => {
      const isLeaf = !node.children || node.children.length === 0;
      result.push({ id: node.id, name: node.name, level, isLeaf, value: node.name });
      if (node.children) result.push(...flattenCategories(node.children, level + 1));
    });
    return result;
  };
  const categoryOptions = flattenCategories(categories);

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-[#111]">发布招标需求</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">项目标题</label>
              <input required type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold text-[#111]" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">品类 (三级目录)</label>
                <select required className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">请选择品类...</option>
                  {categoryOptions.map(opt => (
                    <option
                      key={opt.id}
                      value={opt.value}
                      disabled={!opt.isLeaf}
                      className={!opt.isLeaf ? 'bg-gray-100 font-bold text-gray-400' : 'text-[#111]'}
                    >
                      {opt.level === 0 ? `📂 ${opt.name}` : opt.level === 1 ? `\u00A0\u00A0\u00A0\u00A0└─ ${opt.name}` : `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0• ${opt.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">数量</label>
              <div className="flex bg-gray-50 rounded-lg items-center border border-transparent focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                <input required type="text" className="flex-1 p-3 bg-transparent border-none text-sm font-bold focus:ring-0 placeholder-gray-300" placeholder="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                <div className="h-6 w-px bg-gray-300"></div>
                <select className="w-20 p-3 bg-transparent border-none text-sm font-bold text-center focus:ring-0 cursor-pointer text-gray-700" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">户型 / 面积 / 居室 (选填)</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" className="p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" placeholder="如：平层" value={formData.house_type || ''} onChange={e => setFormData({ ...formData, house_type: e.target.value })} />
                <input type="text" className="p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" placeholder="面积 m²" value={formData.area || ''} onChange={e => setFormData({ ...formData, area: e.target.value })} />
                <input type="text" className="p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" placeholder="居室" value={formData.rooms || ''} onChange={e => setFormData({ ...formData, rooms: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">预算</label>
                <input required type="number" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">附件</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold truncate pr-8" placeholder="链接" value={formData.attachment_url} readOnly />
                    {formData.attachment_url && (
                      <button type="button" onClick={() => setFormData({ ...formData, attachment_url: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <FileUploader onUpload={(url) => setFormData({ ...formData, attachment_url: url })} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">要求</label>
              <textarea className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-medium h-24" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">邀请供应商 (多选)</label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 p-4 rounded-lg bg-gray-50 space-y-4">
                {Object.entries(suppliers.reduce((acc, s) => {
                  // Filter by category:
                  // 1. If no category selected, show all (or could show none) -> user wants "correspond to selected", so maybe strict?
                  // But category selection is a dropdown. Let's filter if category is selected.
                  // Note: s.category might be a top-level category (e.g. 'Furniture') while formData.category is specific (e.g. 'Sofa').
                  // We need to check if the supplier's category is related.
                  // Simplified: Check if supplier category matches (leniently) or if no category selected.

                  // Better approach: Show "Recommended" (matching category) at top, and others below? 
                  // Or just filter strictly as requested "should automatically correspond".

                  // Logic: If formData.category is set, filter. Assuming supplier.category is the main category (e.g. 'Stone', 'Furniture').
                  // formData.category is a specific sub-category name (e.g. 'Marble').
                  // We need to find the parent category of formData.category.

                  let isMatch = true;
                  if (formData.category) {
                    let hit = false;
                    // Traverse the tree to find if formData.category (Level 3) belongs to Supplier's category (Level 1 or 2)
                    for (const p of categories) { // Level 1
                      if (p.children) {
                        for (const c of p.children) { // Level 2
                          if (c.children && c.children.some(leaf => leaf.name === formData.category)) {
                            // Found the selected generic category path: p.name -> c.name -> formData.category
                            // Supplier matches if they are registered under:
                            // - The root category (e.g. 'Furniture')
                            // - The sub category (e.g. 'Sofa')
                            // - Or the exact item (unlikely but cover it)
                            if (s.category === p.name || s.category === c.name || s.category === formData.category) {
                              hit = true;
                            }
                          }
                        }
                      }
                      if (hit) break;
                    }
                    if (!hit) {
                      // Fallback: strict match if not found in tree
                      isMatch = s.category === formData.category;
                    } else {
                      isMatch = hit;
                    }
                  }

                  if (isMatch) {
                    const cat = s.category || '其他';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(s);
                  }
                  return acc;
                }, {})).map(([cat, list]) => (
                  <div key={cat}>
                    <h4 className="text-xs font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">{cat}</h4>
                    <div className="flex flex-wrap gap-2">
                      {list.map(s => (
                        <label key={s.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors">
                          <input type="checkbox"
                            checked={formData.invite_ids.includes(s.id)}
                            onChange={e => {
                              const ids = formData.invite_ids;
                              if (e.target.checked) setFormData({ ...formData, invite_ids: [...ids, s.id] });
                              else setFormData({ ...formData, invite_ids: ids.filter(id => id !== s.id) });
                            }}
                          />
                          <span className="text-xs font-bold">{s.companyName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {suppliers.length === 0 && <span className="text-xs text-gray-400">暂无入驻供应商</span>}
                {suppliers.length === 0 && <span className="text-xs text-gray-400">暂无入驻供应商</span>}
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] mt-6">立即发布</button>
          </form>
        </div>
      </div >
    </div >
  );
}

function BidForm({ request, userProfile, onSubmit, onComplete }) {
  const defaultCompany = userProfile?.companyName || '我的品牌';
  const [formData, setFormData] = useState({ price: '', tech_specs: '', supplier_name: defaultCompany });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, request_id: request.id, price: Number(formData.price) });
    alert('报价已提交！');
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">投标总价 (¥)</label>
        <input required type="number" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold text-[#111]" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">品牌 (注册信息)</label>
        <input required type="text" readOnly className="w-full p-3 bg-gray-100 border-none rounded-lg text-sm font-bold text-gray-500 cursor-not-allowed" value={formData.supplier_name} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">附图 / 方案 (可选)</label>
        <div className="flex gap-2">
          <input type="text" className="flex-1 p-3 bg-gray-50 border-none rounded-lg text-sm font-bold truncate" placeholder="图片URL" value={formData.image_url || ''} readOnly />
          <FileUploader onUpload={(url) => setFormData({ ...formData, image_url: url })} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">技术响应</label>
        <textarea required className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-medium h-32" value={formData.tech_specs} onChange={e => setFormData({ ...formData, tech_specs: e.target.value })}></textarea>
      </div>
      <button type="submit" className="w-full py-4 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93]">提交报价</button>
    </form>
  );
}

// --- MarketView ---
function MarketView({ showFavoritesOnly = false }) {
  const { products, loadingProducts, seedData, favorites, toggleFavorite, createFavoriteGroup, moveFavoriteToGroup, favoriteGroups, searchByImage, categories } = useContext(DataContext);
  const { role, setShowAuthModal, upgradeRole } = useContext(AuthContext);

  const [filter, setFilter] = useState('all');
  const [activeGroup, setActiveGroup] = useState('all'); // Favorites Group Filter
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showVipModal, setShowVipModal] = useState(false);
  const [contactProduct, setContactProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); // Detail Modal
  const [showImageSearch, setShowImageSearch] = useState(false);

  const topLevelCategories = ['all', ...(categories ? categories.map(c => c.name) : [])];

  // --- Category helpers (Top-level -> Leaf mapping)
  const buildLeafToTopMap = (nodes, topName = null, map = {}) => {
    if (!nodes) return map;
    nodes.forEach(n => {
      const currentTop = topName || n.name;
      const hasChildren = n.children && n.children.length > 0;
      if (!hasChildren) {
        map[n.name] = currentTop;
      } else {
        buildLeafToTopMap(n.children, currentTop, map);
      }
    });
    return map;
  };

  const leafToTop = buildLeafToTopMap(categories || []);

  const matchesTopCategory = (productCategory, selectedTop) => {
    if (!selectedTop || selectedTop === 'all') return true;
    if (!productCategory) return false;

    // 1) Product category is already a top-level category name
    if (productCategory === selectedTop) return true;

    // 2) Product category is a leaf/sub-category -> map to top
    const mappedTop = leafToTop[productCategory];
    if (mappedTop && mappedTop === selectedTop) return true;

    // 3) Fallback: if productCategory is a mid-level node, try to resolve it
    //    by finding its top-level parent.
    const findTopByAnyNodeName = (nodes, currentTop = null) => {
      for (const node of nodes) {
        const top = currentTop || node.name;
        if (node.name === productCategory) return top;
        if (node.children) {
          const res = findTopByAnyNodeName(node.children, top);
          if (res) return res;
        }
      }
      return null;
    };
    const resolvedTop = findTopByAnyNodeName(categories || []);
    return resolvedTop === selectedTop;
  };

  const filteredProducts = products.filter(p => {
    // 我的选材库
    if (showFavoritesOnly) {
      const fav = favorites.find(f => f.productId === p.id);
      if (!fav) return false;
      if (activeGroup !== 'all') {
        const groupId = fav.groupId || 'default';
        // Simple match logic, 'default' is the implicit group for legacy/new items
        if (activeGroup === 'default' && groupId !== 'default') return false;
        if (activeGroup !== 'default' && groupId !== activeGroup) return false;
      }
    }

    // 关键修复：按钮是一级品类，但产品多是二/三级品类
    const matchesCategory = matchesTopCategory(p.category, filter);

    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createFavoriteGroup(newGroupName);
    setNewGroupName('');
    setShowCreateGroup(false);
  };

  return (
    <div>
      {!showFavoritesOnly && role === 'designer_normal' && (
        <div className="mb-8 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between text-white">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 bg-white/10 rounded-full mr-4"><Crown className="w-6 h-6 text-yellow-400" /></div>
            <div>
              <h3 className="font-bold text-lg">升级认证会员，查看底价</h3>
              <p className="text-gray-400 text-xs">提交名片审核，立省 30% 采购成本</p>
            </div>
          </div>
          <button onClick={() => setShowVipModal(true)} className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm transition-colors">立即认证</button>
        </div>
      )}

      {showVipModal && (
        <VipUpgradeModal
          onClose={() => setShowVipModal(false)}
          onUpgrade={(newRole) => upgradeRole(newRole)}
        />
      )}
      {contactProduct && <ContactModal product={contactProduct} onClose={() => setContactProduct(null)} />}
      {selectedProduct && <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onContact={() => { setSelectedProduct(null); setContactProduct(selectedProduct); }}
        isFavorite={favorites.some(f => f.productId === selectedProduct.id)}
        onToggleFavorite={() => toggleFavorite(selectedProduct)}
      />}
      {showImageSearch && <ImageSearchModal onClose={() => setShowImageSearch(false)} onSearch={searchByImage} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 sticky top-16 bg-white z-40 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-[#111] flex items-center tracking-tight">{showFavoritesOnly ? '我的选材库' : '选材大厅'}</h2>
        </div>
        <div className="w-full md:w-auto flex flex-col gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="搜索材料..."
              className="w-full pl-10 pr-10 py-3 bg-gray-100 border-none rounded-full text-sm font-bold text-[#111] focus:ring-2 focus:ring-[#0058a3]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <button onClick={() => setShowImageSearch(true)} className="absolute right-2 top-2 p-1 bg-white rounded-full shadow-sm hover:text-[#0058a3] transition-colors"><Camera className="w-5 h-5" /></button>
          </div>
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
            {topLevelCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === cat ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat === 'all' ? '全部品类' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFavoritesOnly && (
        <div className="mb-6 flex items-center overflow-x-auto gap-2 no-scrollbar">
          <button
            onClick={() => setActiveGroup('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeGroup === 'all' ? 'bg-[#111] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            全部
          </button>
          {(favoriteGroups || []).map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeGroup === g.id ? 'bg-[#111] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {g.name}
            </button>
          ))}
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-blue-50 text-[#0058a3] hover:bg-blue-100 flex items-center"
          >
            <Plus className="w-3 h-3 mr-1" /> 新建分组
          </button>
        </div>
      )}

      {showCreateGroup && (
        <SimpleModal title="新建分组" onClose={() => setShowCreateGroup(false)} onConfirm={handleCreateGroup}>
          <input autoFocus type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="分组名称 (如: 海淀别墅项目)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        </SimpleModal>
      )}

      {loadingProducts ? (
        <div className="flex justify-center py-32"><Loader2 className="animate-spin w-10 h-10 text-[#0058a3]" /></div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Box className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold">暂无相关产品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-24">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={favorites.some(f => f.productId === product.id)}
              favoriteEntry={favorites.find(f => f.productId === product.id)}
              favoriteGroups={favoriteGroups}
              onMoveToGroup={moveFavoriteToGroup}
              onToggleFavorite={() => toggleFavorite(product)}
              onContact={() => setContactProduct(product)}
              onUpgrade={() => setShowVipModal(true)}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, isFavorite, favoriteEntry, favoriteGroups, onMoveToGroup, onToggleFavorite, onContact, onUpgrade, onClick }) {
  const { role, setShowAuthModal } = useContext(AuthContext);
  const isVip = role === 'designer_vip' || role === 'supplier';

  const currentGroupId = favoriteEntry?.groupId || 'default';

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (role === 'guest') setShowAuthModal(true);
    else onToggleFavorite && onToggleFavorite();
  };

  const handleContactClick = () => {
    if (isVip) onContact && onContact();
    else if (role === 'guest') setShowAuthModal(true);
    else onUpgrade && onUpgrade();
  };

  const handleDownload = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className="group relative flex flex-col cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square overflow-hidden bg-gray-100 mb-3">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300?text=Image+Error'; }}
        />
        <button onClick={handleFavoriteClick} className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors z-10">
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#e00] text-[#e00]' : 'text-gray-400'}`} />
        </button>
        {isFavorite && favoriteGroups && favoriteGroups.length > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <select
              onClick={e => e.stopPropagation()}
              value={currentGroupId}
              onChange={e => onMoveToGroup(favoriteEntry.id, e.target.value)}
              className="text-[10px] font-bold py-1 px-2 rounded-full border border-gray-200 bg-white/90 focus:outline-none"
            >
              <option value="default">默认</option>
              {favoriteGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div className="absolute bottom-3 right-3 hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleContactClick} className="p-3 bg-[#0058a3] text-white rounded-full shadow-lg hover:bg-[#004f93]" title="联系"><QrCode className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <h3 className="font-bold text-[#111] text-base leading-tight mb-1 line-clamp-2">{product.title}</h3>
        <p className="text-xs text-gray-500 mb-2 font-medium">{product.category} · {product.supplier_name}</p>

        {(product.texture_url || product.model_url) && (
          <div className="flex gap-2 mb-3">
            {product.texture_url && <button onClick={() => handleDownload(product.texture_url)} className="px-2 py-1 bg-blue-50 text-[#0058a3] rounded text-[10px] font-bold">材质</button>}
            {product.model_url && <button onClick={() => handleDownload(product.model_url)} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">3D</button>}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div className="flex flex-col">
            {isVip ? (
              <>
                <span className="text-xs font-bold text-[#ffdb00] bg-[#0058a3] px-1.5 py-0.5 w-fit mb-1">会员价</span>
                <div className="flex items-baseline">
                  <span className="text-2xl font-black text-[#d00] leading-none">¥{product.price_member}</span>
                  <span className="text-xs text-gray-500 font-bold ml-1">/ {product.unit || 'm²'}</span>
                </div>
                <span className="text-[10px] text-gray-400 line-through mt-1">¥{product.price_market}</span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold text-[#111] bg-gray-200 px-1.5 py-0.5 w-fit mb-1">市场价</span>
                <div className="flex items-baseline">
                  <span className="text-xl font-black text-[#111] leading-none">¥{product.price_market}</span>
                  <span className="text-xs text-gray-500 font-bold ml-1">/ {product.unit || 'm²'}</span>
                </div>
              </>
            )}
          </div>

          <button onClick={(e) => { e.stopPropagation(); handleContactClick(); }} className="md:hidden w-10 h-10 bg-[#0058a3] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
            <QrCode className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Admin ---
function AdminDashboard() {
  const { categories, units, saveCategories, saveUnits } = useContext(DataContext);
  const { userProfile, user } = useContext(AuthContext); // Added user

  const adminPhone = userProfile?.phone || 'admin';

  const [activeTab, setActiveTab] = useState('audit');
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showDelCatModal, setShowDelCatModal] = useState(false);
  const [showDelUnitModal, setShowDelUnitModal] = useState(false);
  const [targetParentId, setTargetParentId] = useState(null);
  const [targetDelId, setTargetDelId] = useState(null);
  const [targetDelUnit, setTargetDelUnit] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newUnit, setNewUnit] = useState('');

  // ✅ 用户管理
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('all'); // all, supplier, designer, admin
  const [userSearch, setUserSearch] = useState('');
  const [showUserEditor, setShowUserEditor] = useState(false);
  const [showDelUserModal, setShowDelUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null=新增
  const [userForm, setUserForm] = useState({ phone: '', password: '', role: 'designer_normal', realName: '', companyName: '', category: '', isDisabled: false });

  const pendingUsers = users.filter(u => u.status === 'pending');

  useEffect(() => {
    // REAL FIRESTORE LISTEN
    const q = query(collection(db, 'user_accounts'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
    });
    return () => unsubUsers();
  }, []);

  const openAddCatModal = (parentId) => { setTargetParentId(parentId); setNewCatName(''); setShowAddCatModal(true); };

  const confirmAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat = { id: `cat_${Date.now()}`, name: newCatName, children: [] };
    if (!targetParentId) {
      saveCategories([...(categories || []), newCat]);
    } else {
      const addNode = (nodes) => nodes.map(node => {
        if (node.id === targetParentId) return { ...node, children: [...(node.children || []), newCat] };
        if (node.children) return { ...node, children: addNode(node.children) };
        return node;
      });
      saveCategories(addNode(categories));
    }
    setShowAddCatModal(false);
  };

  const openDelCatModal = (id) => { setTargetDelId(id); setShowDelCatModal(true); };

  const confirmDeleteCategory = () => {
    const deleteNode = (nodes) => nodes
      .filter(node => node.id !== targetDelId)
      .map(node => ({ ...node, children: node.children ? deleteNode(node.children) : [] }));
    saveCategories(deleteNode(categories));
    setShowDelCatModal(false);
  };

  const moveCategory = (id, direction) => {
    // direction: -1 (up), 1 (down)
    const moveNode = (nodes) => {
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) {
        const newNodes = [...nodes];
        if (direction === -1 && idx > 0) {
          [newNodes[idx], newNodes[idx - 1]] = [newNodes[idx - 1], newNodes[idx]];
        } else if (direction === 1 && idx < nodes.length - 1) {
          [newNodes[idx], newNodes[idx + 1]] = [newNodes[idx + 1], newNodes[idx]];
        }
        return newNodes;
      }
      return nodes.map(n => n.children ? { ...n, children: moveNode(n.children) } : n);
    };
    saveCategories(moveNode(categories));
  };

  const handleAddUnit = () => {
    if (newUnit && !units.includes(newUnit)) {
      saveUnits([...units, newUnit]);
      setNewUnit('');
    }
  };

  const openDelUnitModal = (unit) => { setTargetDelUnit(unit); setShowDelUnitModal(true); };

  const confirmDeleteUnit = () => {
    saveUnits(units.filter(u => u !== targetDelUnit));
    setShowDelUnitModal(false);
  };

  // --- 用户管理 actions ---
  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ phone: '', password: '', role: 'designer_normal', realName: '', companyName: '', category: '', isDisabled: false });
    setShowUserEditor(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      phone: u.phone || '',
      password: u.password || '',
      role: u.role || 'designer_normal',
      realName: u.realName || '',
      companyName: u.companyName || '',
      category: u.category || '',
      isDisabled: !!u.isDisabled
    });
    setShowUserEditor(true);
  };

  const isSelf = (phone) => phone === adminPhone;

  const saveUser = async () => {
    if (!userForm.phone || !userForm.password) return;

    // 手机号唯一
    const exists = users.find(x => x.phone === userForm.phone);
    if (!editingUser && exists) {
      alert('该账号已存在');
      return;
    }

    if (editingUser) {
      // ✅ 管理员不能改自己的角色/禁用自己
      const patch = { ...userForm };
      if (isSelf(editingUser.phone)) {
        patch.role = editingUser.role;
        patch.isDisabled = false;
      }
      await updateDoc(doc(db, 'user_accounts', editingUser.id), patch);
    } else {
      await addDoc(collection(db, 'user_accounts'), { ...userForm, createdAt: serverTimestamp(), status: 'active' });
    }

    setShowUserEditor(false);
  };

  const requestDeleteUser = (u) => {
    setEditingUser(u);
    setShowDelUserModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!editingUser) return;
    if (isSelf(editingUser.phone)) return;
    await deleteDoc(doc(db, 'user_accounts', editingUser.id));
    setShowDelUserModal(false);
    setEditingUser(null);
  };

  const approveUser = async (u) => {
    await updateDoc(doc(db, 'user_accounts', u.id), { status: 'active', isDisabled: false });
  };

  const rejectUser = async (u) => {
    if (confirm('确定要拒绝并删除该申请吗？')) {
      await deleteDoc(doc(db, 'user_accounts', u.id));
    }
  };

  // Helper for rendering (Role Label, Filtering)
  const getFilteredUsers = () => {
    let res = users.filter(u => u.status !== 'pending'); // List tab only shows active/disabled, not pending
    if (userFilter !== 'all') {
      if (userFilter === 'admin') res = res.filter(u => u.role === 'admin');
      else if (userFilter === 'supplier') res = res.filter(u => u.role === 'supplier');
      else if (userFilter === 'designer') res = res.filter(u => u.role.startsWith('designer'));
    }
    if (userSearch) {
      const lower = userSearch.toLowerCase();
      res = res.filter(u =>
        (u.phone || '').toLowerCase().includes(lower) ||
        (u.realName || '').toLowerCase().includes(lower) ||
        (u.companyName || '').toLowerCase().includes(lower)
      );
    }
    return res;
  };

  const roleLabel = (r) => {
    if (r === 'admin') return '管理员';
    if (r === 'designer_vip') return '设计师VIP';
    if (r === 'designer_normal') return '设计师';
    if (r === 'supplier') return '供应商';
    return r;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-200 h-fit">
        <h3 className="text-xl font-black mb-6">系统维护</h3>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('audit')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center justify-between ${activeTab === 'audit' ? 'bg-[#0058a3] text-white' : 'hover:bg-gray-50'}`}>
            <div className="flex items-center"><ShieldCheck className="w-5 h-5 mr-3" /> 注册审核</div>
            {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}
          </button>
          <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center ${activeTab === 'categories' ? 'bg-[#0058a3] text-white' : 'hover:bg-gray-50'}`}><FolderTree className="w-5 h-5 mr-3" /> 品类管理</button>
          <button onClick={() => setActiveTab('units')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center ${activeTab === 'units' ? 'bg-[#0058a3] text-white' : 'hover:bg-gray-50'}`}><Ruler className="w-5 h-5 mr-3" /> 单位管理</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center ${activeTab === 'users' ? 'bg-[#0058a3] text-white' : 'hover:bg-gray-50'}`}><Users className="w-5 h-5 mr-3" /> 账号管理</button>
        </div>
      </div>

      <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-gray-200">
        {activeTab === 'audit' && (
          <div>
            <h2 className="text-2xl font-black mb-6">注册审核</h2>
            {pendingUsers.length === 0 ? (
              <p className="text-gray-400 font-bold">暂无待审核申请</p>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map(u => (
                  <div key={u.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#111]">{u.phone}</span>
                        <span className="text-xs bg-blue-100 text-[#0058a3] px-2 py-0.5 rounded">{roleLabel(u.role)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {u.role === 'supplier' ? `企业: ${u.companyName} | 主营: ${u.category}` : `姓名: ${u.realName}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveUser(u)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 text-sm">通过</button>
                      <button onClick={() => rejectUser(u)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 text-sm">拒绝</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">产品品类架构</h2>
              <button onClick={() => openAddCatModal(null)} className="px-4 py-2 bg-black text-white rounded-full text-sm font-bold flex items-center"><Plus className="w-4 h-4 mr-1" /> 添加一级分类</button>
            </div>
            <div className="space-y-4">{(categories || []).map((cat, idx) => <CategoryNode key={cat.id} node={cat} index={idx} total={categories.length} level={0} onAdd={openAddCatModal} onDelete={openDelCatModal} onMove={moveCategory} />)}</div>
          </div>
        )}

        {activeTab === 'units' && (
          <div>
            <h2 className="text-2xl font-black mb-6">计量单位库</h2>
            <div className="flex gap-2 mb-8">
              <input type="text" value={newUnit} onChange={e => setNewUnit(e.target.value)} className="p-3 border border-gray-300 rounded-lg font-bold" placeholder="输入新单位 (如: 吨)" />
              <button onClick={handleAddUnit} className="px-6 bg-[#0058a3] text-white rounded-lg font-bold">添加</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {units.map(unit => (
                <div key={unit} className="px-4 py-2 bg-gray-100 rounded-lg font-bold flex items-center">
                  {unit}
                  <button onClick={() => openDelUnitModal(unit)} className="ml-3 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black">账号管理</h2>
              </div>
              <button onClick={openCreateUser} className="px-4 py-2 bg-black text-white rounded-full text-sm font-bold flex items-center shrink-0"><Plus className="w-4 h-4 mr-1" /> 添加账号</button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['all', 'supplier', 'designer', 'admin'].map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${userFilter === f ? 'bg-white shadow-sm text-[#111]' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {f === 'all' ? '全部' : f === 'supplier' ? '供应商' : f === 'designer' ? '设计师' : '管理员'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索手机号 / 姓名 / 公司..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-[#0058a3] focus:border-[#0058a3]"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">账号</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">角色</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {getFilteredUsers().map(u => (
                    <tr key={u.id} className={u.phone === adminPhone ? 'bg-blue-50/40' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#111]">{u.phone}</div>
                        <div className="text-xs text-gray-500">{u.realName || u.companyName || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">{roleLabel(u.role)}</span>
                        {u.role === 'supplier' && u.category && <div className="text-[11px] text-gray-500 mt-1">主营：{u.category}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {u.isDisabled ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">已禁用</span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">正常</span>
                        )}
                        {u.phone === adminPhone && <div className="text-[11px] text-[#0058a3] font-bold mt-1">(当前登录)</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditUser(u)} className="inline-flex items-center justify-center p-2 rounded-full hover:bg-blue-50 text-[#0058a3] mr-2"><Pencil className="w-4 h-4" /></button>
                        <button
                          onClick={() => requestDeleteUser(u)}
                          disabled={u.phone === adminPhone}
                          className={`inline-flex items-center justify-center p-2 rounded-full ${u.phone === adminPhone ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddCatModal && (
        <SimpleModal title={targetParentId ? '添加子分类' : '添加一级分类'} onClose={() => setShowAddCatModal(false)} onConfirm={confirmAddCategory}>
          <input autoFocus type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="输入分类名称" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmAddCategory()} />
        </SimpleModal>
      )}
      {showDelCatModal && (
        <SimpleModal title="删除分类" isDestructive={true} onClose={() => setShowDelCatModal(false)} onConfirm={confirmDeleteCategory} confirmText="确认删除">
          <p className="text-sm text-gray-600">确定要删除该分类及其所有子分类吗？此操作无法撤销。</p>
        </SimpleModal>
      )}
      {showDelUnitModal && (
        <SimpleModal title="删除单位" isDestructive={true} onClose={() => setShowDelUnitModal(false)} onConfirm={confirmDeleteUnit} confirmText="确认删除">
          <p className="text-sm text-gray-600">确定要删除单位 "{targetDelUnit}" 吗？</p>
        </SimpleModal>
      )}

      {showUserEditor && (
        <SimpleModal
          title={editingUser ? '编辑账号' : '添加账号'}
          onClose={() => setShowUserEditor(false)}
          onConfirm={saveUser}
          confirmText="保存"
          disableConfirm={!userForm.phone || !userForm.password}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500">手机号/账号</label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg text-sm font-bold ${editingUser ? 'bg-gray-100 text-gray-500' : 'border-gray-300'}`}
                value={userForm.phone}
                disabled={!!editingUser}
                onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                placeholder="例如：13800000003 或 admin2"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">密码</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold"
                value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="例如：123456"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">角色</label>
              <select
                className={`w-full p-2 border rounded-lg text-sm font-bold ${editingUser && isSelf(editingUser.phone) ? 'bg-gray-100 text-gray-500' : 'border-gray-300'}`}
                value={userForm.role}
                disabled={editingUser && isSelf(editingUser.phone)}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="admin">管理员</option>
                <option value="designer_normal">设计师</option>
                <option value="designer_vip">设计师VIP</option>
                <option value="supplier">供应商</option>
              </select>
              {editingUser && isSelf(editingUser.phone) && (
                <div className="text-[11px] text-gray-400 mt-1">管理员不能修改自己的角色</div>
              )}
            </div>

            {userForm.role.startsWith('designer') && (
              <div>
                <label className="text-xs font-bold text-gray-500">真实姓名</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  value={userForm.realName}
                  onChange={e => setUserForm({ ...userForm, realName: e.target.value })}
                  placeholder="例如：张三"
                />
              </div>
            )}

            {userForm.role === 'supplier' && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-500">企业全称</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    value={userForm.companyName}
                    onChange={e => setUserForm({ ...userForm, companyName: e.target.value })}
                    placeholder="例如：米兰石业"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">主营品类</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-[#0058a3]"
                    value={userForm.category}
                    onChange={e => setUserForm({ ...userForm, category: e.target.value })}
                  >
                    <option value="">请选择主营品类...</option>
                    {(categories || []).map(parent => (
                      <optgroup label={parent.name} key={parent.id}>
                        {parent.children?.map(child => (
                          <option key={child.id} value={child.name}>{child.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs font-bold text-gray-500">账号禁用</div>
                <div className="text-[11px] text-gray-400">禁用后无法登录</div>
              </div>
              <button
                type="button"
                disabled={editingUser && isSelf(editingUser.phone)}
                onClick={() => setUserForm({ ...userForm, isDisabled: !userForm.isDisabled })}
                className={`px-3 py-2 rounded-full text-xs font-bold ${(editingUser && isSelf(editingUser.phone))
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : (userForm.isDisabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')
                  }`}
              >
                {userForm.isDisabled ? '已禁用' : '正常'}
              </button>
            </div>

            {editingUser && isSelf(editingUser.phone) && (
              <div className="text-[11px] text-gray-400">管理员不能禁用自己</div>
            )}
          </div>
        </SimpleModal>
      )}

      {showDelUserModal && (
        <SimpleModal
          title="删除账号"
          isDestructive={true}
          onClose={() => setShowDelUserModal(false)}
          onConfirm={confirmDeleteUser}
          confirmText="确认删除"
          disableConfirm={editingUser?.phone === adminPhone}
        >
          <p className="text-sm text-gray-600">
            {editingUser?.phone === adminPhone
              ? '不能删除当前登录的管理员账号。'
              : `确定要删除账号 “${editingUser?.phone}” 吗？此操作无法撤销。`
            }
          </p>
        </SimpleModal>
      )}
    </div>
  );
}

function CategoryNode({ node, index, total, level, onAdd, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="select-none">
      <div className={`flex items-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 mb-2 ${level > 0 ? 'ml-8' : ''}`}>
        <button onClick={() => setExpanded(!expanded)} className="mr-2 text-gray-400 hover:text-black">
          {node.children && node.children.length > 0 ? (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <div className="w-4 h-4" />}
        </button>
        <span className="font-bold text-[#111]">{node.name}</span>
        <div className="ml-auto flex gap-2 items-center">
          <div className="flex flex-col mr-2">
            <button disabled={index === 0} onClick={() => onMove(node.id, -1)} className="text-gray-400 hover:text-[#0058a3] disabled:opacity-20"><ChevronRight className="w-3 h-3 -rotate-90" /></button>
            <button disabled={index === total - 1} onClick={() => onMove(node.id, 1)} className="text-gray-400 hover:text-[#0058a3] disabled:opacity-20"><ChevronRight className="w-3 h-3 rotate-90" /></button>
          </div>
          {level < 2 && <button onClick={() => { onAdd(node.id); setExpanded(true); }} className="p-1 text-[#0058a3] hover:bg-blue-50 rounded"><Plus className="w-4 h-4" /></button>}
          <button onClick={() => onDelete(node.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && node.children && (
        <div>
          {node.children.map((child, i) => <CategoryNode key={child.id} node={child} index={i} total={node.children.length} level={level + 1} onAdd={onAdd} onDelete={onDelete} onMove={onMove} />)}
        </div>
      )}
    </div>
  );
}

function SupplierDashboard() {
  const { products, addProduct, updateProduct, removeProduct, seedData, units, categories } = useContext(DataContext);
  const { user, userProfile } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: '', sub_category: '', price_market: '', price_member: '', unit: 'm²', image: '', images: ['', '', '', '', ''], supplier_name: userProfile?.companyName || '我的品牌', texture_url: '', model_url: '',
    brand_type: 'company', has_install_fee: false, price_rule: 'fixed', comm_ratio: '',
    material: '', origin: '', specs: '', designer: '', year: '', install_req: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false); // Mobile optimization

  const myCategory = userProfile?.category || '未分类';
  const userId = userProfile?.phone || user?.uid;

  let displayCategory = myCategory;
  const parentCat = (categories || []).find(c => c.children && c.children.some(child => child.name === myCategory));
  if (parentCat) displayCategory = `${parentCat.name} / ${myCategory}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      let finalMemberPrice = Number(formData.price_member);
      if (formData.price_rule === 'ratio' && formData.comm_ratio && formData.price_market) {
        // Calculate member price from ratio: Market * (1 - Ratio%)
        // Assuming ratio is "commission ratio" (e.g., 10% comm -> 90% price)
        const ratio = Number(formData.comm_ratio);
        finalMemberPrice = Math.round(Number(formData.price_market) * (1 - ratio / 100));
      }

      const productData = {
        ...formData,
        category: myCategory,
        price_market: Number(formData.price_market),
        price_member: finalMemberPrice,
        tags: ['新品', myCategory, formData.sub_category]
      };

      if (editingId) {
        await updateProduct(editingId, productData);
        setEditingId(null);
      } else {
        await addProduct(productData);
      }
      setFormData({ title: '', sub_category: '', price_market: '', price_member: '', unit: 'm²', image: '', images: ['', '', '', '', ''], supplier_name: userProfile?.companyName || '我的品牌', texture_url: '', model_url: '', });
      setMessage('操作成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage(error.message === "存储空间已满" ? "空间已满，请重置数据" : '操作失败');
    }
    setIsSubmitting(false);
  };

  const handleEdit = (product) => {
    setFormData({ ...product, sub_category: product.sub_category || '', texture_url: product.texture_url || '', model_url: product.model_url || '', unit: product.unit || 'm²', images: product.images || ['', '', '', '', ''] });
    setEditingId(product.id);
  };

  const handleCancel = () => {
    setFormData({ title: '', sub_category: '', price_market: '', price_member: '', unit: 'm²', image: '', images: ['', '', '', '', ''], supplier_name: userProfile?.companyName || '我的品牌', texture_url: '', model_url: '', });
    setEditingId(null);
  };

  // ✅ 供应商数据隔离：只看自己的产品
  const myProducts = products.filter(p => userId && p.supplier_id === userId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#111]">{editingId ? '编辑产品' : '发布新产品'}</h2>
            <div className="flex gap-2">
              {!editingId && <button onClick={() => seedData('products')} className="text-xs font-bold text-[#0058a3] hover:underline">演示</button>}
              <button onClick={() => setIsFormCollapsed(!isFormCollapsed)} className="lg:hidden p-1 bg-gray-100 rounded text-gray-500"><ChevronDown className={`w-5 h-5 transition-transform ${isFormCollapsed ? '' : 'rotate-180'}`} /></button>
            </div>
          </div>

          <div className={`${isFormCollapsed ? 'hidden lg:block' : 'block'}`}>

            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs font-bold text-[#0058a3] uppercase block mb-1">当前主营品类</span>
              <div className="font-black text-xl text-[#111]">{displayCategory}</div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${message.includes('失败') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">产品归类</label>
                {/* Find relevant product options based on supplier category */}
                {(() => {
                  const getLeafOptions = (nodes) => {
                    let results = [];
                    nodes.forEach(n => {
                      if (!n.children || n.children.length === 0) results.push(n.name);
                      else results = results.concat(getLeafOptions(n.children));
                    });
                    return results;
                  };

                  let productOptions = [];
                  if (categories && myCategory) {
                    const findNode = (nodes) => {
                      for (const n of nodes) {
                        if (n.name === myCategory) return n;
                        if (n.children) {
                          const found = findNode(n.children);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const categoryNode = findNode(categories);
                    if (categoryNode) productOptions = getLeafOptions([categoryNode]);
                  }

                  if (productOptions.length > 0) {
                    return (
                      <div className="relative">
                        <select required className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold appearance-none" value={formData.sub_category} onChange={e => setFormData({ ...formData, sub_category: e.target.value })}>
                          <option value="">请选择产品...</option>
                          {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    );
                  } else {
                    return <input type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.sub_category} onChange={e => setFormData({ ...formData, sub_category: e.target.value })} placeholder="输入产品归类" />;
                  }
                })()}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">产品名称 <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="请输入产品具体名称" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">计量单位</label>
                  <select className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">品牌</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.supplier_name} onChange={e => setFormData({ ...formData, supplier_name: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">市场价 (¥)</label>
                  <input required type="number" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.price_market} onChange={e => setFormData({ ...formData, price_market: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                    <span>{formData.price_rule === 'ratio' ? '返佣比例 (%)' : '会员底价 (¥)'}</span>
                    <button type="button" onClick={() => setFormData({ ...formData, price_rule: formData.price_rule === 'fixed' ? 'ratio' : 'fixed', price_member: '', comm_ratio: '' })} className="text-[10px] text-[#0058a3] underline">切换模式</button>
                  </label>
                  {formData.price_rule === 'fixed' ? (
                    <input required type="number" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold text-[#d00]" value={formData.price_member} onChange={e => setFormData({ ...formData, price_member: e.target.value })} />
                  ) : (
                    <input required type="number" placeholder="%" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold text-[#d00]" value={formData.comm_ratio} onChange={e => setFormData({ ...formData, comm_ratio: e.target.value })} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">品牌类型</label>
                  <select className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold" value={formData.brand_type} onChange={e => setFormData({ ...formData, brand_type: e.target.value })}>
                    <option value="company">自有品牌</option>
                    <option value="agent">代理品牌</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center text-xs font-bold text-[#111] cursor-pointer">
                    <input type="checkbox" className="mr-2" checked={formData.has_install_fee} onChange={e => setFormData({ ...formData, has_install_fee: e.target.checked })} />
                    包含安装人工费
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-2">
                <button type="button" onClick={(e) => { e.target.nextElementSibling.classList.toggle('hidden'); }} className="text-xs font-bold text-[#0058a3] w-full text-left mb-2 flex items-center justify-between">
                  <span>扩展信息 (材质/产地/年份等)</span> <ChevronRight className="w-3 h-3" />
                </button>
                <div className="hidden grid grid-cols-2 gap-3 mb-2 animate-in slide-in-from-top-1">
                  <input type="text" placeholder="材质" className="p-2 bg-gray-50 rounded text-xs" value={formData.material || ''} onChange={e => setFormData({ ...formData, material: e.target.value })} />
                  <input type="text" placeholder="产地" className="p-2 bg-gray-50 rounded text-xs" value={formData.origin || ''} onChange={e => setFormData({ ...formData, origin: e.target.value })} />
                  <input type="text" placeholder="设计师" className="p-2 bg-gray-50 rounded text-xs" value={formData.designer || ''} onChange={e => setFormData({ ...formData, designer: e.target.value })} />
                  <input type="text" placeholder="年份" className="p-2 bg-gray-50 rounded text-xs" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                  <input type="text" placeholder="规格" className="col-span-2 p-2 bg-gray-50 rounded text-xs" value={formData.specs || ''} onChange={e => setFormData({ ...formData, specs: e.target.value })} />
                  <textarea placeholder="安装要求/说明" className="col-span-2 p-2 bg-gray-50 rounded text-xs h-16" value={formData.install_req || ''} onChange={e => setFormData({ ...formData, install_req: e.target.value })}></textarea>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">产品主图</label>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <input type="text" className="w-full p-3 bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-500 truncate pr-8" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="图片链接" />
                    {formData.image && (
                      <button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <FileUploader onUpload={(url) => setFormData({ ...formData, image: url })} accept="image/*" />
                </div>

                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">产品附图 (最多5张)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input type="text" className="w-full p-2 bg-gray-50 border-none rounded text-xs font-bold truncate pr-8" placeholder={`附图 ${index + 1}`} value={(formData.images && formData.images[index]) || ''} onChange={(e) => {
                          const newImages = [...(formData.images || [])];
                          newImages[index] = e.target.value;
                          setFormData({ ...formData, images: newImages });
                        }} />
                        {formData.images && formData.images[index] && (
                          <button type="button" onClick={() => {
                            const newImages = [...(formData.images || [])];
                            newImages[index] = '';
                            setFormData({ ...formData, images: newImages });
                          }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <FileUploader onUpload={(url) => {
                        const newImages = [...(formData.images || [])];
                        newImages[index] = url;
                        setFormData({ ...formData, images: newImages });
                      }} accept="image/*" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-[#111] mb-3 flex items-center"><DownloadCloud className="w-4 h-4 mr-1 text-[#0058a3]" /> 资源上传 (可选)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">高清材质</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input type="text" className="w-full p-2 bg-gray-50 border-none rounded text-xs font-bold pr-8" value={formData.texture_url} onChange={e => setFormData({ ...formData, texture_url: e.target.value })} placeholder="URL" />
                        {formData.texture_url && (
                          <button type="button" onClick={() => setFormData({ ...formData, texture_url: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <FileUploader onUpload={(url) => setFormData({ ...formData, texture_url: url })} accept="image/*" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">3D模型</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input type="text" className="w-full p-2 bg-gray-50 border-none rounded text-xs font-bold pr-8" value={formData.model_url} onChange={e => setFormData({ ...formData, model_url: e.target.value })} placeholder="URL" />
                        {formData.model_url && (
                          <button type="button" onClick={() => setFormData({ ...formData, model_url: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <FileUploader onUpload={(url) => setFormData({ ...formData, model_url: url })} accept=".obj,.fbx,.3ds" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] transition-colors">{isSubmitting ? '...' : (editingId ? '保存修改' : '发布产品')}</button>
                {editingId && <button type="button" onClick={handleCancel} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition-colors">取消</button>}
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-white flex justify-between items-center">
            <h3 className="font-bold text-xl text-[#111]">已上架产品</h3>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{myProducts.length} 款</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">产品信息</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">资源状态</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">价格体系</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {myProducts.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${editingId === p.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      <img className="h-12 w-12 rounded-lg object-cover bg-gray-100 mr-4 border border-gray-200" src={p.image} alt={p.title} />
                      <div>
                        <div className="text-sm font-bold text-[#111]">{p.title}</div>
                        <div className="text-xs text-gray-500">{p.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {p.texture_url && <span className="px-2 py-1 bg-blue-100 text-[#0058a3] rounded text-[10px] font-bold">材质</span>}
                        {p.model_url && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">3D</span>}
                        {!p.texture_url && !p.model_url && <span className="text-xs text-gray-300 font-bold">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-400">市: <span className="line-through">¥{p.price_market}</span> / {p.unit || 'm²'}</div>
                      <div className="text-sm font-black text-[#d00]">VIP: ¥{p.price_member} / {p.unit || 'm²'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(p)} className="text-[#0058a3] hover:text-[#004f93] mr-4 p-2 hover:bg-blue-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => removeProduct(p.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
}

function AuthModal({ onClose, onLogin }) {
  const { categories } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({ phone: '', code: '', password: '', companyName: '', realName: '', selectedCategory: '', wechatId: '', qrCode: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = () => {
    if (!formData.phone) { setErrorMsg('请输入手机号'); return; }
    setErrorMsg('');
    setCountdown(60);
    setTimeout(() => { setVerificationCode('123456'); }, 400);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const checkUserExists = async (phone) => {
    const q = query(collection(db, 'user_accounts'), where('phone', '==', phone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { exists: true, data: { id: snap.docs[0].id, ...snap.docs[0].data() } };
    }
    return { exists: false };
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.phone || !formData.password) { setErrorMsg('请输入账号/手机号和密码'); return; }
    setIsSubmitting(true);
    try {
      // --- Special Backdoor for Admin Init ---
      if (formData.phone === 'admin' && formData.password === 'admin888') {
        const adminQ = query(collection(db, 'user_accounts'), where('role', '==', 'admin'));
        const adminSnap = await getDocs(adminQ);
        let adminUser = null;

        if (adminSnap.empty) {
          // Create default admin
          const newAdmin = {
            phone: 'admin',
            password: 'admin888',
            role: 'admin',
            realName: 'Administrator',
            companyName: 'System',
            isDisabled: false,
            status: 'active',
            createdAt: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'user_accounts'), newAdmin);
          adminUser = { id: docRef.id, ...newAdmin };
          alert('系统管理员账号已自动初始化！');
        } else {
          // Ensure permissions
          const docRef = adminSnap.docs[0].ref;
          await updateDoc(docRef, { isDisabled: false, status: 'active' });
          adminUser = { id: adminSnap.docs[0].id, ...adminSnap.docs[0].data() };
        }
        onLogin('admin', adminUser);
        setIsSubmitting(false);
        return;
      }
      // ----------------------------------------

      const userCheck = await checkUserExists(formData.phone);
      if (!userCheck.exists) { setErrorMsg('该手机号未注册'); setIsSubmitting(false); return; }

      // Strict check for pending or disabled status
      if (userCheck.data.status === 'pending') {
        setErrorMsg('账号正在审核中，请耐心等待');
        setIsSubmitting(false);
        return;
      }
      if (userCheck.data.isDisabled) {
        setErrorMsg('该账号已被禁用，请联系管理员');
        setIsSubmitting(false);
        return;
      }

      if (userCheck.data.password !== formData.password) { setErrorMsg('密码错误'); setIsSubmitting(false); return; }
      onLogin(userCheck.data.role, userCheck.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('登录失败');
    }
    setIsSubmitting(false);
  };

  const handleRegisterSubmit = async (role) => {
    setErrorMsg('');
    if (!formData.phone || !formData.password) { setErrorMsg('请填写完整信息'); return; }
    if (role === 'supplier' && !formData.selectedCategory) { setErrorMsg('请选择主营品类'); return; }

    setIsSubmitting(true);

    try {
      const userCheck = await checkUserExists(formData.phone);
      if (userCheck.exists) { setErrorMsg('该手机号已注册'); setIsSubmitting(false); return; }

      const newUserData = {
        phone: formData.phone,
        password: formData.password,
        role,
        realName: formData.realName || '',
        companyName: formData.companyName || '',
        category: formData.selectedCategory || '',
        isDisabled: true, // 需审核
        status: 'pending',
        wechatId: formData.wechatId || '',
        qrCode: formData.qrCode || '',
        createdAt: new Date() // Use client date for preview, serverTimestamp for DB
      };

      await addDoc(collection(db, 'user_accounts'), { ...newUserData, createdAt: serverTimestamp() });
      alert('注册成功！请等待管理员审核通过。');
      onClose();
    } catch (e) {
      console.error("Registration Error:", e);
      // Translate common Firebase errors
      if (e.code === 'permission-denied') {
        setErrorMsg('注册失败：没有权限写入数据库。请检查Firebase规则。');
      } else {
        setErrorMsg('注册失败：' + (e.message || '未知错误'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const { seedData } = useContext(DataContext);
  const handleResetData = async () => {
    if (confirm('确定要重置所有测试数据吗？（这将在数据库中写入演示数据）')) {
      // Call global seedData
      await seedData('products');
      await seedData('requests');
      alert('演示数据已写入');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-gray-100 rounded-full p-1"><X className="w-5 h-5" /></button>

        <div className="flex border-b border-gray-100">
          {['login', 'register_designer', 'register_supplier'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setErrorMsg(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === tab ? 'text-[#0058a3] border-b-2 border-[#0058a3]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab === 'login' ? '登录' : tab === 'register_designer' ? '设计师注册' : '供应商入驻'}
            </button>
          ))}
        </div>

        <div className="p-8 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-600 text-xs font-bold">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />{errorMsg}
            </div>
          )}

          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">账号/手机号</label>
                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm font-bold" placeholder="admin 或 手机号" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">密码</label>
                <input type="password" className="w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="密码" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] disabled:opacity-50 mt-4">安全登录</button>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <button type="button" onClick={handleResetData} className="flex items-center hover:text-red-500"><RefreshCw className="w-3 h-3 mr-1" /> 重置测试数据</button>
                <span>v3.0 合并版</span>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500">
                <p className="font-bold mb-1">测试账号:</p>
                <div className="flex justify-between"><span>管理员:</span> <span className="font-mono text-black">admin / admin888</span></div>
                <div className="flex justify-between"><span>设计师:</span> <span className="font-mono text-black">13800000001 / 123456</span></div>
                <div className="flex justify-between"><span>供应商:</span> <span className="font-mono text-black">13800000002 / 123456</span></div>
              </div>
            </form>
          )}

          {activeTab === 'register_supplier' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">企业全称</label>
                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">主营品类 (注册后可在管理员后台修改)</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg text-sm font-bold text-[#0058a3]" value={formData.selectedCategory} onChange={e => setFormData({ ...formData, selectedCategory: e.target.value })}>
                  <option value="">请选择主营品类...</option>
                  {categories.flatMap(parent => [
                    <option key={parent.id} value={parent.name} disabled className="font-bold bg-gray-100 text-gray-500">◆ {parent.name}</option>,
                    ...(parent.children || []).map(child => (
                      <option key={child.id} value={child.name}>&nbsp;&nbsp;&nbsp;&nbsp;{child.name}</option>
                    ))
                  ])}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">手机号码</label>
                <input type="tel" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">微信号 (用于客户联系)</label>
                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.wechatId} onChange={e => setFormData({ ...formData, wechatId: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">微信二维码 (用于客户扫码)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" readOnly className="w-full p-3 border border-gray-300 rounded-lg text-sm truncate pr-8" placeholder="上传后生成链接" value={formData.qrCode || ''} />
                    {formData.qrCode && (
                      <button type="button" onClick={() => setFormData({ ...formData, qrCode: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <FileUploader onUpload={(url) => setFormData({ ...formData, qrCode: url })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">验证码</label>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 p-3 border border-gray-300 rounded-lg text-sm" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                  <button type="button" onClick={handleSendCode} disabled={countdown > 0} className="w-32 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50">{countdown > 0 ? `${countdown}s` : '获取验证码'}</button>
                </div>
                {verificationCode && <p className="text-xs text-green-600 font-bold">验证码: {verificationCode}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">设置密码</label>
                <input type="password" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <button onClick={() => handleRegisterSubmit('supplier')} disabled={isSubmitting} className="w-full py-3 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] mt-2">提交入驻申请</button>
            </div>
          )}

          {activeTab === 'register_designer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">真实姓名</label>
                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.realName} onChange={e => setFormData({ ...formData, realName: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">手机号码</label>
                <input type="tel" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">验证码</label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <button onClick={handleSendCode} disabled={countdown > 0} className="w-32 mt-5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50">{countdown > 0 ? `${countdown}s` : '获取验证码'}</button>
              </div>
              {verificationCode && <p className="text-xs text-green-600 font-bold">验证码: {verificationCode}</p>}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">设置密码</label>
                <input type="password" className="w-full p-3 border border-gray-300 rounded-lg text-sm" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <button onClick={() => handleRegisterSubmit('designer_normal')} disabled={isSubmitting} className="w-full py-3 bg-[#0058a3] text-white rounded-full font-bold hover:bg-[#004f93] mt-2">立即注册</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Parsing helper
const parseDate = (d) => {
  if (!d) return new Date();
  if (d.seconds) return new Date(d.seconds * 1000); // Firestore timestamp
  return new Date(d); // String or Date object
};

function SourcingPostForm({ onClose }) {
  const { createSourcingPost, categories } = useContext(DataContext);
  const { userProfile } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: '', category: '', description: '', images: ['', '', ''], special_req: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flatten categories for selection
  const getCategoryOptions = () => {
    let options = [];
    categories.forEach(cat => {
      if (cat.children) {
        cat.children.forEach(sub => options.push(sub.name)); // Assuming 2 levels
      } else {
        options.push(cat.name);
      }
    });
    return options;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category) return alert('请填写完整信息');

    setIsSubmitting(true);
    try {
      await createSourcingPost({
        ...formData,
        images: formData.images.filter(img => img), // Remove empty strings
        author_name: userProfile?.realName || userProfile?.companyName || userProfile?.phone,
        author_role: userProfile?.role
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('发布失败，请重试');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-black text-[#111]">发布寻品需求</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">需求标题 <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#111]"
                placeholder="例如：急需一款意式极简真皮沙发"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">产品分类 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm font-bold appearance-none"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">请选择分类...</option>
                    {categories.map(group => (
                      <optgroup key={group.id} label={group.name}>
                        {group.children?.map(child => (
                          <option key={child.id} value={child.name}>{child.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                {/* Placeholder for future field */}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">详细描述</label>
              <textarea
                className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm font-medium h-32 focus:ring-2 focus:ring-[#111]"
                placeholder="描述您需要寻找的产品的具体特征、材质要求、预算范围等..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">参考图片 (最多3张)</label>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(index => (
                  <div key={index} className="space-y-2">
                    <div className="relative aspect-square bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group hover:border-[#0058a3] transition-colors">
                      {formData.images[index] ? (
                        <>
                          <img src={formData.images[index]} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            const newImages = [...formData.images];
                            newImages[index] = '';
                            setFormData({ ...formData, images: newImages });
                          }} className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <FileUploader
                          className="w-full h-full justify-center"
                          onUpload={(url) => {
                            const newImages = [...formData.images];
                            newImages[index] = url;
                            setFormData({ ...formData, images: newImages });
                          }}
                        >
                          <div className="text-center p-2">
                            <ImagePlus className="w-6 h-6 text-gray-300 mx-auto mb-1 group-hover:text-[#0058a3] transition-colors" />
                            <span className="text-[10px] text-gray-400 font-bold group-hover:text-[#0058a3] transition-colors">点击上传</span>
                          </div>
                        </FileUploader>
                      )}
                    </div>
                    {/* Fallback URL input */}
                    <input
                      type="text"
                      className="w-full p-2 bg-gray-50 border-none rounded text-[10px]"
                      placeholder="或输入图片URL"
                      value={formData.images[index]}
                      onChange={e => {
                        const newImages = [...formData.images];
                        newImages[index] = e.target.value;
                        setFormData({ ...formData, images: newImages });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">特殊要求 (可选)</label>
              <div className="flex items-center bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  className="w-full bg-transparent border-none text-sm font-bold text-yellow-800 placeholder-yellow-800/50 focus:ring-0"
                  placeholder="例如：必须要现货，工期紧..."
                  value={formData.special_req}
                  onChange={e => setFormData({ ...formData, special_req: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200">取消</button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-[#111] text-white rounded-full font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 disabled:opacity-50">
                {isSubmitting ? '发布中...' : '立即发布需求'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}







function SourcingPostDetail({ post, onClose }) {
  const { user, userProfile } = useContext(AuthContext);
  const { sourcingComments, addSourcingComment, deleteSourcingComment } = useContext(DataContext);

  const comments = sourcingComments.filter(c => c.post_id === post.id);
  const [replyContent, setReplyContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSendComment = () => {
    if (!replyContent.trim()) return;
    if (!user) return alert('请先登录');

    addSourcingComment({
      post_id: post.id,
      content: replyContent,
      is_private: isPrivate, // Private logic: Only author and commenter can see
      author_name: userProfile?.realName || userProfile?.companyName || userProfile?.phone,
      author_role: userProfile?.role,
      target_id: post.designer_id // For notifications later
    });
    setReplyContent('');
  };

  // Visibility Logic:
  // 1. Public comments: Visible to everyone
  // 2. Private comments: Visible only to Post Author AND Comment Author
  const visibleComments = comments.filter(c => {
    if (!c.is_private) return true;
    const myId = userProfile?.phone || user?.uid;
    return myId === c.author_id || myId === post.designer_id;
  });

  const handleDeleteComment = (id) => {
    if (confirm('确定要删除这条评论吗？')) {
      deleteSourcingComment(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>

        {/* Top: Info Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full">{post.category || '综合需求'}</span>
            <span className="text-sm font-bold text-gray-500">{parseDate(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 className="text-2xl font-black text-[#111] mb-4">{post.title}</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {(post.images || []).map((img, i) => (
              <img key={i} src={img} onClick={() => window.open(img)} className="w-24 h-24 object-cover rounded-xl cursor-zoom-in border border-gray-200 hover:shadow-lg transition-all" />
            ))}
          </div>
          <div className="text-gray-700 font-medium leading-relaxed mb-6 whitespace-pre-wrap">{post.description}</div>
          {post.special_req && (
            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl text-sm text-yellow-800 font-bold mb-6">
              💡 特殊要求: {post.special_req}
            </div>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
            <div className="text-sm">
              <p className="font-bold text-[#111]">{post.author_name}</p>
              <p className="text-xs text-gray-400">发布于 {post.author_role === 'designer' ? '设计师端' : '客户端'}</p>
            </div>
          </div>
        </div>

        {/* Bottom: Comments Area (Fixed Height or Flex) */}
        <div className="bg-white border-t border-gray-100 flex flex-col h-[400px]">
          <div className="p-4 border-b border-gray-50 font-bold text-[#111] bg-white sticky top-0 z-10 shadow-sm flex items-center justify-between">
            <span>互助讨论区 ({visibleComments.length})</span>
            <span className="text-[10px] text-gray-400 font-normal">友好交流，互帮互助</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {visibleComments.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center">
                <MessageCircle className="w-8 h-8 mb-2 opacity-20" />
                <span>暂无留言，快来提供线索~</span>
              </div>
            ) : visibleComments.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl group ${c.is_private ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111]">{c.author_name}</span>
                    {c.author_role === 'supplier' && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold">商家</span>}
                    {c.author_role.startsWith('designer') && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">设计师</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{parseDate(c.createdAt).toLocaleString()}</span>
                    {(userProfile?.phone === c.author_id || userProfile?.uid === c.author_id) && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                {c.is_private && <div className="mt-2 text-[10px] text-blue-500 font-bold flex items-center bg-blue-100/50 w-fit px-2 py-1 rounded-full"><Lock className="w-3 h-3 mr-1" /> 悄悄话</div>}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-xs font-bold text-gray-500 flex items-center cursor-pointer select-none hover:text-[#0058a3] transition-colors">
                <input type="checkbox" className="mr-2 rounded text-[#111] focus:ring-0" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                <Lock className="w-3 h-3 mr-1" /> 仅作为私密回复 (作者可见)
              </label>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                  placeholder="提供产品线索或建议..."
                  className="w-full p-4 pr-12 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#111] shadow-sm"
                />
              </div>
              <button
                onClick={handleSendComment}
                className="px-6 bg-[#111] text-white rounded-2xl font-bold text-sm hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all flex items-center"
              >
                <Send className="w-4 h-4 mr-1" /> 发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SourcingView() {
  const { user, userProfile } = useContext(AuthContext);
  const { sourcingPosts, sourcingComments, createSourcingPost, addSourcingComment } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState('hall'); // hall, my_posts
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Filter posts
  const displayPosts = activeTab === 'my_posts'
    ? sourcingPosts.filter(p => p.designer_id === (userProfile?.phone || user?.uid))
    : sourcingPosts; // Show all in hall





  // Main Render
  return (
    <div className="max-w-6xl mx-auto min-h-[600px]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black">寻品大厅</h2>
        {userProfile?.role.startsWith('designer') && (
          <button onClick={() => setShowPostForm(true)} className="px-6 py-3 bg-[#111] text-white rounded-full font-bold shadow-lg flex items-center hover:bg-gray-800 transition-all">
            <Plus className="w-5 h-5 mr-2" /> 发布新需求
          </button>
        )}
      </div>

      {/* Tabs */}
      {userProfile?.role.startsWith('designer') && (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-full w-fit mb-6">
          <button onClick={() => setActiveTab('hall')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'hall' ? 'bg-white shadow text-[#111]' : 'text-gray-500 hover:text-gray-700'}`}>全部需求</button>
          <button onClick={() => setActiveTab('my_posts')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'my_posts' ? 'bg-white shadow text-[#111]' : 'text-gray-500 hover:text-gray-700'}`}>我的发布 [{sourcingPosts.filter(p => p.designer_id === userProfile.phone).length}]</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayPosts.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">暂无寻品需求，快来发布吧！</p>
          </div>
        ) : displayPosts.map(post => (
          <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{post.category || '其他'}</span>
              <span className="text-[10px] text-gray-400 font-bold">{parseDate(post.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 className="text-lg font-black text-[#111] mb-2 line-clamp-1 group-hover:text-[#0058a3] transition-colors">{post.title}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{post.description}</p>

            {/* Thumbnail Grid */}
            <div className="flex gap-2 mb-4 h-16">
              {(post.images || []).slice(0, 3).map((img, i) => (
                <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover bg-gray-100 border border-gray-100" />
              ))}
              {(post.images || []).length === 0 && <div className="w-full h-16 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-gray-300 font-bold">无图</div>}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">{post.author_name?.[0]}</div>
                <span className="text-xs font-bold text-gray-500 truncate max-w-[80px]">{post.author_name}</span>
              </div>
              <div className="flex items-center text-xs font-bold text-gray-400">
                <MessageCircle className="w-3 h-3 mr-1" /> {sourcingComments.filter(c => c.post_id === post.id).length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showPostForm && <SourcingPostForm onClose={() => setShowPostForm(false)} />}
      {selectedPost && <SourcingPostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
}
