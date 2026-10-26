import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, Zap, Shield, User as UserIcon, LogOut, Plus, Search, 
  CheckCircle, AlertTriangle, Clock, DollarSign, LayoutGrid, 
  Settings, Users, History, ArrowRight, X, RefreshCw, Lock, Sparkles, MapPin, Phone, Award, Star,
  TrendingUp, BarChart3, FileSpreadsheet, PieChart, Wallet, QrCode, CreditCard, ArrowDownRight, ArrowUpRight,
  Palette, Image as ImageIcon
} from 'lucide-react';
import { 
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, getDocs 
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { db, auth } from './firebase';

type UserRole = 'admin' | 'staff' | 'customer';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  loyaltyPoints?: number;
  membershipTier?: 'regular' | 'vip';
  walletBalance?: number;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  createdAt?: string;
  bgTheme?: string;
  bgCustomUrl?: string;
}

type SlotType = 'car_standard' | 'car_vip' | 'motorbike' | 'electric';
type SlotStatus = 'available' | 'occupied';

interface ParkingSlot {
  id: string;
  slotNumber: string;
  zoneId: string;
  zoneName: string;
  type: SlotType;
  status: SlotStatus;
  currentTicketId?: string;
}

interface ParkingTicket {
  id: string;
  slotId: string;
  slotNumber: string;
  licensePlate: string;
  vehicleType: 'car' | 'suv' | 'sedan' | 'motorbike' | 'electric';
  isVip: boolean;
  customerName: string;
  phoneNumber: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'active' | 'completed';
  fee?: number;
  paymentMethod?: 'cash' | 'transfer' | 'wallet';
  paymentStatus?: 'unpaid' | 'pending_approval' | 'paid' | 'rejected';
  pointsEarned?: number;
  staffId?: string;
  requestedAt?: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'topup' | 'payment';
  amount: number;
  description: string;
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

const BG_THEMES = [
  {
    id: 'cyber-dark',
    name: 'Bãi Đỗ Xe Cyber Midnight',
    sub: 'Bãi đỗ xe ngầm hiện đại Đêm Cyber huyền ảo',
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'neon-city',
    name: 'Thành Phố Đêm & Bãi Đỗ Tầng',
    sub: 'Tòa nhà đỗ xe cao tầng đô thị rực rỡ ánh đèn neon tím',
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  {
    id: 'aurora-emerald',
    name: 'Bãi Đỗ Xe Thông Minh Đô Thị',
    sub: 'Kiến trúc bãi đỗ xe hiện đại phong cách ngọc lục bảo',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
  },
  {
    id: 'sunset-drive',
    name: 'Bãi Đỗ Xe Hoàng Hôn Sunset',
    sub: 'Bãi đỗ xe sân thượng ngoài trời đón hoàng hôn rực rỡ',
    imageUrl: '/assets/aistudio/sunset_parking.jpg',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'tech-matrix',
    name: 'Trạm Sạc & Bãi Xe Điện EV',
    sub: 'Bãi đỗ xe điện công nghệ cao tích hợp trụ sạc EV',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'vip-luxury',
    name: 'Bãi Đỗ Xe Hoàng Gia VIP',
    sub: 'Khu đỗ xe ô tô hạng sang phủ ánh sáng vàng VIP 5 sao',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1920&auto=format&fit=crop',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'custom',
    name: 'Ảnh Nền Tùy Chọn (Custom URL)',
    sub: 'Tự nhập đường dẫn URL hình ảnh phông nền theo sở thích riêng',
    imageUrl: '',
    badge: 'bg-slate-800 text-slate-300 border-slate-700'
  }
];

const INITIAL_SLOTS: Omit<ParkingSlot, 'id'>[] = [
  // Zone A: Standard Cars (A01 - A08)
  { slotNumber: 'A01', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A02', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A03', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A04', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A05', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A06', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A07', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  { slotNumber: 'A08', zoneId: 'zone_a', zoneName: 'Khu Ô tô Thường (Zone A)', type: 'car_standard', status: 'available' },
  
  // Zone B: VIP Cars (B01 - B04)
  { slotNumber: 'B01', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B02', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B03', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },
  { slotNumber: 'B04', zoneId: 'zone_b', zoneName: 'Khu Ô tô VIP (Zone B)', type: 'car_vip', status: 'available' },

  // Zone C: Motorbikes (C01 - C10)
  { slotNumber: 'C01', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C02', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C03', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C04', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C05', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C06', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C07', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },
  { slotNumber: 'C08', zoneId: 'zone_c', zoneName: 'Khu Xe máy (Zone C)', type: 'motorbike', status: 'available' },

  // Zone D: Electric Vehicles (D01 - D06)
  { slotNumber: 'D01', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D02', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D03', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
  { slotNumber: 'D04', zoneId: 'zone_d', zoneName: 'Khu Xe điện & Sạc (Zone D)', type: 'electric', status: 'available' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'tickets' | 'staff' | 'settings' | 'users' | 'analytics' | 'pending_approvals'>('map');
  const [reportPeriod, setReportPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [authError, setAuthError] = useState<string>('');

  // Modals for Check-In / Parking
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [selectedSlotForCheckIn, setSelectedSlotForCheckIn] = useState<ParkingSlot | null>(null);
  const [checkInPlate, setCheckInPlate] = useState<string>('');
  const [checkInVehicleType, setCheckInVehicleType] = useState<'car' | 'suv' | 'sedan' | 'motorbike' | 'electric'>('car');
  const [checkInIsVip, setCheckInIsVip] = useState<boolean>(false);
  const [checkInCustomerName, setCheckInCustomerName] = useState<string>('');
  const [checkInPhone, setCheckInPhone] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const [showCheckOutModal, setShowCheckOutModal] = useState<boolean>(false);
  const [selectedTicketForCheckOut, setSelectedTicketForCheckOut] = useState<ParkingTicket | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'transfer' | 'wallet'>('wallet');

  // Wallet and Top-Up States
  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(100000);
  const [customTopUpInput, setCustomTopUpInput] = useState<string>('');
  const [topUpTargetUser, setTopUpTargetUser] = useState<UserProfile | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWalletHistoryModal, setShowWalletHistoryModal] = useState<boolean>(false);

  const [showQuickCheckOutListModal, setShowQuickCheckOutListModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editBirthDate, setEditBirthDate] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('Nam');

  // Background Theme States
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [selectedBgTheme, setSelectedBgTheme] = useState<string>('cyber-dark');
  const [customBgUrlInput, setCustomBgUrlInput] = useState<string>('');

  const handleSaveBgTheme = async (themeId: string, customUrl: string = customBgUrlInput) => {
    if (!currentUser) return;
    try {
      const updated: UserProfile = {
        ...currentUser,
        bgTheme: themeId,
        bgCustomUrl: customUrl
      };
      setCurrentUser(updated);
      localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      await setDoc(doc(db, 'users', currentUser.uid), { bgTheme: themeId, bgCustomUrl: customUrl }, { merge: true });
      setShowThemeModal(false);
      showToast('success', 'Đã lưu phông nền giao diện tài khoản thành công!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi lưu phông nền.');
    }
  };

  const [showEditSlotModal, setShowEditSlotModal] = useState<boolean>(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<ParkingSlot | null>(null);
  const [editSlotNumber, setEditSlotNumber] = useState<string>('');
  const [editSlotType, setEditSlotType] = useState<SlotType>('car_standard');

  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [showManageUsersModal, setShowManageUsersModal] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [uName, setUName] = useState<string>('');
  const [uEmail, setUEmail] = useState<string>('');
  const [uRole, setURole] = useState<UserRole>('customer');
  const [uTier, setUTier] = useState<'regular' | 'vip'>('regular');
  const [uPoints, setUPoints] = useState<number>(0);
  const [uPhone, setUPhone] = useState<string>('');
  const [uAddress, setUAddress] = useState<string>('');
  const [uGender, setUGender] = useState<string>('Nam');

  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [addName, setAddName] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('');
  const [addRole, setAddRole] = useState<UserRole>('customer');
  const [addTier, setAddTier] = useState<'regular' | 'vip'>('regular');
  const [addPoints, setAddPoints] = useState<number>(0);
  const [addPhone, setAddPhone] = useState<string>('');
  const [addAddress, setAddAddress] = useState<string>('');

  const [authTab, setAuthTab] = useState<'quick' | 'register'>('quick');
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!regName || !regEmail || !regPassword) {
      setAuthError('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let exists = false;
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile & { password?: string };
        if (u.email && u.email.toLowerCase() === regEmail.toLowerCase()) {
          exists = true;
        }
      });

      if (exists) {
        setAuthError('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.');
        return;
      }

      const uid = `user_${Date.now()}`;
      const newProfile = {
        uid,
        email: regEmail,
        password: regPassword,
        name: regName,
        role: 'customer' as UserRole,
        membershipTier: 'regular' as const,
        loyaltyPoints: 0,
        phoneNumber: regPhone,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', uid), newProfile);
      setCurrentUser(newProfile);
      localStorage.setItem('smart_parking_user', JSON.stringify(newProfile));
      showToast('success', 'Đăng ký tài khoản và đăng nhập thành công!');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Lỗi khi đăng ký tài khoản.');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as UserProfile);
          } else {
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: 'Nguyễn Văn An',
              role: firebaseUser.email === 'phuocyahoo1309@gmail.com' ? 'admin' : 'customer',
              loyaltyPoints: 0,
              membershipTier: 'regular',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, defaultProfile);
            setCurrentUser(defaultProfile);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        const savedUser = localStorage.getItem('smart_parking_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    return errInfo;
  };

  useEffect(() => {
    // Attach snapshot listeners unconditionally for real-time parking data
    const slotsQuery = query(collection(db, 'slots'));
    const unsubSlots = onSnapshot(slotsQuery, (snapshot) => {
      const loadedSlots: ParkingSlot[] = [];
      snapshot.forEach((docSnap) => {
        loadedSlots.push({ id: docSnap.id, ...docSnap.data() } as ParkingSlot);
      });

      if (loadedSlots.length === 0) {
        const seedSlots: ParkingSlot[] = INITIAL_SLOTS.map((s, idx) => ({
          ...s,
          id: `slot_${idx + 1}`
        }));
        setSlots(seedSlots);
        seedSlots.forEach(async (slotData) => {
          try {
            await setDoc(doc(db, 'slots', slotData.id), slotData);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `slots/${slotData.id}`);
          }
        });
      } else {
        setSlots(loadedSlots);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'slots');
      const fallbackSlots: ParkingSlot[] = INITIAL_SLOTS.map((s, idx) => ({
        ...s,
        id: `slot_${idx + 1}`
      }));
      setSlots(fallbackSlots);
    });

    const ticketsQuery = query(collection(db, 'tickets'));
    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const loadedTickets: ParkingTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ParkingTicket;
        const status = data.checkOutTime ? 'completed' : 'active';
        loadedTickets.push({ ...data, id: docSnap.id, status });
      });
      // Sort in-memory to prevent Firestore index permission errors
      loadedTickets.sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime());
      setTickets(loadedTickets);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tickets');
    });

    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        const uid = docSnap.id || data.uid;
        const rawEmail = (data.email || '').trim();
        const rawName = (data.name || '').trim();

        const cleanUser: UserProfile = {
          uid,
          email: rawEmail || (uid === 'admin_default' ? 'admin@parking.vn' : uid === 'staff_default' ? 'staff@parking.vn' : 'user@parking.vn'),
          name: rawName || (uid === 'admin_default' || rawEmail === 'admin@parking.vn' ? 'Quản trị viên (Admin)' : uid === 'staff_default' || rawEmail === 'staff@parking.vn' ? 'Nhân viên bãi đỗ' : rawEmail ? rawEmail.split('@')[0] : 'Khách hàng'),
          role: data.role || (uid === 'admin_default' || rawEmail === 'admin@parking.vn' ? 'admin' : uid === 'staff_default' || rawEmail === 'staff@parking.vn' ? 'staff' : 'customer'),
          membershipTier: data.membershipTier || 'regular',
          loyaltyPoints: typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : 0,
          walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 200000,
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          gender: data.gender || 'Nam',
          birthDate: data.birthDate || '',
          createdAt: data.createdAt || new Date().toISOString()
        };

        loadedUsers.push(cleanUser);
      });

      const uniqueUsers: UserProfile[] = [];
      const seen = new Set<string>();
      for (const u of loadedUsers) {
        const key = u.email.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(u);
        }
      }

      setUsersList(uniqueUsers);

      if (currentUser) {
        const me = uniqueUsers.find(u => u.uid === currentUser.uid || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (me) {
          setCurrentUser(prev => prev ? {
            ...prev,
            name: me.name || prev.name,
            walletBalance: me.walletBalance ?? prev.walletBalance ?? 200000,
            loyaltyPoints: me.loyaltyPoints ?? prev.loyaltyPoints ?? 0,
            membershipTier: me.membershipTier || prev.membershipTier
          } : me);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const transQuery = query(collection(db, 'wallet_transactions'));
    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      const loadedTrans: WalletTransaction[] = [];
      snapshot.forEach((docSnap) => {
        loadedTrans.push({ id: docSnap.id, ...docSnap.data() } as WalletTransaction);
      });
      // Sort in-memory to prevent Firestore index permission errors
      loadedTrans.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setWalletTransactions(loadedTrans);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'wallet_transactions');
    });

    return () => {
      unsubSlots();
      unsubTickets();
      unsubUsers();
      unsubTrans();
    };
  }, [currentUser?.uid]);

  const handleOpenEditUser = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setUName(user.name);
    setUEmail(user.email);
    setURole(user.role);
    setUTier(user.membershipTier || 'regular');
    setUPoints(user.loyaltyPoints || 0);
    setUPhone(user.phoneNumber || '');
    setUAddress(user.address || '');
    setUGender(user.gender || 'Nam');
    setShowManageUsersModal(true);
  };

  const handleSaveManagedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      const userRef = doc(db, 'users', selectedUserForEdit.uid);
      const updatedData = {
        name: uName,
        role: uRole,
        membershipTier: uTier,
        loyaltyPoints: Number(uPoints) || 0,
        phoneNumber: uPhone,
        address: uAddress,
        gender: uGender,
      };
      await updateDoc(userRef, updatedData);
      showToast('success', `Đã cập nhật hồ sơ người dùng ${uName} thành công!`);
      if (currentUser?.uid === selectedUserForEdit.uid) {
        setCurrentUser({ ...currentUser, ...updatedData });
      }
      setShowManageUsersModal(false);
      setSelectedUserForEdit(null);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi cập nhật hồ sơ người dùng.');
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEmail || !addPassword) {
      showToast('error', 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let exists = false;
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.email && u.email.toLowerCase() === addEmail.toLowerCase()) {
          exists = true;
        }
      });

      if (exists) {
        showToast('error', 'Email này đã tồn tại trên hệ thống!');
        return;
      }

      const newUid = `user_${Date.now()}`;
      const newProfile = {
        uid: newUid,
        name: addName,
        email: addEmail,
        password: addPassword,
        role: addRole,
        membershipTier: addRole === 'customer' ? addTier : 'regular',
        loyaltyPoints: addRole === 'customer' ? Number(addPoints) || 0 : 0,
        phoneNumber: addPhone,
        address: addAddress,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', newUid), newProfile);
      showToast('success', `Đã thêm tài khoản ${addName} (${addRole.toUpperCase()}) thành công!`);
      setShowAddUserModal(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddRole('customer');
      setAddTier('regular');
      setAddPoints(0);
      setAddPhone('');
      setAddAddress('');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi thêm tài khoản mới.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !userToDelete.uid) {
      showToast('error', 'Lỗi: Không tìm thấy ID tài khoản.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      showToast('success', `Đã xóa tài khoản ${userToDelete.name} thành công!`);
      setUserToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi xóa tài khoản: ' + (err.message || 'Lỗi hệ thống.'));
    }
  };

  const handleResetSlots = async () => {
    try {
      for (const [idx, slotData] of INITIAL_SLOTS.entries()) {
        const slotId = `slot_${idx + 1}`;
        await setDoc(doc(db, 'slots', slotId), { ...slotData, id: slotId, status: 'available', currentTicketId: null });
      }
      showToast('success', 'Đã đặt lại tất cả ô đỗ về trạng thái TRỐNG thành công!');
    } catch (err) {
      showToast('error', 'Lỗi khi reset ô đỗ.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setCurrentUser(profile);
        localStorage.setItem('smart_parking_user', JSON.stringify(profile));
        showToast('success', `Đăng nhập Google thành công!`);
      } else {
        const userEmail = user.email || 'user@gmail.com';
        const profile: UserProfile = {
          uid: user.uid,
          email: userEmail,
          name: user.displayName || userEmail.split('@')[0],
          role: 'customer',
          loyaltyPoints: 0,
          membershipTier: 'regular',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, profile);
        setCurrentUser(profile);
        localStorage.setItem('smart_parking_user', JSON.stringify(profile));
        showToast('success', `Đăng nhập Google thành công với quyền Khách hàng!`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Lỗi đăng nhập Google');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginEmail || !loginPassword) {
      setAuthError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    try {
      const emailLower = loginEmail.trim().toLowerCase();
      const passwordClean = loginPassword.trim();

      // Check default admin
      if (emailLower === 'admin@parking.vn') {
        if (passwordClean === 'admin123456') {
          const adminProfile: UserProfile = {
            uid: 'admin_default',
            email: 'admin@parking.vn',
            name: 'Quản trị viên (Admin)',
            role: 'admin',
            membershipTier: 'regular',
            loyaltyPoints: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'users', 'admin_default'), { ...adminProfile, password: 'admin123456' }, { merge: true });
          } catch (e) {
            console.warn('Sync default admin warn:', e);
          }
          setCurrentUser(adminProfile);
          localStorage.setItem('smart_parking_user', JSON.stringify(adminProfile));
          showToast('success', 'Đăng nhập Admin thành công!');
          return;
        } else {
          setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
          return;
        }
      }

      // Check default staff
      if (emailLower === 'staff@parking.vn') {
        if (passwordClean === 'staff123456') {
          const staffProfile: UserProfile = {
            uid: 'staff_default',
            email: 'staff@parking.vn',
            name: 'Nhân viên bãi đỗ',
            role: 'staff',
            membershipTier: 'regular',
            loyaltyPoints: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'users', 'staff_default'), { ...staffProfile, password: 'staff123456' }, { merge: true });
          } catch (e) {
            console.warn('Sync default staff warn:', e);
          }
          setCurrentUser(staffProfile);
          localStorage.setItem('smart_parking_user', JSON.stringify(staffProfile));
          showToast('success', 'Đăng nhập Nhân viên thành công!');
          return;
        } else {
          setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
          return;
        }
      }

      // Query Firestore users collection
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      let foundUser: (UserProfile & { password?: string }) | null = null;
      for (const docSnap of querySnapshot.docs) {
        const u = docSnap.data() as UserProfile & { password?: string };
        if (u.email && u.email.trim().toLowerCase() === emailLower) {
          foundUser = u;
          break;
        }
      }

      if (!foundUser) {
        setAuthError('Tài khoản chưa được đăng ký');
        return;
      }

      const validUser: UserProfile & { password?: string } = foundUser;

      if (validUser.password && validUser.password.trim() !== passwordClean) {
        setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
        return;
      }

      setCurrentUser(validUser);
      localStorage.setItem('smart_parking_user', JSON.stringify(validUser));
      showToast('success', 'Đăng nhập thành công!');
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('Thông tin tài khoản hoặc mật khẩu không đúng');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('smart_parking_user');
    setCurrentUser(null);
    showToast('success', 'Đăng xuất.');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const updated: UserProfile = {
        ...currentUser,
        name: editName || currentUser.name,
        phoneNumber: editPhone,
        address: editAddress,
        birthDate: editBirthDate,
        gender: editGender
      };
      setCurrentUser(updated);
      localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      setShowEditProfileModal(false);
      showToast('success', 'Cập nhật hồ sơ thành công!');
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật hồ sơ.');
    }
  };

  // VIETNAMESE LICENSE PLATE VALIDATION (Thông tư 79/2024/TT-BCA & Thông tư 81/2024/TT-BCA)
  const validateVietnameseLicensePlate = (plate: string): { isValid: boolean; formatted: string; reason?: string } => {
    if (!plate || !plate.trim()) {
      return { isValid: false, formatted: '', reason: 'Vui lòng nhập biển số xe.' };
    }

    const raw = plate.trim().toUpperCase().replace(/\s+/g, '');
    const clean = raw.replace(/[-.]/g, '');

    // Standard pattern according to Circular 79 & 81/2024/TT-BCA:
    // Province code: 11 to 99
    // Series: 1-2 letters, or letter+digit, or digit+letter (A, K, P1, 2A, LD, DA, MD, CD, NG, NN, QT, CV, etc.)
    // Sequence numbers: 4 or 5 digits
    const regexClean = /^([1-9][0-9])([A-Z]{1,2}|[A-Z][0-9]|[0-9][A-Z])([0-9]{4,5})$/;
    const match = clean.match(regexClean);

    if (!match) {
      return {
        isValid: false,
        formatted: raw,
        reason: 'Biển số không hợp lệ theo TT 79 & 81/2024/TT-BCA (Mã tỉnh 11-99 + Sê-ri + 4-5 số. Ví dụ: 29A-123.45, 51K-888.88, 59P1-123.45, 29LD-123.45).'
      };
    }

    const province = match[1];
    const series = match[2];
    const digits = match[3];

    const provNum = parseInt(province, 10);
    if (provNum < 11 || provNum > 99) {
      return {
        isValid: false,
        formatted: raw,
        reason: `Mã tỉnh '${province}' không hợp lệ (Mã tỉnh chuẩn Việt Nam từ 11 đến 99).`
      };
    }

    let formattedDigits = digits;
    if (digits.length === 5) {
      formattedDigits = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    const formatted = `${province}${series}-${formattedDigits}`;
    return { isValid: true, formatted };
  };

  // STRICT VALIDATION RULES ENFORCEMENT
  const validateParkingRules = (slot: ParkingSlot, vehicleType: string, isVip: boolean): string | null => {
    const isCarZone = slot.type === 'car_standard' || slot.type === 'car_vip';
    const isBikeOrElectric = vehicleType === 'motorbike' || vehicleType === 'electric';
    
    if (isCarZone && isBikeOrElectric) {
      return `Lỗi vi phạm quy tắc: Xe máy hoặc Xe điện TUYỆT ĐỐI KHÔNG ĐƯỢC phép đỗ vào khu vực Ô tô (${slot.zoneName})!`;
    }

    const isCarVehicle = vehicleType === 'car' || vehicleType === 'suv' || vehicleType === 'sedan';
    if ((slot.type === 'motorbike' || slot.type === 'electric') && isCarVehicle) {
      return `Lỗi vi phạm quy tắc: Ô tô không được phép đỗ vào khu vực Xe máy / Xe điện!`;
    }

    if (slot.type === 'car_vip') {
      const isCustomerRegular = currentUser?.role === 'customer' && currentUser?.membershipTier !== 'vip';
      if (isCustomerRegular || !isVip) {
        return `Lỗi vi phạm quy tắc: Bạn đang là Khách hàng Thường (0 điểm), KHÔNG ĐƯỢC PHÉP gửi xe vào ô VIP! Chỉ có Khách hàng VIP mới được đỗ ô VIP.`;
      }
    }

    return null;
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForCheckIn) return;
    setValidationError('');

    const errorMsg = validateParkingRules(selectedSlotForCheckIn, checkInVehicleType, checkInIsVip);
    if (errorMsg) {
      setValidationError(errorMsg);
      showToast('error', 'Vi phạm quy tắc đỗ xe!');
      return;
    }

    const plateValidation = validateVietnameseLicensePlate(checkInPlate);
    if (!plateValidation.isValid) {
      setValidationError(plateValidation.reason || 'Biển số xe không hợp lệ theo quy định Thông tư 79 & 81/2024/TT-BCA!');
      showToast('error', 'Biển số xe không đúng định dạng!');
      return;
    }

    try {
      const ticketId = `ticket_${Date.now()}`;
      const nowStr = new Date().toISOString();
      
      const newTicket: ParkingTicket = {
        id: ticketId,
        slotId: selectedSlotForCheckIn.id,
        slotNumber: selectedSlotForCheckIn.slotNumber,
        licensePlate: plateValidation.formatted,
        vehicleType: checkInVehicleType,
        isVip: checkInIsVip,
        customerName: checkInCustomerName || currentUser?.name || 'Khách vãng lai',
        phoneNumber: checkInPhone || 'Chưa cập nhật',
        checkInTime: nowStr,
        status: 'active',
        staffId: currentUser?.uid
      };

      await setDoc(doc(db, 'tickets', ticketId), newTicket);
      await updateDoc(doc(db, 'slots', selectedSlotForCheckIn.id), {
        status: 'occupied',
        currentTicketId: ticketId
      });

      setShowCheckInModal(false);
      setSelectedSlotForCheckIn(null);
      setCheckInPlate('');
      setCheckInCustomerName('');
      setCheckInPhone('');
      setCheckInIsVip(false);
      showToast('success', `Gửi xe thành công biển số ${plateValidation.formatted} vào ô ${selectedSlotForCheckIn.slotNumber}!`);
    } catch (err: any) {
      setValidationError(err.message);
      showToast('error', 'Lỗi khi gửi xe.');
    }
  };

  const handleTopUpWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountToTopUp = customTopUpInput ? parseInt(customTopUpInput, 10) : topUpAmount;
    if (!amountToTopUp || amountToTopUp <= 0) {
      showToast('error', 'Vui lòng chọn hoặc nhập số tiền nạp hợp lệ.');
      return;
    }

    const target = topUpTargetUser || currentUser;
    if (!target) return;

    try {
      // Record wallet transaction with 'pending' status for Admin/Staff confirmation
      const transId = `trans_${Date.now()}`;
      const newTrans: WalletTransaction = {
        id: transId,
        userId: target.uid,
        userName: target.name || target.email || 'Khách hàng',
        type: 'topup',
        amount: amountToTopUp,
        description: `Nạp tiền qua Chuyển khoản VietQR Ngân hàng MB Bank (STK 7920141546131)`,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      await setDoc(doc(db, 'wallet_transactions', transId), newTrans);

      setShowTopUpModal(false);
      setCustomTopUpInput('');
      setTopUpTargetUser(null);
      showToast('success', `Đã gửi yêu cầu nạp ${amountToTopUp.toLocaleString('vi-VN')} đ! Vui lòng chờ Admin hoặc Nhân viên đối soát và duyệt.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi gửi yêu cầu nạp tiền vào ví.');
    }
  };

  const handleCheckOut = async (ticket: ParkingTicket, method: 'cash' | 'transfer' | 'wallet' = selectedPaymentMethod) => {
    try {
      const checkOutTime = new Date();
      const checkInDate = new Date(ticket.checkInTime);
      const diffHours = Math.max(0, (checkOutTime.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
      const diffShifts = Math.max(1, Math.ceil(diffHours / 7));
      
      let ratePerShift = 10000;
      if (ticket.vehicleType === 'car' || ticket.vehicleType === 'suv' || ticket.vehicleType === 'sedan') {
        ratePerShift = ticket.isVip ? 50000 : 30000;
      } else if (ticket.vehicleType === 'electric') {
        ratePerShift = 20000;
      }

      const totalFee = diffShifts * ratePerShift;
      const pointsEarned = totalFee / 20000;

      // Handle Wallet Deduction if payment method is wallet
      if (method === 'wallet') {
        let userToDeduct = usersList.find(u => u.name === ticket.customerName || u.phoneNumber === ticket.phoneNumber) || currentUser;
        const currentBal = userToDeduct?.walletBalance ?? 200000;

        if (currentBal < totalFee) {
          showToast('error', `Số dư ví không đủ! (Còn ${currentBal.toLocaleString('vi-VN')} đ, cần ${totalFee.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền vào ví.`);
          setTopUpTargetUser(userToDeduct);
          setTopUpAmount(Math.max(50000, totalFee - currentBal));
          setShowTopUpModal(true);
          return;
        }

        const newBal = currentBal - totalFee;

        if (userToDeduct) {
          await setDoc(doc(db, 'users', userToDeduct.uid), { walletBalance: newBal }, { merge: true });

          const transId = `trans_${Date.now()}`;
          await setDoc(doc(db, 'wallet_transactions', transId), {
            id: transId,
            userId: userToDeduct.uid,
            userName: userToDeduct.name || userToDeduct.email,
            type: 'payment',
            amount: totalFee,
            description: `Thanh toán phí gửi xe ô ${ticket.slotNumber} (${ticket.licensePlate})`,
            createdAt: new Date().toISOString(),
            status: 'approved'
          });

          if (currentUser && userToDeduct.uid === currentUser.uid) {
            const updated = { ...currentUser, walletBalance: newBal };
            setCurrentUser(updated);
            localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          }
        }

        // Complete ticket immediately when paid via pre-funded wallet
        await updateDoc(doc(db, 'tickets', ticket.id), {
          status: 'completed',
          checkOutTime: checkOutTime.toISOString(),
          fee: totalFee,
          paymentMethod: method,
          paymentStatus: 'paid',
          pointsEarned
        });

        await updateDoc(doc(db, 'slots', ticket.slotId), {
          status: 'available',
          currentTicketId: null
        });

        if (userToDeduct) {
          const currentPoints = userToDeduct.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          try {
            await updateDoc(doc(db, 'users', userToDeduct.uid), {
              loyaltyPoints: newPoints,
              membershipTier: newTier
            });
          } catch {}

          if (currentUser && userToDeduct.uid === currentUser.uid) {
            const updatedUser = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
            setCurrentUser(updatedUser);
            localStorage.setItem('smart_parking_user', JSON.stringify(updatedUser));
          }
        }

        setShowCheckOutModal(false);
        setSelectedTicketForCheckOut(null);
        showToast('success', `Check-out thành công! Trừ ${totalFee.toLocaleString('vi-VN')} đ từ ví, cộng +${Number(pointsEarned.toFixed(2))} điểm. Ô ${ticket.slotNumber} đã trống.`);
        return;
      }

      // For Transfer (VietQR) or Cash: Move ticket to 'pending_approval'
      // Note: Reward points will be awarded ONLY after payment is confirmed/approved by Admin/Staff.
      await updateDoc(doc(db, 'tickets', ticket.id), {
        fee: totalFee,
        paymentMethod: method,
        paymentStatus: 'pending_approval',
        requestedAt: new Date().toISOString(),
        checkOutTime: checkOutTime.toISOString(),
        pointsEarned
      });

      setShowCheckOutModal(false);
      setSelectedTicketForCheckOut(null);
      const methodLabel = method === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt';
      showToast('success', `Đã chuyển sang mục CHỜ XÁC NHẬN! Vui lòng chờ Admin/Nhân viên duyệt thanh toán ${totalFee.toLocaleString('vi-VN')} đ (${methodLabel}). Điểm thưởng (+${Number(pointsEarned.toFixed(2))} điểm) sẽ được cộng sau khi xác nhận thanh toán thành công.`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Lỗi khi yêu cầu thanh toán.');
    }
  };

  const handleApproveTicketPayment = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        status: 'completed',
        paymentStatus: 'paid'
      });

      await updateDoc(doc(db, 'slots', ticket.slotId), {
        status: 'available',
        currentTicketId: null
      });

      let addedPointsStr = '';
      if (ticket.pointsEarned && ticket.customerName) {
        const custUser = usersList.find(u => 
          (u.name && u.name.trim().toLowerCase() === ticket.customerName.trim().toLowerCase()) || 
          (u.phoneNumber && ticket.phoneNumber && u.phoneNumber === ticket.phoneNumber) ||
          (u.email && u.email.trim().toLowerCase() === ticket.customerName.trim().toLowerCase())
        );

        if (custUser) {
          const currentPoints = custUser.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + ticket.pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          await updateDoc(doc(db, 'users', custUser.uid), {
            loyaltyPoints: newPoints,
            membershipTier: newTier
          });

          if (currentUser && currentUser.uid === custUser.uid) {
            const updated = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
            setCurrentUser(updated);
            localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          }
          addedPointsStr = ` Đã cộng +${Number(ticket.pointsEarned.toFixed(2))} điểm thưởng cho ${custUser.name}.`;
        } else if (currentUser && currentUser.role === 'customer') {
          const currentPoints = currentUser.loyaltyPoints || 0;
          const newPoints = Number((currentPoints + ticket.pointsEarned).toFixed(2));
          const newTier: 'regular' | 'vip' = newPoints >= 300 ? 'vip' : 'regular';
          await updateDoc(doc(db, 'users', currentUser.uid), {
            loyaltyPoints: newPoints,
            membershipTier: newTier
          });
          const updated = { ...currentUser, loyaltyPoints: newPoints, membershipTier: newTier };
          setCurrentUser(updated);
          localStorage.setItem('smart_parking_user', JSON.stringify(updated));
          addedPointsStr = ` Đã cộng +${Number(ticket.pointsEarned.toFixed(2))} điểm thưởng.`;
        }
      }

      showToast('success', `Đã DUYỆT thanh toán cho xe ${ticket.licensePlate}!${addedPointsStr} Ô đỗ ${ticket.slotNumber} đã được giải phóng.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt thanh toán.');
    }
  };

  const handleRejectTicketPayment = async (ticket: ParkingTicket) => {
    try {
      await updateDoc(doc(db, 'tickets', ticket.id), {
        paymentStatus: 'rejected'
      });
      showToast('success', `Đã TỪ CHỐI yêu cầu thanh toán xe ${ticket.licensePlate}. Vé đỗ xe quay lại trạng thái chưa thanh toán.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi từ chối thanh toán.');
    }
  };

  const handleApproveWalletTopUp = async (trans: WalletTransaction) => {
    try {
      const targetUser = usersList.find(u => u.uid === trans.userId);
      const currentBal = targetUser?.walletBalance ?? 200000;
      const newBal = currentBal + trans.amount;

      await setDoc(doc(db, 'users', trans.userId), { walletBalance: newBal }, { merge: true });

      await updateDoc(doc(db, 'wallet_transactions', trans.id), {
        status: 'approved'
      });

      if (currentUser && currentUser.uid === trans.userId) {
        const updated = { ...currentUser, walletBalance: newBal };
        setCurrentUser(updated);
        localStorage.setItem('smart_parking_user', JSON.stringify(updated));
      }

      showToast('success', `Đã DUYỆT nạp ${trans.amount.toLocaleString('vi-VN')} đ vào ví cho ${trans.userName}!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi duyệt nạp tiền ví.');
    }
  };

  const handleRejectWalletTopUp = async (trans: WalletTransaction) => {
    try {
      await updateDoc(doc(db, 'wallet_transactions', trans.id), {
        status: 'rejected'
      });
      showToast('success', `Đã TỪ CHỐI yêu cầu nạp tiền ví của ${trans.userName}.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi từ chối nạp tiền ví.');
    }
  };

  const handleAddSlot = async () => {
    const slotNum = prompt('Nhập số ô đỗ mới (VD: A09, B05):');
    if (!slotNum) return;
    const zoneTypeChoice = prompt('Chọn loại khu vực:\n1. car_standard\n2. car_vip\n3. motorbike\n4. electric', 'car_standard');
    
    let type: SlotType = 'car_standard';
    let zoneId = 'zone_a';
    let zoneName = 'Khu Ô tô Thường (Zone A)';

    if (zoneTypeChoice === '2') { type = 'car_vip'; zoneId = 'zone_b'; zoneName = 'Khu Ô tô VIP (Zone B)'; }
    else if (zoneTypeChoice === '3') { type = 'motorbike'; zoneId = 'zone_c'; zoneName = 'Khu Xe máy (Zone C)'; }
    else if (zoneTypeChoice === '4') { type = 'electric'; zoneId = 'zone_d'; zoneName = 'Khu Xe điện & Sạc (Zone D)'; }

    const newSlotId = `slot_${Date.now()}`;
    try {
      await setDoc(doc(db, 'slots', newSlotId), {
        id: newSlotId,
        slotNumber: slotNum.toUpperCase(),
        zoneId,
        zoneName,
        type,
        status: 'available'
      });
      showToast('success', `Đã thêm ô đỗ ${slotNum.toUpperCase()} thành công!`);
    } catch (err) {
      showToast('error', 'Lỗi khi thêm ô đỗ.');
    }
  };

  const handleOpenEditSlot = (slot: ParkingSlot) => {
    setSelectedSlotForEdit(slot);
    setEditSlotNumber(slot.slotNumber);
    setEditSlotType(slot.type);
    setShowEditSlotModal(true);
  };

  const handleSaveEditSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForEdit) return;

    let zoneId = 'zone_a';
    let zoneName = 'Khu Ô tô Thường (Zone A)';
    if (editSlotType === 'car_vip') { zoneId = 'zone_b'; zoneName = 'Khu Ô tô VIP (Zone B)'; }
    else if (editSlotType === 'motorbike') { zoneId = 'zone_c'; zoneName = 'Khu Xe máy (Zone C)'; }
    else if (editSlotType === 'electric') { zoneId = 'zone_d'; zoneName = 'Khu Xe điện & Sạc (Zone D)'; }

    try {
      await updateDoc(doc(db, 'slots', selectedSlotForEdit.id), {
        slotNumber: editSlotNumber.toUpperCase(),
        type: editSlotType,
        zoneId,
        zoneName
      });
      setShowEditSlotModal(false);
      setSelectedSlotForEdit(null);
      showToast('success', `Cập nhật thông tin ô đỗ ${editSlotNumber.toUpperCase()} thành công!`);
    } catch (err) {
      showToast('error', 'Lỗi khi cập nhật ô đỗ.');
    }
  };

  const handleDeleteSlot = async (slotId: string, slotNumber: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ô đỗ ${slotNumber}?`)) return;
    try {
      await deleteDoc(doc(db, 'slots', slotId));
      showToast('success', `Đã xóa ô đỗ ${slotNumber}!`);
    } catch (err) {
      showToast('error', 'Lỗi khi xóa ô đỗ.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-lg">Đang kết nối hệ thống Smart Parking...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
          <div className="text-center mb-6">
            <div className="bg-white/10 border border-white/20 p-2.5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg backdrop-blur">
              <img src="/assets/aistudio/image_6150025b.png" alt="Smart Parking Logo" className="w-16 h-16 object-contain rounded-xl" />
            </div>
            <h1 className="text-2xl font-bold">Smart Parking System</h1>
            <p className="text-slate-400 text-sm mt-1">Hệ thống Quản lý Bãi đỗ xe Thông minh & Tích điểm</p>
          </div>

          {authError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
              {authError}
            </div>
          )}

          {/* Auth Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700">
            <button
              onClick={() => setAuthTab('quick')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'quick' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              ⚡ Đăng nhập nhanh
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authTab === 'register' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              📝 Đăng ký tài khoản
            </button>
          </div>

          {authTab === 'quick' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email đăng nhập</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-lg shadow-emerald-500/20 text-sm"
              >
                Đăng nhập hệ thống
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">hoặc</span>
                <div className="flex-grow border-t border-slate-700"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Đăng nhập với Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email đăng ký</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <p className="text-slate-400 text-[11px] italic">
                * Hạng thành viên mặc định là Khách hàng Thường (0 điểm) khi đăng ký mới.
              </p>
              <button
                type="submit"
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-lg shadow-emerald-500/20 text-sm"
              >
                Đăng ký & Đăng nhập ngay
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const totalSlotsCount = slots.length;
  const activeTicketsList = tickets.filter(t => !t.checkOutTime);
  const occupiedSlotsCount = activeTicketsList.length;
  const availableSlotsCount = Math.max(0, totalSlotsCount - occupiedSlotsCount);
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.fee || 0), 0);
  const pendingTicketsList = tickets.filter(t => t.paymentStatus === 'pending_approval');
  const pendingWalletTransList = walletTransactions.filter(wt => wt.status === 'pending');
  const totalPendingCount = pendingTicketsList.length + pendingWalletTransList.length;

  const filteredSlots = slots.filter(slot => {
    const activeTicket = tickets.find(t => (!t.checkOutTime) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
    const isOccupied = !!activeTicket || slot.status === 'occupied';
    const slotStatus = isOccupied ? 'occupied' : 'available';

    if (filterZone !== 'all' && slot.zoneId !== filterZone) return false;
    if (filterStatus !== 'all' && slotStatus !== filterStatus) return false;
    if (searchQuery && !slot.slotNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));

  const activeBg = BG_THEMES.find(t => t.id === (currentUser?.bgTheme || 'cyber-dark')) || BG_THEMES[0];
  const activeBgUrl = currentUser?.bgTheme === 'custom' && currentUser?.bgCustomUrl 
    ? currentUser.bgCustomUrl 
    : (activeBg.imageUrl || BG_THEMES[0].imageUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden transition-colors duration-700">
      {/* Real Fullscreen Parking Lot Wallpaper Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
        {activeBgUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105" 
            style={{ backgroundImage: `url(${activeBgUrl})` }}
          ></div>
        )}
        {/* Dark Backdrop Glassmorphism Overlay for 100% Text & UI Legibility */}
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-all duration-700"></div>

        {/* Subtle Ambient Accent Spotlights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-emerald-500/20"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30 bg-indigo-500/20"></div>
      </div>

      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-bounce ${toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200' : 'bg-red-950 border-red-500/50 text-red-200'}`}>
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Wrapper - strictly z-10 above background layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-6 py-2.5 flex flex-row items-center justify-between flex-nowrap gap-4 overflow-x-auto shadow-lg">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/20 p-1.5 rounded-xl shadow-sm">
              <img src="/assets/aistudio/image_6150025b.png" alt="Smart Parking Logo" className="w-8 h-8 object-contain rounded-lg" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">Smart Parking</h1>
              <p className="text-[11px] text-slate-300">Hệ thống bãi đỗ xe thông minh</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-slate-950/90 px-4 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Tổng ô:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{totalSlotsCount}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-medium">Trống:</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">{availableSlotsCount}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-400 font-medium">Đang đỗ:</span>
              <span className="font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">{occupiedSlotsCount}</span>
            </div>
            {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
              <>
                <div className="w-px h-4 bg-slate-800"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-indigo-400 font-medium">Doanh thu:</span>
                  <span className="font-mono font-bold text-indigo-300">{totalRevenue.toLocaleString('vi-VN')} đ</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Change Background Theme Button */}
            <button
              onClick={() => {
                setSelectedBgTheme(currentUser.bgTheme || 'cyber-dark');
                setCustomBgUrlInput(currentUser.bgCustomUrl || '');
                setShowThemeModal(true);
              }}
              title="Đổi phông nền giao diện tài khoản"
              className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-300" /> Đổi phông nền
            </button>

            {/* Wallet Balance Badge */}
            <div className="bg-slate-950 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs shadow-inner">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-sm">
                  {(currentUser.walletBalance ?? 200000).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <button
                onClick={() => { setTopUpTargetUser(currentUser); setShowTopUpModal(true); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition shadow cursor-pointer"
              >
                + Nạp ví
              </button>
              <button
                onClick={() => setShowWalletHistoryModal(true)}
                title="Lịch sử giao dịch ví"
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowQuickCheckOutListModal(true)}
              title="Lấy xe ra khỏi bãi (Check-out)"
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Car className="w-3.5 h-3.5" /> Lấy xe ra
            </button>

            <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0 text-xs">
              <span className="font-bold text-white">{currentUser.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentUser.role === 'admin' ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40' : currentUser.role === 'staff' ? 'bg-blue-500/30 text-blue-200 border border-blue-500/40' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'}`}>
                {currentUser.role === 'admin' ? 'ADMIN' : currentUser.role === 'staff' ? 'STAFF' : 'KHÁCH'}
              </span>
              {currentUser.role === 'customer' && (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentUser.membershipTier === 'vip' ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                    {currentUser.membershipTier === 'vip' ? 'VIP' : 'Thường'}
                  </span>
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400" /> {Number((currentUser.loyaltyPoints || 0).toFixed(2))}đ
                  </span>
                </>
              )}
              <button
                onClick={() => {
                  setEditName(currentUser.name);
                  setEditPhone(currentUser.phoneNumber || '');
                  setEditAddress(currentUser.address || '');
                  setEditBirthDate(currentUser.birthDate || '');
                  setEditGender(currentUser.gender || 'Nam');
                  setShowEditProfileModal(true);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] ml-1 shrink-0 cursor-pointer"
              >
                Sửa hồ sơ
              </button>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Uniform Single-Line Tab Navigation Bar with High Contrast Text */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 flex items-center gap-1 overflow-x-auto whitespace-nowrap h-12 text-xs relative z-20 shadow-md">
          <button
            onClick={() => setActiveTab('map')}
            className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'map' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
          >
            <LayoutGrid className="w-4 h-4 text-emerald-400" /> Sơ đồ nhà xe
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'tickets' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
          >
            <History className="w-4 h-4 text-emerald-400" /> Lịch sử gửi xe ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('pending_approvals')}
            className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'pending_approvals' ? 'border-amber-400 text-amber-400 bg-amber-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
          >
            <Clock className={`w-4 h-4 ${totalPendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-amber-400'}`} />
            <span>Chờ xác nhận</span>
            {totalPendingCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                {totalPendingCount}
              </span>
            )}
          </button>
          {(currentUser.role === 'admin' || currentUser.role === 'staff') && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'staff' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
            >
              <Users className="w-4 h-4 text-blue-400" /> Nghiệp vụ xe
            </button>
          )}
          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('settings')}
                className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'settings' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
              >
                <Settings className="w-4 h-4 text-purple-400" /> Cấu hình ô đỗ
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'users' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
              >
                <Users className="w-4 h-4 text-purple-400" /> Quản lý tài khoản ({usersList.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`shrink-0 h-full px-4 flex items-center gap-2 border-b-2 font-bold transition whitespace-nowrap ${activeTab === 'analytics' ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-200 hover:text-white'}`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Thống kê doanh thu
              </button>
            </>
          )}
        </div>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full relative z-10">
        {activeTab === 'map' && (
          <div className="space-y-6">
            {currentUser.role === 'customer' && (
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Thẻ thành viên: {currentUser.membershipTier === 'vip' ? 'Khách hàng VIP' : 'Khách hàng Thường'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tích lũy 300 điểm thưởng qua mỗi lần gửi xe để tự động nâng hạng VIP và mở khóa ô VIP.</p>
                  </div>
                </div>
                <div className="bg-slate-950/80 px-6 py-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-0.5">Điểm tích lũy hiện tại</span>
                  <span className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400" /> {Number((currentUser.loyaltyPoints || 0).toFixed(2))} điểm
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setFilterZone('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'all' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Tất cả khu vực
                </button>
                <button
                  onClick={() => setFilterZone('zone_a')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_a' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu A (Ô tô Thường)
                </button>
                <button
                  onClick={() => setFilterZone('zone_b')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_b' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu B (Ô tô VIP)
                </button>
                <button
                  onClick={() => setFilterZone('zone_c')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_c' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu C (Xe máy)
                </button>
                <button
                  onClick={() => setFilterZone('zone_d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterZone === 'zone_d' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Khu D (Xe điện & Sạc)
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="available">Trống (Available)</option>
                  <option value="occupied">Đang đỗ (Occupied)</option>
                </select>

                <div className="relative flex-1 md:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm số ô đỗ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                <span>Trống (Có thể gửi xe)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                <span>Đang đỗ xe</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/30">VIP Zone</span>
                <span>Chỉ dành cho Khách hàng VIP (300+ điểm)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredSlots.map((slot) => {
                const activeTicket = tickets.find(t => (!t.checkOutTime) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
                const isOccupied = !!activeTicket || slot.status === 'occupied';
                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (!isOccupied) {
                        setSelectedSlotForCheckIn(slot);
                        setCheckInIsVip(slot.type === 'car_vip' || currentUser.membershipTier === 'vip' || currentUser.role === 'admin');
                        setCheckInCustomerName(currentUser.name || currentUser.email?.split('@')[0] || '');
                        setCheckInPhone(currentUser.phoneNumber || (currentUser.email === 'admin@parking.vn' ? '0901234567' : currentUser.email === 'staff@parking.vn' ? '0909876543' : '0912345678'));
                        setShowCheckInModal(true);
                      } else if (isOccupied && activeTicket && (currentUser.role === 'admin' || currentUser.role === 'staff' || activeTicket.customerName === currentUser.name)) {
                        setSelectedTicketForCheckOut(activeTicket);
                        setShowCheckOutModal(true);
                      }
                    }}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${
                      !isOccupied 
                        ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10' 
                        : 'bg-red-950/20 border-red-500/30 hover:border-red-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-bold text-slate-100">{slot.slotNumber}</span>
                        {slot.type === 'car_vip' && (
                          <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-500/30 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> VIP
                          </span>
                        )}
                        {slot.type === 'motorbike' && <Bike className="w-4 h-4 text-blue-400" />}
                        {slot.type === 'electric' && <Zap className="w-4 h-4 text-amber-400" />}
                        {slot.type === 'car_standard' && <Car className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{slot.zoneName}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800">
                      {!isOccupied && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Trống
                          </span>
                          <span className="text-[10px] text-emerald-300 font-semibold underline">Gửi xe</span>
                        </div>
                      )}
                      {isOccupied && (
                        <div>
                          <div className="text-xs font-bold text-red-400 truncate">
                            {activeTicket && activeTicket.licensePlate ? activeTicket.licensePlate : 'Đang đỗ'}
                          </div>
                          {activeTicket && activeTicket.customerName && activeTicket.customerName !== 'Đang đỗ' && activeTicket.customerName !== activeTicket.licensePlate && activeTicket.customerName !== 'Khách vãng lai' && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {activeTicket.customerName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" /> Lịch sử Gửi xe & Điểm tích lũy
                </h3>
                <span className="text-xs text-slate-400">Tổng số: {tickets.length} giao dịch</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Mã vé / Ô đỗ</th>
                      <th className="p-3">Biển số xe</th>
                      <th className="p-3">Loại xe</th>
                      <th className="p-3">Khách hàng</th>
                      <th className="p-3">Thời gian vào</th>
                      <th className="p-3">Thời gian ra (Check-out)</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Phí gửi</th>
                      <th className="p-3">Điểm thưởng</th>
                      {(currentUser.role === 'admin' || currentUser.role === 'staff') && <th className="p-3 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-emerald-400">{t.slotNumber}</td>
                        <td className="p-3 font-bold text-slate-100">{t.licensePlate} {t.isVip && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 rounded ml-1">VIP</span>}</td>
                        <td className="p-3 uppercase">{t.vehicleType}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{t.customerName}</div>
                          <div className="text-[10px] text-slate-400">{t.phoneNumber}</div>
                        </td>
                        <td className="p-3 text-slate-300">{new Date(t.checkInTime).toLocaleString('vi-VN')}</td>
                        <td className="p-3 text-slate-300">
                          {t.checkOutTime 
                            ? new Date(t.checkOutTime).toLocaleString('vi-VN') 
                            : '— (Xe đang trong bãi)'}
                        </td>
                        <td className="p-3">
                          {t.paymentStatus === 'pending_approval' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 animate-spin text-amber-300" /> Chờ xác nhận
                            </span>
                          ) : t.paymentStatus === 'rejected' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 w-fit block">
                              Từ chối
                            </span>
                          ) : t.status === 'completed' || t.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 w-fit block">
                              Hoàn thành
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30 w-fit block">
                              Đang đỗ
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-indigo-300">{t.fee ? `${t.fee.toLocaleString('vi-VN')} đ` : '—'}</td>
                        <td className="p-3">
                          {t.paymentStatus === 'pending_approval' ? (
                            <span className="text-amber-300/90 text-xs font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                              Chờ duyệt (Chưa cộng +{Number((t.pointsEarned || 0).toFixed(2))}đ)
                            </span>
                          ) : t.status === 'completed' || t.paymentStatus === 'paid' ? (
                            <span className="font-bold text-amber-400">
                              +{Number((t.pointsEarned || 0).toFixed(2))} điểm
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        {(currentUser.role === 'admin' || currentUser.role === 'staff') && !t.checkOutTime && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedTicketForCheckOut(t);
                                setShowCheckOutModal(true);
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition"
                            >
                              Trả xe (Check-out)
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-400" /> Nghiệp vụ Gửi xe vào bãi
              </h3>
              <p className="text-xs text-slate-400">Chọn ô đỗ trống trên sơ đồ hoặc bấm vào đây để tiến hành gửi xe.</p>
              
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ô đỗ trống có sẵn:</span>
                  <span className="text-xs font-bold text-emerald-400">{availableSlotsCount} ô trống</span>
                </div>
                <button
                  onClick={() => {
                    const availSlot = slots.find(s => s.status === 'available');
                    if (availSlot) {
                      setSelectedSlotForCheckIn(availSlot);
                      setShowCheckInModal(true);
                    } else {
                      showToast('error', 'Bãi đỗ đã hết chỗ trống! Hãy bấm Reset ô trống.');
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  Gửi xe vào ô trống đầu tiên
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-red-400" /> Nghiệp vụ Trả xe ra (Check-out)
              </h3>
              <p className="text-xs text-slate-400">Chọn xe đang đỗ để tính tiền, tích điểm và giải phóng ô đỗ.</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tickets.filter(t => t.status === 'active').length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Không có xe nào đang đỗ trong bãi.</p>
                ) : (
                  tickets.filter(t => t.status === 'active').map(t => (
                    <div key={t.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-400 mr-2">[{t.slotNumber}]</span>
                        <span className="font-bold text-slate-100">{t.licensePlate}</span>
                        <span className="text-slate-400 ml-2">({t.customerName})</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTicketForCheckOut(t);
                          setShowCheckOutModal(true);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg font-semibold border border-red-500/30 transition"
                      >
                        Trả xe ngay
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" /> Cấu hình Sơ đồ & Ô đỗ bãi xe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Quản lý các ô đỗ, thêm ô mới hoặc cấu hình khu vực hệ thống.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSlots}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" /> Reset toàn bộ ô trống
                  </button>
                  <button
                    onClick={handleAddSlot}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-purple-500/20"
                  >
                    <Plus className="w-4 h-4" /> Thêm ô đỗ mới
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Khu A & B (Ô tô)</h4>
                  <p className="text-xs text-slate-400 mb-3">Chỉ dành riêng cho các loại xe ô tô (Standard & VIP).</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type.includes('car')).length} ô đỗ</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Khu C (Xe máy)</h4>
                  <p className="text-xs text-slate-400 mb-3">Dành cho xe gắn máy, xe tay ga.</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type === 'motorbike').length} ô đỗ</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Khu D (Xe điện & Sạc)</h4>
                  <p className="text-xs text-slate-400 mb-3">Trang bị trụ sạc điện thông minh.</p>
                  <div className="text-2xl font-bold">{slots.filter(s => s.type === 'electric').length} ô đỗ</div>
                </div>
              </div>

              {/* Slot Management Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mt-6">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-emerald-400" /> Quản lý & Chỉnh sửa chi tiết các ô đỗ ({slots.length})
                  </h4>
                  <span className="text-xs text-slate-400">Bấm "Sửa" để thay đổi loại ô (VIP, Thường, Xe máy, Xe điện) hoặc số ô</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">Số ô</th>
                        <th className="p-3">Khu vực (Zone)</th>
                        <th className="p-3">Loại ô</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {slots.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })).map((slot) => {
                        const activeTicket = tickets.find(t => (!t.checkOutTime) && (t.slotId === slot.id || t.slotNumber === slot.slotNumber || t.id === slot.currentTicketId));
                        const isOccupied = !!activeTicket || slot.status === 'occupied';
                        return (
                          <tr key={slot.id} className="hover:bg-slate-900/40 transition">
                            <td className="p-3 font-bold text-emerald-400">{slot.slotNumber}</td>
                            <td className="p-3 text-slate-300">{slot.zoneName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${slot.type === 'car_vip' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : slot.type === 'motorbike' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : slot.type === 'electric' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}`}>
                                {slot.type === 'car_vip' ? 'Ô tô VIP' : slot.type === 'motorbike' ? 'Xe máy' : slot.type === 'electric' ? 'Xe điện & Sạc' : 'Ô tô Thường'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${!isOccupied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {!isOccupied ? 'Trống' : 'Đang đỗ'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditSlot(slot)}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-semibold border border-blue-500/30 transition"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id, slot.slotNumber)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" /> Quản lý Hồ sơ Nhân viên & Khách hàng ({usersList.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Admin có quyền thêm mới, chỉnh sửa thông tin, phân quyền hoặc xóa tài khoản nhân viên và khách hàng.</p>
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Thêm tài khoản
                </button>
              </div>

              {/* User Profiles Management Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Danh sách toàn bộ tài khoản
                  </h4>
                  <span className="text-xs text-slate-400">Cập nhật theo thời gian thực từ Firestore</span>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Vai trò</th>
                        <th className="p-3">Thành viên / Điểm</th>
                        <th className="p-3">Ví tài khoản</th>
                        <th className="p-3">Số điện thoại</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-900/40 transition">
                          <td className="p-3 font-bold text-white">
                            {u.name || u.email?.split('@')[0] || 'Tài khoản người dùng'}
                          </td>
                          <td className="p-3 text-slate-200 font-mono">
                            {u.email || 'user@parking.vn'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : u.role === 'staff'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {u.role ? u.role.toUpperCase() : 'CUSTOMER'}
                            </span>
                          </td>
                          <td className="p-3">
                            {(!u.role || u.role === 'customer') ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.membershipTier === 'vip' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                                  {u.membershipTier === 'vip' ? 'VIP' : 'Thường'}
                                </span>
                                <span className="text-amber-400 font-bold">{Number((u.loyaltyPoints || 0).toFixed(2))} điểm</span>
                              </div>
                            ) : u.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Ban Quản Trị
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Nhân Viên Bãi
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400">
                                {(u.walletBalance ?? 200000).toLocaleString('vi-VN')} đ
                              </span>
                              <button
                                onClick={() => { setTopUpTargetUser(u); setShowTopUpModal(true); }}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                + Nạp ví
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-slate-200 font-mono">
                            {u.phoneNumber || (u.email === 'admin@parking.vn' ? '0901234567' : u.email === 'staff@parking.vn' ? '0909876543' : '0988776655')}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                            >
                              Sửa
                            </button>
                            {u.uid !== currentUser.uid && (
                              <button
                                onClick={() => setUserToDelete({ uid: u.uid, name: u.name || u.email, email: u.email })}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-semibold border border-red-500/30 transition cursor-pointer"
                              >
                                Xóa
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              {/* Header & Period Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Thống kê & Báo cáo Doanh thu Bãi xe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Báo cáo tổng hợp doanh thu real-time, phân tích theo loại phương tiện, khu vực và lịch sử giao dịch.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setReportPeriod('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'all' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setReportPeriod('today')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'today' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Hôm nay
                    </button>
                    <button
                      onClick={() => setReportPeriod('week')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'week' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      7 ngày qua
                    </button>
                    <button
                      onClick={() => setReportPeriod('month')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${reportPeriod === 'month' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      Tháng này
                    </button>
                  </div>

                  <button
                    onClick={() => showToast('success', 'Đã xuất file báo cáo doanh thu CSV/Excel thành công!')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Xuất Excel / CSV
                  </button>
                </div>
              </div>

              {/* KPI Summary & Charts */}
              {(() => {
                const now = new Date();
                const filteredTickets = tickets.filter(t => {
                  if (t.status !== 'completed' && !t.checkOutTime) return false;
                  if (!t.checkOutTime) return false;
                  const checkOutDate = new Date(t.checkOutTime);
                  if (reportPeriod === 'today') {
                    return checkOutDate.toDateString() === now.toDateString();
                  }
                  if (reportPeriod === 'week') {
                    const diffDays = (now.getTime() - checkOutDate.getTime()) / (1000 * 3600 * 24);
                    return diffDays <= 7;
                  }
                  if (reportPeriod === 'month') {
                    return checkOutDate.getMonth() === now.getMonth() && checkOutDate.getFullYear() === now.getFullYear();
                  }
                  return true;
                });

                const periodRevenue = filteredTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const periodCount = filteredTickets.length;
                const periodAvg = periodCount > 0 ? Math.round(periodRevenue / periodCount) : 0;
                const activeCount = tickets.filter(t => !t.checkOutTime).length;

                // Payment Method Breakdown
                const walletRev = filteredTickets.filter(t => t.paymentMethod === 'wallet').reduce((sum, t) => sum + (t.fee || 0), 0);
                const transferRev = filteredTickets.filter(t => t.paymentMethod === 'transfer').reduce((sum, t) => sum + (t.fee || 0), 0);
                const cashRev = filteredTickets.filter(t => t.paymentMethod === 'cash' || !t.paymentMethod).reduce((sum, t) => sum + (t.fee || 0), 0);

                // Vehicle Type Breakdown
                const carTickets = filteredTickets.filter(t => t.vehicleType === 'car' || t.vehicleType === 'suv' || t.vehicleType === 'sedan');
                const carRevenue = carTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const carCount = carTickets.length;

                const bikeTickets = filteredTickets.filter(t => t.vehicleType === 'motorbike');
                const bikeRevenue = bikeTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const bikeCount = bikeTickets.length;

                const evTickets = filteredTickets.filter(t => t.vehicleType === 'electric');
                const evRevenue = evTickets.reduce((sum, t) => sum + (t.fee || 0), 0);
                const evCount = evTickets.length;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Doanh thu kỳ chọn</span>
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-emerald-400">{periodRevenue.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-slate-400 mt-1">Từ {periodCount} lượt xe hoàn tất check-out</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Thanh toán qua Ví</span>
                          <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-white">{walletRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-emerald-400 mt-1">Trừ trực tiếp số dư ví tài khoản</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Chuyển khoản VietQR</span>
                          <QrCode className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-indigo-300">{transferRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-indigo-400 mt-1">Quét mã QR Ngân hàng MB Bank</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider">Tiền mặt</span>
                          <DollarSign className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-amber-400">{cashRev.toLocaleString('vi-VN')} đ</p>
                        <p className="text-[11px] text-slate-400 mt-1">Thu tiền mặt trực tiếp</p>
                      </div>
                    </div>

                    {/* Breakdown Progress Bars & Recent Transactions Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* By Vehicle Type */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <h4 className="text-sm font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-emerald-400" /> Phân tích Doanh thu theo Loại xe
                          </span>
                          <span className="text-xs text-slate-400 font-normal">Tỷ trọng %</span>
                        </h4>

                        <div className="space-y-3.5 text-xs">
                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5 text-blue-400" /> Ô tô (Car / SUV / Sedan)
                              </span>
                              <span className="text-emerald-400">{carRevenue.toLocaleString('vi-VN')} đ ({carCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((carRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Bike className="w-3.5 h-3.5 text-amber-400" /> Xe máy (Motorbike)
                              </span>
                              <span className="text-emerald-400">{bikeRevenue.toLocaleString('vi-VN')} đ ({bikeCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-amber-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((bikeRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between font-semibold mb-1">
                              <span className="text-slate-200 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Xe điện & Sạc (Electric EV)
                              </span>
                              <span className="text-emerald-400">{evRevenue.toLocaleString('vi-VN')} đ ({evCount} lượt)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${periodRevenue > 0 ? Math.round((evRevenue / periodRevenue) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Ledger Table Summary */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                        <h4 className="text-sm font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-400" /> Giao dịch Doanh thu Mới nhất
                          </span>
                          <span className="text-xs text-indigo-400">{filteredTickets.length} giao dịch</span>
                        </h4>

                        <div className="overflow-x-auto max-h-[220px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0">
                              <tr>
                                <th className="p-2">Biển số</th>
                                <th className="p-2">Ô đỗ</th>
                                <th className="p-2">Phương thức</th>
                                <th className="p-2 text-right">Phí thu</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {filteredTickets.slice(0, 5).map((t) => (
                                <tr key={t.id} className="hover:bg-slate-900/40">
                                  <td className="p-2 font-mono font-bold text-white">{t.licensePlate}</td>
                                  <td className="p-2 text-slate-300">{t.slotNumber}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.paymentMethod === 'wallet'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : t.paymentMethod === 'transfer'
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {t.paymentMethod === 'wallet' ? 'Ví tài khoản' : t.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-bold text-emerald-400">{(t.fee || 0).toLocaleString('vi-VN')} đ</td>
                                </tr>
                              ))}
                              {filteredTickets.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="p-4 text-center text-slate-500 italic">Chưa có giao dịch doanh thu trong kỳ này.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'pending_approvals' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Mục Chờ Xác Nhận Thanh Toán & Nạp Ví
                    <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {totalPendingCount} yêu cầu
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Đối soát số dư tài khoản ngân hàng MB Bank (<strong className="text-indigo-300 font-mono">7920141546131</strong> - <strong className="text-indigo-300">NGUYEN HUU PHUOC</strong>) trước khi duyệt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  showToast('success', 'Đã làm mới danh sách chờ xác nhận!');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Làm mới
              </button>
            </div>

            {/* Section 1: Pending Parking Tickets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <Car className="w-5 h-5 text-emerald-400" />
                  1. Yêu cầu Thanh toán Gửi xe ({pendingTicketsList.length})
                </h3>
                <span className="text-xs text-slate-400">Xe chờ xuất bãi qua VietQR / Tiền mặt</span>
              </div>

              {pendingTicketsList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/50 rounded-xl border border-slate-800">
                  <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                  Không có yêu cầu thanh toán gửi xe nào đang chờ duyệt.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTicketsList.map(ticket => (
                    <div key={ticket.id} className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3 relative hover:border-amber-500/60 transition">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-base text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                            {ticket.licensePlate}
                          </span>
                          <span className="text-xs font-bold text-slate-300">Ô đỗ: {ticket.slotNumber}</span>
                        </div>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" /> Chờ xác nhận
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-400">Khách gửi xe:</span><span className="font-medium text-white">{ticket.customerName} ({ticket.phoneNumber || 'N/A'})</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Loại phương tiện:</span><span className="uppercase text-slate-300">{ticket.vehicleType} {ticket.isVip && '(VIP)'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Hình thức thanh toán:</span><span className="font-bold text-indigo-300">{ticket.paymentMethod === 'transfer' ? 'Chuyển khoản VietQR (MB Bank)' : 'Tiền mặt'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Thời gian gửi yêu cầu:</span><span className="font-mono text-slate-400">{ticket.requestedAt ? new Date(ticket.requestedAt).toLocaleString('vi-VN') : 'Vừa xong'}</span></div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Điểm thưởng tích lũy:</span>
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" /> Chờ cộng +{Number((ticket.pointsEarned || 0).toFixed(2))} điểm (khi duyệt thành công)
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                          <span className="text-slate-400 font-medium">Tổng phí thu:</span>
                          <span className="font-mono font-extrabold text-amber-400 text-lg">{(ticket.fee || 0).toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>

                      {(currentUser.role === 'admin' || currentUser.role === 'staff') ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleApproveTicketPayment(ticket)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" /> Duyệt thanh toán
                          </button>
                          <button
                            onClick={() => handleRejectTicketPayment(ticket)}
                            className="px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300 italic text-center">
                          Vui lòng chờ Admin / Nhân viên kiểm tra tài khoản và duyệt xuất bãi.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Pending Wallet Top-ups */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                  2. Yêu cầu Nạp tiền Ví chờ xác nhận ({pendingWalletTransList.length})
                </h3>
                <span className="text-xs text-slate-400">Khách hàng đã chuyển khoản VietQR nạp ví</span>
              </div>

              {pendingWalletTransList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/50 rounded-xl border border-slate-800">
                  <CheckCircle className="w-8 h-8 text-indigo-500/50 mx-auto mb-2" />
                  Không có yêu cầu nạp tiền ví nào đang chờ duyệt.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingWalletTransList.map(trans => (
                    <div key={trans.id} className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3 relative hover:border-indigo-500/60 transition">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold text-sm text-white">{trans.userName}</span>
                        </div>
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" /> Chờ nạp ví
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-400">Nội dung nạp:</span><span className="text-slate-300 truncate max-w-[200px]">{trans.description}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Tài khoản ngân hàng:</span><span className="font-mono text-indigo-300 font-bold">MB Bank 7920141546131</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Thời gian yêu cầu:</span><span className="font-mono text-slate-400">{new Date(trans.createdAt).toLocaleString('vi-VN')}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                          <span className="text-slate-400 font-medium">Số tiền cần cộng vào ví:</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-lg">+{trans.amount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>

                      {(currentUser.role === 'admin' || currentUser.role === 'staff') ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleApproveWalletTopUp(trans)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" /> Duyệt cộng tiền ví
                          </button>
                          <button
                            onClick={() => handleRejectWalletTopUp(trans)}
                            className="px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-indigo-300 italic text-center">
                          Vui lòng chờ Admin / Nhân viên kiểm tra giao dịch và cộng tiền vào ví.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Check-in Modal with Strict Validation */}
      {showCheckInModal && selectedSlotForCheckIn && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold">Gửi xe vào ô {selectedSlotForCheckIn.slotNumber}</h3>
                <p className="text-xs text-slate-400">{selectedSlotForCheckIn.zoneName}</p>
              </div>
              <button
                onClick={() => { setShowCheckInModal(false); setValidationError(''); }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <div>
                  <p className="font-bold mb-0.5">Vi phạm ràng buộc nghiệp vụ!</p>
                  <p>{validationError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Biển số xe (License Plate)</label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                    TT 79 & 81/2024/TT-BCA
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={checkInPlate}
                  onChange={(e) => setCheckInPlate(e.target.value)}
                  placeholder="29A-123.45 hoặc 59P1-123.45"
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm focus:outline-none uppercase font-mono tracking-wider transition ${
                    !checkInPlate
                      ? 'border-slate-700 focus:border-emerald-400'
                      : validateVietnameseLicensePlate(checkInPlate).isValid
                      ? 'border-emerald-500/80 text-emerald-300 focus:border-emerald-400'
                      : 'border-red-500/80 text-red-300 focus:border-red-400'
                  }`}
                />
                
                {/* Real-time feedback status */}
                {checkInPlate ? (() => {
                  const check = validateVietnameseLicensePlate(checkInPlate);
                  return check.isValid ? (
                    <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Định dạng chuẩn: <strong className="font-mono text-white bg-emerald-900/80 px-1.5 py-0.5 rounded">{check.formatted}</strong></span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400 mt-1.5 flex items-start gap-1.5 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>{check.reason}</span>
                    </div>
                  );
                })() : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cú pháp chuẩn: Mã tỉnh (11-99) + Sê-ri (VD: A, K, P1, LD) + 4-5 số (VD: 29A-123.45, 50K-888.88, 59P1-123.45, 29LD-123.45)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loại phương tiện</label>
                <select
                  value={checkInVehicleType}
                  onChange={(e) => setCheckInVehicleType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="car">Ô tô 4-7 chỗ (Car)</option>
                  <option value="suv">Xe SUV / Bán tải</option>
                  <option value="sedan">Xe Sedan</option>
                  <option value="motorbike">Xe máy (Motorbike)</option>
                  <option value="electric">Xe điện (Electric EV)</option>
                </select>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Hạng tài khoản hệ thống:</span>
                {currentUser.role === 'customer' ? (
                  currentUser.membershipTier === 'vip' ? (
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Khách hàng VIP
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold">
                      Khách hàng Thường
                    </span>
                  )
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                    {currentUser.role === 'admin' ? 'Quản trị viên (VIP)' : 'Nhân viên Bãi xe'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tên khách hàng</label>
                  <input
                    type="text"
                    value={checkInCustomerName}
                    onChange={(e) => setCheckInCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={checkInPhone}
                    onChange={(e) => setCheckInPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCheckInModal(false); setValidationError(''); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Xác nhận Gửi xe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-out Modal with Payment Method Options */}
      {showCheckOutModal && selectedTicketForCheckOut && (() => {
        const checkOutTime = new Date();
        const checkInDate = new Date(selectedTicketForCheckOut.checkInTime);
        const diffHours = Math.max(0, (checkOutTime.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
        const diffShifts = Math.max(1, Math.ceil(diffHours / 7));
        
        let ratePerShift = 10000;
        if (selectedTicketForCheckOut.vehicleType === 'car' || selectedTicketForCheckOut.vehicleType === 'suv' || selectedTicketForCheckOut.vehicleType === 'sedan') {
          ratePerShift = selectedTicketForCheckOut.isVip ? 50000 : 30000;
        } else if (selectedTicketForCheckOut.vehicleType === 'electric') {
          ratePerShift = 20000;
        }

        const calculatedFee = diffShifts * ratePerShift;
        const targetUser = usersList.find(u => u.name === selectedTicketForCheckOut.customerName || u.phoneNumber === selectedTicketForCheckOut.phoneNumber) || currentUser;
        const walletBal = targetUser?.walletBalance ?? 200000;
        const isWalletSufficient = walletBal >= calculatedFee;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold">Thanh toán & Trả xe (Check-out)</h3>
                  <p className="text-xs text-slate-400">Vị trí ô đỗ: <strong className="text-emerald-400">{selectedTicketForCheckOut.slotNumber}</strong></p>
                </div>
                <button
                  onClick={() => setShowCheckOutModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ticket Summary */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Biển số xe:</span>
                  <span className="font-mono font-extrabold text-white text-base bg-slate-900 px-2.5 py-1 rounded border border-slate-700">{selectedTicketForCheckOut.licensePlate}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Loại xe / Hạng:</span>
                  <span className="font-semibold uppercase text-slate-200">{selectedTicketForCheckOut.vehicleType} {selectedTicketForCheckOut.isVip && '(VIP)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Khách gửi:</span>
                  <span className="font-medium text-slate-200">{selectedTicketForCheckOut.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Thời gian vào:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedTicketForCheckOut.checkInTime).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Thời gian đỗ:</span>
                  <span className="font-semibold">{diffHours < 1 ? 'Dưới 1 giờ' : `${diffHours.toFixed(1)} giờ`} ({diffShifts} ca đỗ)</span>
                </div>
              </div>

              {/* Total Fee & Points Badge */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Tổng phí thanh toán</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {calculatedFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-300 block">Tích lũy điểm</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> +{Number((calculatedFee / 20000).toFixed(2))} điểm
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Chọn hình thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('wallet')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'wallet'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <span>Ví tài khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('transfer')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'transfer'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-indigo-400" />
                    <span>Chuyển khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedPaymentMethod === 'cash'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <span>Tiền mặt</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Payment Method View */}
              {selectedPaymentMethod === 'wallet' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" /> Số dư ví ({targetUser?.name}):
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      {walletBal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {isWalletSufficient ? (
                    <div className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40 flex items-center justify-between">
                      <span>Số dư sau thanh toán:</span>
                      <strong className="font-mono text-white text-sm">{(walletBal - calculatedFee).toLocaleString('vi-VN')} đ</strong>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-amber-400 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-bold">Số dư ví không đủ thanh toán!</p>
                          <p className="text-[11px] text-slate-300">Cần {calculatedFee.toLocaleString('vi-VN')} đ (Còn thiếu {(calculatedFee - walletBal).toLocaleString('vi-VN')} đ).</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTopUpTargetUser(targetUser);
                          setTopUpAmount(Math.max(50000, calculatedFee - walletBal));
                          setShowTopUpModal(true);
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Nạp tiền vào ví ngay
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedPaymentMethod === 'transfer' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-300 font-medium">Quét mã VietQR bằng ứng dụng Ngân hàng / MOMO / ZaloPay (Tự động điền số tiền)</p>
                  <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700">
                    <img 
                      src={`https://img.vietqr.io/image/MB-7920141546131-compact2.png?amount=${calculatedFee}&addInfo=TT%20XE%20${encodeURIComponent(selectedTicketForCheckOut.licensePlate)}%20${selectedTicketForCheckOut.slotNumber}&accountName=NGUYEN%20HUU%20PHUOC`}
                      alt="Mã VietQR Thanh Toán"
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  </div>
                  <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-left font-mono">
                    <div className="flex justify-between"><span className="text-slate-400">Ngân hàng:</span><span className="text-slate-200 font-bold">MB Bank (TMCP Quân đội)</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Số tài khoản:</span><span className="text-indigo-400 font-bold text-sm">7920141546131</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Chủ tài khoản:</span><span className="text-slate-200 font-bold">NGUYEN HUU PHUOC</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Số tiền tự động:</span><span className="text-amber-400 font-bold">{calculatedFee.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Nội dung CK:</span><span className="text-emerald-400 font-bold">TT XE {selectedTicketForCheckOut.licensePlate}</span></div>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'cash' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <DollarSign className="w-5 h-5" /> Thanh toán Tiền mặt trực tiếp
                  </div>
                  <p>Nhân viên / Admin thu trực tiếp số tiền <strong className="text-white font-mono">{calculatedFee.toLocaleString('vi-VN')} đ</strong> từ khách hàng khi giao chìa khóa/xuất bãi.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckOutModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={selectedPaymentMethod === 'wallet' && !isWalletSufficient}
                  onClick={() => handleCheckOut(selectedTicketForCheckOut, selectedPaymentMethod)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
                    selectedPaymentMethod === 'wallet' && !isWalletSufficient
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận Trả xe & Thanh toán
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top-Up Wallet Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Nạp tiền vào Ví tài khoản
                </h3>
                <p className="text-xs text-slate-400">
                  Nạp cho: <strong className="text-white">{(topUpTargetUser || currentUser)?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => { setShowTopUpModal(false); setTopUpTargetUser(null); }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopUpWalletSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Chọn số tiền nạp nhanh (VNĐ)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setTopUpAmount(amt); setCustomTopUpInput(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                        topUpAmount === amt && !customTopUpInput
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      +{amt.toLocaleString('vi-VN')} đ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hoặc nhập số tiền tùy chỉnh (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={customTopUpInput}
                  onChange={(e) => { setCustomTopUpInput(e.target.value); }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {/* VietQR Transfer Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                <span className="text-xs text-slate-300 font-medium block">
                  Chuyển khoản VietQR nạp ví: <strong className="text-emerald-400 font-mono text-sm">{(customTopUpInput ? parseInt(customTopUpInput, 10) || 0 : topUpAmount).toLocaleString('vi-VN')} đ</strong>
                </span>
                <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700">
                  <img
                    src={`https://img.vietqr.io/image/MB-7920141546131-compact2.png?amount=${customTopUpInput ? parseInt(customTopUpInput, 10) || 0 : topUpAmount}&addInfo=NAP%20VI%20${encodeURIComponent((topUpTargetUser || currentUser)?.phoneNumber || (topUpTargetUser || currentUser)?.name || 'KH')}&accountName=NGUYEN%20HUU%20PHUOC`}
                    alt="VietQR Nạp Ví"
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
                <div className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-left font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">Ngân hàng:</span><span className="text-slate-200 font-bold">MB Bank (TMCP Quân đội)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Số tài khoản:</span><span className="text-indigo-400 font-bold">7920141546131</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Tên tài khoản:</span><span className="text-slate-200 font-bold">NGUYEN HUU PHUOC</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Nội dung:</span><span className="text-emerald-400 font-bold">NAP VI {(topUpTargetUser || currentUser)?.phoneNumber || (topUpTargetUser || currentUser)?.name}</span></div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowTopUpModal(false); setTopUpTargetUser(null); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận đã chuyển khoản & Nạp ví
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet History Modal */}
      {showWalletHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-white space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <History className="w-5 h-5 text-emerald-400" /> Lịch sử Biến động Ví tài khoản
                </h3>
                <p className="text-xs text-slate-400">Theo dõi chi tiết lịch sử nạp tiền và thanh toán phí gửi xe qua ví</p>
              </div>
              <button
                onClick={() => setShowWalletHistoryModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {walletTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">Chưa có giao dịch ví nào được ghi nhận.</div>
              ) : (
                walletTransactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${tx.type === 'topup' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {tx.type === 'topup' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{tx.userName} • {new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${tx.type === 'topup' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tx.type === 'topup' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Check-Out List Modal */}
      {showQuickCheckOutListModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-400" /> Lấy xe ra khỏi bãi (Check-out)
                </h3>
                <p className="text-xs text-slate-400">Chọn xe đang đỗ để thực hiện trả xe và giải phóng ô đỗ</p>
              </div>
              <button
                onClick={() => setShowQuickCheckOutListModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tickets.filter(t => !t.checkOutTime).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Không có xe nào đang đỗ trong bãi.
                </div>
              ) : (
                tickets.filter(t => !t.checkOutTime).map(t => (
                  <div key={t.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-emerald-400">Ô {t.slotNumber}</span>
                        <span className="font-bold text-slate-100 text-sm">{t.licensePlate}</span>
                        {t.isVip && <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">VIP</span>}
                      </div>
                      <p className="text-slate-400">{t.customerName} • Vào lúc: {new Date(t.checkInTime).toLocaleString('vi-VN')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowQuickCheckOutListModal(false);
                        setSelectedTicketForCheckOut(t);
                        setShowCheckOutModal(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2 rounded-lg transition shadow-md shadow-emerald-500/20"
                    >
                      Lấy xe ra
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowQuickCheckOutListModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-400" /> Chỉnh sửa hồ sơ cá nhân
                </h3>
                <p className="text-xs text-slate-400">Cập nhật thông tin tài khoản của bạn</p>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nhập họ tên của bạn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Giới tính</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận/huyện..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email tài khoản</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.email}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setSelectedBgTheme(currentUser.bgTheme || 'cyber-dark');
                    setCustomBgUrlInput(currentUser.bgCustomUrl || '');
                    setShowThemeModal(true);
                  }}
                  className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-indigo-400" /> Tùy chỉnh Phông nền Giao diện tài khoản
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Customizer Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Cài đặt Phông nền Giao diện</h3>
                  <p className="text-xs text-slate-400">Tùy chỉnh màu sắc & phông nền không gian làm việc cho tài khoản của bạn</p>
                </div>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {BG_THEMES.map((theme) => {
                const isSelected = selectedBgTheme === theme.id;
                const thumbUrl = theme.id === 'custom' 
                  ? (customBgUrlInput || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=400') 
                  : theme.imageUrl;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedBgTheme(theme.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="truncate">{theme.name}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${theme.badge}`}>
                        {isSelected ? 'Đang chọn' : 'Xem trước'}
                      </span>
                    </div>

                    {/* Wallpaper Thumbnail Image Preview */}
                    <div className="h-24 w-full rounded-lg overflow-hidden relative border border-slate-800 bg-slate-950">
                      {thumbUrl ? (
                        <img 
                          src={thumbUrl} 
                          alt={theme.name} 
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/aistudio/sunset_parking.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs italic">
                          Nhập URL ảnh bên dưới
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-tight">{theme.sub}</p>
                  </div>
                );
              })}
            </div>

            {selectedBgTheme === 'custom' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                <label className="block text-xs font-medium text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" /> Nhập URL Hình ảnh phông nền (Image URL)
                </label>
                <input
                  type="url"
                  value={customBgUrlInput}
                  onChange={(e) => setCustomBgUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1506521781263-d8422e82f27a..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 font-mono text-slate-200"
                />
                <p className="text-[11px] text-slate-400">Hỗ trợ các đường dẫn ảnh PNG, JPG, WebP trực tuyến từ Unsplash, Imgur hoặc Google Drive public.</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSaveBgTheme('cyber-dark', '')}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Khôi phục phông nền mặc định
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowThemeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBgTheme(selectedBgTheme, customBgUrlInput)}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Áp dụng Phông nền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {showEditSlotModal && selectedSlotForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" /> Chỉnh sửa ô đỗ {selectedSlotForEdit.slotNumber}
                </h3>
                <p className="text-xs text-slate-400">Thay đổi số ô hoặc chuyển đổi loại xe / khu vực</p>
              </div>
              <button
                onClick={() => setShowEditSlotModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Số ô đỗ</label>
                <input
                  type="text"
                  required
                  value={editSlotNumber}
                  onChange={(e) => setEditSlotNumber(e.target.value)}
                  placeholder="VD: A09, B05"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loại ô & Khu vực</label>
                <select
                  value={editSlotType}
                  onChange={(e) => setEditSlotType(e.target.value as SlotType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="car_standard">Khu A - Ô tô Thường (30k/ca - 7 tiếng)</option>
                  <option value="car_vip">Khu B - Ô tô VIP (50k/ca - 7 tiếng - Chỉ dành cho VIP)</option>
                  <option value="motorbike">Khu C - Xe máy (10k/ca - 7 tiếng)</option>
                  <option value="electric">Khu D - Xe điện & Sạc (20k/ca - 7 tiếng)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditSlotModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Lưu thay đổi ô đỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal for Admin */}
      {showManageUsersModal && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" /> Sửa hồ sơ người dùng
                </h3>
                <p className="text-xs text-slate-400">Cập nhật thông tin, quyền hạn hoặc điểm tích lũy</p>
              </div>
              <button
                onClick={() => setShowManageUsersModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManagedUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email (Không đổi)</label>
                <input
                  type="text"
                  disabled
                  value={uEmail}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vai trò (Role)</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  >
                    <option value="customer">Khách hàng (Customer)</option>
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={uPhone}
                    onChange={(e) => setUPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {uRole === 'customer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hạng thành viên</label>
                    <select
                      value={uTier}
                      onChange={(e) => setUTier(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="regular">Khách hàng Thường</option>
                      <option value="vip">Khách hàng VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Điểm tích lũy</label>
                    <input
                      type="number"
                      value={uPoints}
                      onChange={(e) => setUPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={uAddress}
                  onChange={(e) => setUAddress(e.target.value)}
                  placeholder="Địa chỉ khách hàng / nhân viên"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowManageUsersModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal for Admin */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-400" /> Thêm tài khoản mới
                </h3>
                <p className="text-xs text-slate-400">Tạo tài khoản mới cho Khách hàng, Nhân viên hoặc Admin</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Mật khẩu tạo mới"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vai trò (Role)</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {addRole === 'customer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hạng thành viên</label>
                    <select
                      value={addTier}
                      onChange={(e) => setAddTier(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    >
                      <option value="regular">Khách hàng Thường</option>
                      <option value="vip">Khách hàng VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Điểm tích lũy ban đầu</label>
                    <input
                      type="number"
                      value={addPoints}
                      onChange={(e) => setAddPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="Địa chỉ liên hệ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Thêm tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Xác nhận xóa tài khoản</h3>
                  <p className="text-xs text-slate-400">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản sau khỏi hệ thống?
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <p><span className="text-slate-400">Họ và tên:</span> <strong className="text-white ml-1">{userToDelete.name}</strong></p>
                <p><span className="text-slate-400">Email:</span> <strong className="text-emerald-400 ml-1">{userToDelete.email}</strong></p>
                <p><span className="text-slate-400">ID tài khoản:</span> <code className="text-purple-300 font-mono ml-1">{userToDelete.uid}</code></p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
