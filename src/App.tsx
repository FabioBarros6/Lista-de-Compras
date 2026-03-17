/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, Component, ReactNode } from 'react';
import { 
  Plus, 
  Search, 
  Menu, 
  Home, 
  ListTodo, 
  Tag, 
  User, 
  ArrowLeft, 
  MoreVertical, 
  ShoppingBasket, 
  Minus, 
  Trash2,
  Pencil,
  Share2,
  Archive,
  CheckCircle2,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  Smartphone,
  LogOut,
  LogIn,
  Camera,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  BarChart2,
  TrendingUp,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  CheckCircle,
  History
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  deleteField,
  orderBy,
  getDoc,
  getDocs,
  getDocFromServer,
  or
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // For now, we just log and alert or show a message in the UI
  // In a real app, we'd use a state to show a global error toast
};

type Category = 'Alimentos' | 'Higiene' | 'Limpeza' | 'Outros' | '';
type Unit = 'un' | 'kg' | 'g';

interface Item {
  id: string;
  name: string;
  category: Category;
  price?: number;
  quantity: number;
  unit: Unit;
}

const getItemTotal = (item: { price?: number, quantity: number, unit: Unit }) => {
  const price = item.price || 0;
  if (item.unit === 'un') {
    return price * item.quantity;
  }
  return price;
};

interface ShoppingList {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  name: string;
  date: string;
  items: Item[];
  image: string;
  description?: string;
  status: 'active' | 'archived';
  sharedWith?: Record<string, 'viewer' | 'editor'>;
  sharedEmails?: Record<string, string>;
  sharedNames?: Record<string, string>;
  createdAt?: any;
}

interface ListLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: any;
}

type View = 'LOGIN' | 'HOME' | 'LIST_OVERVIEW' | 'LIST_DETAILS' | 'ADD_ITEM' | 'EDIT_ITEM' | 'CREATE_LIST' | 'EDIT_LIST' | 'PROFILE' | 'ANALYSIS';

// --- Constants & Helpers ---

const getSmartGroceryImage = (name: string) => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('churrasco') || nameLower.includes('carne') || nameLower.includes('bbq')) 
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400&h=400'; // BBQ
  if (nameLower.includes('limpeza') || nameLower.includes('faxina') || nameLower.includes('detergente')) 
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400&h=400'; // Cleaning
  if (nameLower.includes('fruta') || nameLower.includes('feira') || nameLower.includes('vegetal') || nameLower.includes('hortifruti') || nameLower.includes('legume')) 
    return 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=400&h=400'; // Fruits
  if (nameLower.includes('bebida') || nameLower.includes('cerveja') || nameLower.includes('vinho') || nameLower.includes('festa') || nameLower.includes('suco') || nameLower.includes('refrigerante')) 
    return 'https://images.unsplash.com/photo-1563223552-30d01fda3ead?auto=format&fit=crop&q=80&w=400&h=400'; // Drinks
  if (nameLower.includes('higiene') || nameLower.includes('banho') || nameLower.includes('perfumaria') || nameLower.includes('shampoo')) 
    return 'https://images.unsplash.com/photo-1559594882-7b5514241da8?auto=format&fit=crop&q=80&w=400&h=400'; // Hygiene
  if (nameLower.includes('padaria') || nameLower.includes('pão') || nameLower.includes('café') || nameLower.includes('bolo')) 
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400&h=400'; // Bakery
  if (nameLower.includes('pet') || nameLower.includes('cachorro') || nameLower.includes('gato') || nameLower.includes('ração'))
    return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400&h=400'; // Pet
  if (nameLower.includes('eletrônico') || nameLower.includes('tecnologia') || nameLower.includes('casa'))
    return 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=400&h=400'; // Tech
  
  // Generic keywords that return icons instead of images
  if (nameLower.includes('sacola') || nameLower.includes('compras') || nameLower.includes('geral'))
    return 'icon:shopping-bag';
  if (nameLower.includes('carrinho') || nameLower.includes('mercado'))
    return 'icon:shopping-cart';
  if (nameLower.includes('dinheiro') || nameLower.includes('cifrão') || nameLower.includes('economia') || nameLower.includes('preço'))
    return 'icon:dollar-sign';
    
  // Default grocery images
  const defaults = [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=400', // Aisle
    'https://images.unsplash.com/photo-1573248639112-b39cc3ad45a2?auto=format&fit=crop&q=80&w=400&h=400', // Veggies
    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&q=80&w=400&h=400', // Cart
    'https://images.unsplash.com/photo-1506617564039-2f3b650ad701?auto=format&fit=crop&q=80&w=400&h=400', // Market
    'https://images.unsplash.com/photo-1543083477-4f7fe73d2424?auto=format&fit=crop&q=80&w=400&h=400'  // Bag
  ];
  
  // Use name length to pick a stable default
  const index = name.length > 0 ? name.length % defaults.length : 0;
  return defaults[index];
};

// --- Mock Data ---

const INITIAL_LISTS: ShoppingList[] = [
  {
    id: '1',
    ownerId: 'mock-user',
    status: 'active',
    name: 'Churrasco de Domingo',
    date: 'Oct 24, 2023',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400&h=400',
    items: [
      { id: 'i1', name: 'Picanha 1kg', category: 'Alimentos', price: 89.90, quantity: 2, unit: 'kg' },
      { id: 'i2', name: 'Carvão 5kg', category: 'Outros', price: 25.00, quantity: 1, unit: 'un' },
    ]
  },
  {
    id: '2',
    ownerId: 'mock-user',
    status: 'active',
    name: 'Compras do Mês',
    date: 'Oct 20, 2023',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=400',
    items: [
      { id: 'i3', name: 'Arroz Integral 5kg', category: 'Alimentos', price: 25.90, quantity: 1, unit: 'un' },
      { id: 'i4', name: 'Detergente de Coco', category: 'Limpeza', price: 2.50, quantity: 3, unit: 'un' },
    ]
  },
  {
    id: '3',
    ownerId: 'mock-user',
    status: 'active',
    name: 'Produtos de Limpeza',
    date: 'Oct 18, 2023',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400&h=400',
    items: [
      { id: 'i5', name: 'Sabonete Líquido Refil', category: 'Higiene', price: 12.40, quantity: 1, unit: 'un' },
    ]
  }
];

// --- Components ---

const ListThumbnail: React.FC<{ image: string, name: string, className?: string }> = ({ image, name, className = "w-16 h-16" }) => {
  if (image.startsWith('icon:')) {
    const iconName = image.split(':')[1];
    let Icon = ShoppingBag;
    let bgColor = 'bg-blue-50';
    let iconColor = 'text-blue-500';

    if (iconName === 'shopping-cart') {
      Icon = ShoppingCart;
      bgColor = 'bg-emerald-50';
      iconColor = 'text-emerald-500';
    } else if (iconName === 'dollar-sign') {
      Icon = DollarSign;
      bgColor = 'bg-amber-50';
      iconColor = 'text-amber-500';
    }

    return (
      <div className={`${className} rounded-xl ${bgColor} flex items-center justify-center border border-slate-100`}>
        <Icon className={iconColor} size={className.includes('w-24') ? 40 : 28} />
      </div>
    );
  }

  return (
    <div className={`${className} rounded-xl overflow-hidden bg-slate-100 border border-slate-100`}>
      <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>('LOGIN');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [logs, setLogs] = useState<ListLog[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setCurrentView('HOME');
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email?.toLowerCase(),
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.error("Error syncing user profile:", err);
        });
      } else {
        setCurrentView('LOGIN');
      }
    }, (error: any) => {
      console.error("Auth state change error:", error);
      if (error.code === 'auth/invalid-credential' || error.message?.includes('auth/invalid-credential')) {
        signOut(auth).then(() => {
          window.location.reload();
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener for Lists
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline') || error.code === 'failed-precondition') {
          console.error("Please check your Firebase configuration. The client appears to be offline or misconfigured.");
        }
      }
    };
    testConnection();

    if (!user) {
      setLists([]);
      return;
    }

    const q = query(
      collection(db, 'lists'),
      or(
        where('ownerId', '==', user.uid),
        where(`sharedWith.${user.uid}`, 'in', ['viewer', 'editor'])
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("onSnapshot received data, docs count:", snapshot.docs.length);
      const listsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShoppingList[];
      
      // Sort client-side to avoid index requirements
      const sortedLists = [...listsData].sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log("Sorted lists count:", sortedLists.length);
      setLists(sortedLists);
    }, (error) => {
      console.error("onSnapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'lists');
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Listener for Logs
  useEffect(() => {
    if (!selectedListId || !user) {
      setLogs([]);
      return;
    }

    const q = query(
      collection(db, 'lists', selectedListId, 'logs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ListLog[];
      setLogs(logsData);
    }, (error) => {
      console.error("Logs onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [selectedListId]);

  const addListLog = async (listId: string, action: string, details: string) => {
    if (!user) return;
    try {
      const logsRef = collection(db, 'lists', listId, 'logs');
      await addDoc(logsRef, {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        userEmail: user.email || '',
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding log:", error);
    }
  };

  const selectedList = useMemo(() => 
    lists.find(l => l.id === selectedListId), 
    [lists, selectedListId]
  );

  const selectedItem = useMemo(() => 
    selectedList?.items.find(i => i.id === selectedItemId),
    [selectedList, selectedItemId]
  );

  const navigateTo = (view: View, listId: string | null = null, itemId: string | null = null) => {
    if (listId) setSelectedListId(listId);
    if (itemId) setSelectedItemId(itemId);
    setCurrentView(view);
  };

  const handleSaveList = React.useCallback(async (listData: Partial<ShoppingList>) => {
    console.log("handleSaveList called with:", listData);
    if (!user) {
      console.error("No user found in handleSaveList");
      throw new Error("Usuário não autenticado.");
    }

    const path = 'lists';
    try {
      if (currentView === 'EDIT_LIST' && selectedListId) {
        console.log("Updating existing list:", selectedListId);
        const listRef = doc(db, path, selectedListId);
        await updateDoc(listRef, {
          ...listData,
          updatedAt: serverTimestamp()
        });
        setCurrentView('LIST_OVERVIEW');
        addListLog(selectedListId, 'Alterou a lista', `Nome: ${listData.name || selectedList?.name}`);
      } else {
        console.log("Creating new list");
        const listName = listData.name || '';
        const newListRef = doc(collection(db, path));
        await setDoc(newListRef, {
          id: newListRef.id,
          ownerId: user.uid,
          ownerEmail: user.email || '',
          name: listName,
          description: listData.description || '',
          date: new Date().toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' }),
          image: listData.image || getSmartGroceryImage(listName),
          items: [],
          status: 'active',
          sharedWith: {},
          sharedEmails: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCurrentView('LIST_OVERVIEW');
        addListLog(newListRef.id, 'Criou a lista', `Nome: ${listName}`);
        console.log("New list created with ID:", newListRef.id);
      }
      return true;
    } catch (error: any) {
      console.error("Error in handleSaveList:", error);
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }, [user, currentView, selectedListId, selectedList]);

  const handleArchiveList = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const newStatus = list.status === 'archived' ? 'active' : 'archived';
    try {
      await updateDoc(doc(db, 'lists', listId), {
        status: newStatus
      });
      await addListLog(listId, newStatus === 'archived' ? 'Arquivou a lista' : 'Ativou a lista', '');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lists/${listId}`);
    }
  };

  const handleShareList = async (listId: string, emailsInput: string, permission: 'viewer' | 'editor') => {
    try {
      const emails = emailsInput.split(/[,;]/).map(e => e.trim()).filter(e => e !== '');
      if (emails.length === 0) throw new Error('Por favor, insira ao menos um e-mail.');

      console.log("Sharing list:", listId, "with emails:", emails, "permission:", permission);
      
      const listRef = doc(db, 'lists', listId);
      const listDoc = await getDoc(listRef);
      if (!listDoc.exists()) throw new Error('Lista não encontrada.');

      const updates: any = {
        updatedAt: serverTimestamp()
      };

      for (const email of emails) {
        // 1. Find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.warn("User not found with email:", email);
          // We could skip or throw. Let's throw for now to inform the user.
          throw new Error(`Usuário não encontrado com o e-mail: ${email}`);
        }
        
        const targetUser = querySnapshot.docs[0];
        const targetUserId = targetUser.id;
        const targetUserData = targetUser.data();
        
        if (targetUserId === user?.uid) {
          continue; // Skip self
        }
        
        updates[`sharedWith.${targetUserId}`] = permission;
        updates[`sharedEmails.${targetUserId}`] = email.toLowerCase();
        if (targetUserData.displayName) {
          updates[`sharedNames.${targetUserId}`] = targetUserData.displayName;
        } else if (targetUserData.username) {
          updates[`sharedNames.${targetUserId}`] = targetUserData.username;
        }
      }
      
      await updateDoc(listRef, updates);
      await addListLog(listId, 'Compartilhou a lista', `Com: ${emails.join(', ')}`);
      console.log("List shared successfully with multiple users");
    } catch (error: any) {
      console.error("Error in handleShareList:", error);
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.UPDATE, `lists/${listId}`);
      }
      throw error;
    }
  };

  const handleUnshareList = async (listId: string, targetUserId: string) => {
    try {
      const listRef = doc(db, 'lists', listId);
      const updates: any = {
        updatedAt: serverTimestamp(),
        [`sharedWith.${targetUserId}`]: deleteField(),
        [`sharedEmails.${targetUserId}`]: deleteField(),
        [`sharedNames.${targetUserId}`]: deleteField()
      };
      await updateDoc(listRef, updates);
      await addListLog(listId, 'Removeu acesso', `Usuário ID: ${targetUserId}`);
    } catch (error) {
      console.error("Error unsharing list:", error);
      handleFirestoreError(error, OperationType.UPDATE, `lists/${listId}`);
    }
  };

  const handleUpdatePermission = async (listId: string, targetUserId: string, newPermission: 'viewer' | 'editor') => {
    try {
      const listRef = doc(db, 'lists', listId);
      const updates: any = {
        updatedAt: serverTimestamp(),
        [`sharedWith.${targetUserId}`]: newPermission
      };
      await updateDoc(listRef, updates);
      await addListLog(listId, 'Alterou permissão', `Usuário ID: ${targetUserId} para ${newPermission}`);
    } catch (error) {
      console.error("Error updating permission:", error);
      handleFirestoreError(error, OperationType.UPDATE, `lists/${listId}`);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lists', id));
      if (selectedListId === id) setSelectedListId(null);
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const handleSaveItem = React.useCallback(async (itemData: Partial<Item>) => {
    if (!selectedListId || !selectedList) return false;
    
    const path = `lists/${selectedListId}`;
    try {
      const listRef = doc(db, 'lists', selectedListId);
      let newItems;
      
      // Clean up undefined values from itemData to avoid Firestore errors
      const cleanItemData = Object.fromEntries(
        Object.entries(itemData).filter(([_, v]) => v !== undefined)
      );
      
      if (currentView === 'EDIT_ITEM' && selectedItemId) {
        newItems = selectedList.items.map(i => i.id === selectedItemId ? { ...i, ...cleanItemData } : i);
      } else {
        const newItem: Item = {
          id: Math.random().toString(36).substr(2, 9),
          name: cleanItemData.name as string || '',
          category: cleanItemData.category as Category || 'Outros',
          quantity: cleanItemData.quantity as number || 1,
          unit: cleanItemData.unit as Unit || 'un'
        };
        if (cleanItemData.price !== undefined) {
          newItem.price = cleanItemData.price as number;
        }
        newItems = [...selectedList.items, newItem];
      }
      
      await updateDoc(listRef, {
        items: newItems,
        updatedAt: serverTimestamp()
      });
      const action = currentView === 'EDIT_ITEM' ? 'Editou item' : 'Adicionou item';
      setCurrentView('LIST_DETAILS');
      addListLog(selectedListId, action, cleanItemData.name as string || '');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  }, [selectedListId, selectedList, currentView, selectedItemId]);

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedListId || !selectedList) return;
    try {
      const listRef = doc(db, 'lists', selectedListId);
      const itemToDelete = selectedList.items.find(i => i.id === itemId);
      const newItems = selectedList.items.filter(i => i.id !== itemId);
      await updateDoc(listRef, {
        items: newItems,
        updatedAt: serverTimestamp()
      });
      await addListLog(selectedListId, 'Removeu item', itemToDelete?.name || 'Item');
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('LOGIN');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-[100dvh] shadow-2xl relative flex flex-col">
        <AnimatePresence mode="wait">
          {currentView === 'LOGIN' && (
            <LoginView key="login" onLogin={() => navigateTo('HOME')} />
          )}
          {currentView === 'HOME' && (
            <HomeView 
              key="home" 
              user={user}
              lists={lists} 
              onCreateList={() => navigateTo('CREATE_LIST')} 
              onViewLists={() => navigateTo('LIST_OVERVIEW')}
              onProfileClick={() => navigateTo('PROFILE')}
            />
          )}
          {currentView === 'ANALYSIS' && (
            <AnalysisView lists={lists} />
          )}
          {currentView === 'PROFILE' && (
            <ProfileView 
              key="profile" 
              user={user} 
              onLogout={handleLogout}
              onBack={() => navigateTo('HOME')}
            />
          )}
          {currentView === 'LIST_OVERVIEW' && (
            <ListView 
              key="overview" 
              user={user}
              lists={lists} 
              onSelectList={(id) => navigateTo('LIST_DETAILS', id)}
              onCreateList={() => navigateTo('CREATE_LIST')}
              onEditList={(id) => navigateTo('EDIT_LIST', id)}
              onDeleteList={handleDeleteList}
              onProfileClick={() => navigateTo('PROFILE')}
            />
          )}
          {currentView === 'LIST_DETAILS' && selectedList && (
            <DetailsView 
              key="details" 
              user={user}
              list={selectedList} 
              logs={logs}
              onBack={() => navigateTo('LIST_OVERVIEW')}
              onAddItem={() => navigateTo('ADD_ITEM')}
              onEditItem={(itemId) => navigateTo('EDIT_ITEM', selectedListId, itemId)}
              onDeleteItem={handleDeleteItem}
              onProfileClick={() => navigateTo('PROFILE')}
              onArchiveList={() => handleArchiveList(selectedListId!)}
              onShareList={(email, permission) => handleShareList(selectedListId!, email, permission)}
              onUnshareList={(uid) => handleUnshareList(selectedListId!, uid)}
              onUpdatePermission={(uid, perm) => handleUpdatePermission(selectedListId!, uid, perm)}
            />
          )}
          {(currentView === 'ADD_ITEM' || currentView === 'EDIT_ITEM') && (
            <AddItemView 
              key="add-item" 
              initialData={currentView === 'EDIT_ITEM' ? selectedItem : undefined}
              onBack={() => navigateTo('LIST_DETAILS')}
              onSave={handleSaveItem}
            />
          )}
          {(currentView === 'CREATE_LIST' || currentView === 'EDIT_LIST') && (
            <CreateListView 
              key="create-list" 
              initialData={currentView === 'EDIT_LIST' ? selectedList : undefined}
              onBack={() => navigateTo('LIST_OVERVIEW')}
              onSave={handleSaveList}
            />
          )}
        </AnimatePresence>

        {/* Bottom Nav - Only visible on main screens */}
        {(currentView === 'HOME' || currentView === 'LIST_OVERVIEW' || currentView === 'LIST_DETAILS' || currentView === 'PROFILE' || currentView === 'ANALYSIS') && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center h-20 px-4 z-50">
            <NavItem icon={<Home size={24} />} label="Início" active={currentView === 'HOME'} onClick={() => navigateTo('HOME')} />
            <NavItem icon={<ListTodo size={24} />} label="Listas" active={currentView === 'LIST_OVERVIEW' || currentView === 'LIST_DETAILS'} onClick={() => navigateTo('LIST_OVERVIEW')} />
            <NavItem icon={<BarChart2 size={24} />} label="Análises" active={currentView === 'ANALYSIS'} onClick={() => navigateTo('ANALYSIS')} />
            <NavItem icon={<User size={24} />} label="Perfil" active={currentView === 'PROFILE'} onClick={() => navigateTo('PROFILE')} />
          </nav>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 transition-colors ${active ? 'text-blue-500' : 'text-slate-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// --- Views ---

const LoginView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'O e-mail informado não é válido. Verifique se digitou corretamente.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada. Entre em contato com o suporte.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado. Verifique o e-mail ou crie uma nova conta.';
      case 'auth/wrong-password':
        return 'Senha incorreta. Tente novamente ou recupere sua senha.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Tente fazer login.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'O login com e-mail e senha não está habilitado.';
      case 'auth/popup-closed-by-user':
        return 'O login foi cancelado. Tente novamente.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet.';
      case 'auth/invalid-credential':
        return 'E-mail ou senha inválidos.';
      case 'auth/invalid-api-key':
        return 'Erro de configuração: Chave de API inválida.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.';
      case 'auth/internal-error':
        return 'Erro interno do Firebase. Tente novamente.';
      case 'auth/admin-restricted-operation':
        return 'Operação restrita a administradores.';
      default:
        return `Erro inesperado (${errorCode}). Tente novamente mais tarde.`;
    }
  };

  const handleAuth = async () => {
    setError('');
    setSuccessMessage('');
    
    if (!email.trim() || !password.trim()) {
      setError('Os campos de e-mail e senha não podem ficar vazios.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setSuccessMessage('Conta criada! Enviamos um e-mail de verificação para ' + email + '. Por favor, verifique sua caixa de entrada.');
        // Optional: you could sign out the user here if you want to force verification
        // await signOut(auth);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin();
      }
    } catch (err: any) {
      console.error("Auth Error Code:", err.code);
      console.error("Auth Error Message:", err.message);
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="w-10"></div>
        <h2 className="text-lg font-bold">{isRegistering ? 'Criar Conta' : 'Entrar'}</h2>
        <div className="w-10"></div>
      </div>

      <div className="relative aspect-[3/2] rounded-2xl bg-blue-50 overflow-hidden mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent"></div>
        <div className="z-10 flex flex-col items-center">
          <ShoppingBasket size={80} className="text-blue-500 mb-2" />
          <div className="h-1.5 w-24 bg-blue-500/20 rounded-full"></div>
        </div>
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000" 
          alt="Grocery basket"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
      </div>

      <p className="text-slate-500 text-center mb-8">
        {isRegistering 
          ? 'Crie sua conta para começar a organizar suas compras' 
          : 'Faça login para sincronizar suas listas de compras em todos os seus dispositivos'}
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
          {successMessage}
        </div>
      )}

      <div className="space-y-4 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" 
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha" 
              className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
            <Eye className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" size={20} />
          </div>
        </div>
        {!isRegistering && (
          <div className="flex justify-end">
            <button className="text-blue-500 text-sm font-semibold hover:underline">Esqueceu a senha?</button>
          </div>
        )}
      </div>

      <button 
        onClick={handleAuth}
        disabled={loading}
        className="w-full h-14 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mb-8 active:scale-[0.98]"
      >
        {loading ? 'Processando...' : isRegistering ? 'Criar Conta' : 'Entrar'} 
        {!loading && <LogIn size={20} />}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-slate-200"></div>
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ou continue com</span>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={handleGoogleLogin}
          className="flex-1 h-14 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span className="font-semibold text-sm">Google</span>
        </button>
        <button className="flex-1 h-14 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <Smartphone size={20} />
          <span className="font-semibold text-sm">Apple</span>
        </button>
      </div>

      <p className="text-center text-slate-500 text-sm mt-auto">
        {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'} 
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-blue-500 font-bold ml-1 hover:underline"
        >
          {isRegistering ? 'Entrar' : 'Criar conta'}
        </button>
      </p>
    </motion.div>
  );
}

const HomeView: React.FC<{ 
  user: FirebaseUser | null,
  lists: ShoppingList[], 
  onCreateList: () => void, 
  onViewLists: () => void,
  onProfileClick: () => void
}> = ({ user, lists, onCreateList, onViewLists, onProfileClick }) => {
  const recentLists = lists.slice(0, 2);
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error('Error resending verification email:', error);
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-6 pb-24"
    >
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Olá, {firstName}!</h1>
          <p className="text-slate-500 text-sm">Pronto para as compras de hoje?</p>
        </div>
        <button 
          onClick={onProfileClick}
          className="w-12 h-12 rounded-full bg-blue-500 overflow-hidden flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            firstName.substring(0, 2).toUpperCase()
          )}
        </button>
      </header>

      {user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password') && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-amber-500">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 text-sm">Verifique seu e-mail</h4>
              <p className="text-amber-700 text-xs mt-1">
                Sua conta ainda não foi verificada. Verifique seu e-mail para garantir a segurança dos seus dados.
              </p>
              <button 
                onClick={handleResendEmail}
                disabled={resending || resendSuccess}
                className="mt-3 text-xs font-bold text-amber-900 underline disabled:opacity-50"
              >
                {resending ? 'Enviando...' : resendSuccess ? 'E-mail enviado!' : 'Reenviar e-mail de verificação'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-8">
        <button 
          onClick={onCreateList}
          className="p-6 bg-blue-500 rounded-3xl text-white flex flex-col gap-4 shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Plus size={28} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold">Criar Nova Lista</h3>
            <p className="text-white/70 text-sm">Organize suas compras de forma rápida</p>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Listas Recentes</h3>
        <button onClick={onViewLists} className="text-blue-500 text-sm font-bold hover:underline">Ver todas</button>
      </div>

      <div className="space-y-4">
        {recentLists.map(list => (
          <div 
            key={list.id}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group"
          >
            <ListThumbnail image={list.image} name={list.name} />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{list.name}</h4>
              <p className="text-xs text-slate-400">{list.date} • {list.items.length} itens</p>
            </div>
            <button onClick={() => onViewLists()} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
              <ArrowLeft className="rotate-180" size={20} />
            </button>
          </div>
        ))}
        {lists.length === 0 && (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">Nenhuma lista criada ainda.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const ListView: React.FC<{ 
  user: FirebaseUser | null,
  lists: ShoppingList[], 
  onSelectList: (id: string) => void, 
  onCreateList: () => void,
  onEditList: (id: string) => void,
  onDeleteList: (id: string) => void,
  onProfileClick: () => void
}> = ({ user, lists, onSelectList, onCreateList, onEditList, onDeleteList, onProfileClick }) => {
  const avatarName = user?.displayName || user?.email?.split('@')[0] || 'U';
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'shared'>('active');

  const filteredLists = lists.filter(list => {
    if (activeTab === 'active') return list.ownerId === user?.uid && list.status !== 'archived';
    if (activeTab === 'archived') return list.ownerId === user?.uid && list.status === 'archived';
    if (activeTab === 'shared') return list.ownerId !== user?.uid;
    return true;
  });
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full pb-24"
    >
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100">
        <button 
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full bg-blue-500 overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-sm active:scale-95 transition-transform"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            avatarName.substring(0, 2).toUpperCase()
          )}
        </button>
        <h1 className="text-lg font-bold flex-1 ml-4">Minhas Listas</h1>
        <button className="p-2 rounded-full bg-slate-100 text-slate-600"><Search size={24} /></button>
      </header>

      <div className="px-4 pt-4 mb-4">
        <div className="flex border-b border-slate-100 gap-6 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-3 border-b-2 transition-all whitespace-nowrap text-sm ${activeTab === 'active' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 font-medium'}`}
          >
            Minhas Listas
          </button>
          <button 
            onClick={() => setActiveTab('archived')}
            className={`pb-3 border-b-2 transition-all whitespace-nowrap text-sm ${activeTab === 'archived' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 font-medium'}`}
          >
            Arquivadas
          </button>
          <button 
            onClick={() => setActiveTab('shared')}
            className={`pb-3 border-b-2 transition-all whitespace-nowrap text-sm ${activeTab === 'shared' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 font-medium'}`}
          >
            Compartilhadas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {filteredLists.map(list => (
          <div 
            key={list.id}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
            onClick={() => onSelectList(list.id)}
          >
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-0.5">{list.name}</h3>
                  {list.ownerId !== user?.uid ? (
                    <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold uppercase mb-1">
                      <Users size={10} /> Compartilhada {list.ownerEmail ? `por ${list.ownerEmail}` : ''}
                    </div>
                  ) : (
                    list.sharedWith && Object.keys(list.sharedWith).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase mb-1">
                        <Users size={10} /> Compartilhada com: {
                          Object.keys(list.sharedWith).map(uid => list.sharedNames?.[uid] || list.sharedEmails?.[uid] || 'Usuário').join(', ')
                        }
                      </div>
                    )
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(list.ownerId === user?.uid || list.sharedWith?.[user?.uid || ''] === 'editor') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditList(list.id); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {list.ownerId === user?.uid && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">{list.date} • R$ {list.items.reduce((acc, i) => acc + getItemTotal(i), 0).toFixed(2)}</p>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors">Abrir</button>
                <span className="text-[10px] text-slate-400 font-medium uppercase">{list.items.length} itens</span>
              </div>
            </div>
            <ListThumbnail image={list.image} name={list.name} className="w-24 h-24" />
          </div>
        ))}
        {filteredLists.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">Nenhuma lista encontrada nesta categoria.</p>
          </div>
        )}
      </div>

      <button 
        onClick={onCreateList}
        className="fixed bottom-24 left-[calc(50%+6rem)] md:left-[calc(50%+10rem)] -translate-x-full w-14 h-14 bg-blue-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 z-50"
      >
        <Plus size={32} />
      </button>
    </motion.div>
  );
}

const DetailsView: React.FC<{ 
  user: FirebaseUser | null,
  list: ShoppingList, 
  logs: ListLog[],
  onBack: () => void, 
  onAddItem: () => void,
  onEditItem: (id: string) => void,
  onDeleteItem: (id: string) => void,
  onProfileClick: () => void,
  onArchiveList: () => void,
  onShareList: (email: string, permission: 'viewer' | 'editor') => Promise<void>,
  onUnshareList: (uid: string) => Promise<void>,
  onUpdatePermission: (uid: string, permission: 'viewer' | 'editor') => Promise<void>
}> = ({ user, list, logs, onBack, onAddItem, onEditItem, onDeleteItem, onProfileClick, onArchiveList, onShareList, onUnshareList, onUpdatePermission }) => {
  const total = list.items.reduce((acc, i) => acc + getItemTotal(i), 0);
  const totalItems = list.items.reduce((acc, i) => acc + (i.unit === 'un' ? i.quantity : 1), 0);
  const avatarName = user?.displayName || user?.email?.split('@')[0] || 'U';
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'viewer' | 'editor'>('viewer');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    if (!shareEmail) return;
    setSharing(true);
    setShareError('');
    setShareSuccess(false);
    try {
      await onShareList(shareEmail, sharePermission);
      setShareSuccess(true);
      setShareEmail('');
      setTimeout(() => {
        setShowShareModal(false);
        setShareSuccess(false);
      }, 2000);
    } catch (err: any) {
      setShareError(err.message || 'Erro ao compartilhar lista.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full pb-40"
    >
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-blue-500"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex-1 text-center">{list.name}</h1>
        <button 
          onClick={onProfileClick}
          className="w-10 h-10 rounded-full bg-blue-500 overflow-hidden flex items-center justify-center text-white font-bold text-xs shadow-sm active:scale-95 transition-transform"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            avatarName.substring(0, 2).toUpperCase()
          )}
        </button>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
          <ListThumbnail image={list.image} name={list.name} className="w-20 h-20" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{list.name}</h2>
              {list.status === 'archived' && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-black rounded-full uppercase">Arquivada</span>
              )}
            </div>
            <p className="text-slate-500 text-sm">{list.date}</p>
            {list.description && <p className="text-slate-400 text-xs mt-1 line-clamp-1">{list.description}</p>}
          </div>
        </div>

        {list.ownerId === user?.uid && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-xs hover:bg-blue-100 transition-colors"
            >
              <Share2 size={16} /> Compartilhar
            </button>
            <button 
              onClick={onArchiveList}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-xs transition-colors ${
                list.status === 'archived' 
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {list.status === 'archived' ? <CheckCircle2 size={16} /> : <Archive size={16} />}
              {list.status === 'archived' ? 'Concluir / Ativar' : 'Arquivar'}
            </button>
          </div>
        )}

        {/* Shared With Section */}
        {list.sharedEmails && Object.keys(list.sharedEmails).length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Compartilhada com</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(list.sharedEmails).map(([uid, email]) => (
                <div key={uid} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                    {(email as string).substring(0, 1).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-600 font-medium">{email}</span>
                  <span className="text-[8px] font-black text-blue-400 uppercase">{list.sharedWith?.[uid]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Itens Adicionados</h3>
          <span className="px-2 py-1 bg-blue-50 text-blue-500 text-[10px] font-black rounded-full">{list.items.length} ITENS</span>
        </div>

        <div className="space-y-3">
          {list.items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-blue-50/50 shadow-sm group">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditItem(item.id)}
                      className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    item.category === 'Alimentos' ? 'bg-blue-100 text-blue-600' :
                    item.category === 'Limpeza' ? 'bg-green-100 text-green-600' :
                    item.category === 'Higiene' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400">{item.quantity} {item.unit}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {item.price !== undefined ? `R$ ${getItemTotal(item).toFixed(2)}` : 'R$ --'}
                </p>
                {item.price !== undefined && item.unit === 'un' && item.quantity > 1 && (
                  <p className="text-[10px] text-slate-400">R$ {item.price.toFixed(2)} /un</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button 
            onClick={onAddItem}
            className="flex items-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-50 transition-colors"
          >
            <Plus size={20} /> Adicionar Item
          </button>
        </div>

        {/* Activity Log Section */}
        <div className="mt-12 mb-8">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center justify-between w-full py-4 border-t border-slate-100"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <History size={18} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Histórico de Atividades</h3>
            </div>
            <Plus size={16} className={`text-slate-400 transition-transform ${showLogs ? 'rotate-45' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showLogs && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-2">
                  {logs.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-4 italic">Nenhuma atividade registrada ainda.</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <User size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <p className="text-xs font-bold text-slate-700 truncate">{log.userName}</p>
                            <span className="text-[9px] text-slate-400 whitespace-nowrap">
                              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-medium text-blue-500">{log.action}</span>
                            {log.details && <span className="ml-1">: {log.details}</span>}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total de Itens</span>
            <span className="text-lg font-bold text-slate-900">{totalItems} unidades</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Valor Total</span>
            <span className="text-2xl font-black text-blue-500">R$ {total.toFixed(2)}</span>
          </div>
        </div>
        <button className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          <ShoppingCart size={20} /> Finalizar Lista
        </button>
      </footer>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Compartilhar Lista</h3>
                <button onClick={() => setShowShareModal(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">E-mail(s) do(s) convidado(s)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="exemplo@email.com, outro@email.com"
                      className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Separe múltiplos e-mails por vírgula ou ponto e vírgula.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nível de Permissão</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSharePermission('viewer')}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        sharePermission === 'viewer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <ShieldCheck size={20} />
                      <span className="text-[10px] font-bold">Visualizador</span>
                    </button>
                    <button 
                      onClick={() => setSharePermission('editor')}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        sharePermission === 'editor' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <ShieldAlert size={20} />
                      <span className="text-[10px] font-bold">Editor</span>
                    </button>
                  </div>
                </div>

                {shareError && <p className="text-xs text-red-500 font-medium">{shareError}</p>}
                {shareSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Lista compartilhada com sucesso!
                  </motion.div>
                )}
              </div>

              <button 
                onClick={handleShare}
                disabled={sharing || !shareEmail || shareSuccess}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
              >
                {sharing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : shareSuccess ? (
                  <>
                    <CheckCircle2 size={18} /> Enviado
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> Convidar
                  </>
                )}
              </button>

              {/* Existing Shared Users */}
              {(list.sharedEmails || list.sharedWith || list.sharedNames) && (Object.keys(list.sharedEmails || {}).length > 0 || Object.keys(list.sharedWith || {}).length > 0) && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compartilhada com</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Combine sharedWith, sharedEmails and sharedNames to be robust */}
                    {Object.keys(list.sharedWith || {}).map((uid) => {
                      const name = list.sharedNames?.[uid];
                      const email = list.sharedEmails?.[uid];
                      const displayName = name || email || 'Usuário compartilhado';
                      const permission = list.sharedWith?.[uid];
                      
                      return (
                        <div key={uid} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                              {displayName.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs text-slate-700 font-bold truncate">{displayName}</span>
                              {name && email && <span className="text-[9px] text-slate-400 truncate">{email}</span>}
                              <button 
                                onClick={() => onUpdatePermission(uid, permission === 'editor' ? 'viewer' : 'editor')}
                                className="text-[9px] text-blue-500 hover:text-blue-700 uppercase font-black tracking-tighter flex items-center gap-1 transition-colors"
                                title="Clique para alterar permissão"
                              >
                                {permission === 'editor' ? 'Editor' : 'Visualizador'}
                                <Pencil size={8} />
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={() => onUnshareList(uid)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-2"
                            title="Remover acesso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

const AddItemView: React.FC<{ 
  onBack: () => void, 
  onSave: (item: Partial<Item>) => Promise<boolean>,
  initialData?: Item
}> = ({ onBack, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Alimentos');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [quantity, setQuantity] = useState<string>(initialData?.quantity?.toString() || '1');
  const [unit, setUnit] = useState<Unit>(initialData?.unit || 'un');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name) {
      setError('Por favor, informe o nome do item.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const parsedPrice = price ? parseFloat(price.replace(',', '.')) : undefined;
    
    const success = await onSave({
      name,
      category,
      price: isNaN(parsedPrice as number) ? undefined : parsedPrice,
      quantity: parseFloat(quantity) || 1,
      unit
    });
    
    if (!success) {
      setError('Erro ao salvar item. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full"
    >
      <header className="p-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex-1 text-center">{initialData ? 'Editar Item' : 'Adicionar Item'}</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto text-slate-900">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nome do Item</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Arroz Integral 5kg" 
            className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Categoria</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
          >
            <option value="">Nenhuma</option>
            <option value="Alimentos">Alimentos</option>
            <option value="Higiene">Higiene Pessoal</option>
            <option value="Limpeza">Produtos de Limpeza</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Preço Unitário</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
            <input 
              type="number" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00" 
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBasket size={20} />
            </div>
            <span className="font-bold">Quantidade</span>
          </div>
          <div className="flex items-center gap-4 bg-white px-3 py-2 rounded-full border border-slate-200 shadow-sm">
            <button 
              onClick={() => setQuantity(prev => (Math.max(0, parseFloat(prev) - 1)).toString())}
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="flex items-center gap-1">
              <input 
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="font-bold text-lg w-16 text-center outline-none bg-transparent"
                min="0"
                step={unit === 'kg' ? '0.1' : '1'}
              />
              <select 
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md outline-none appearance-none cursor-pointer"
              >
                <option value="un">un</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
            <button 
              onClick={() => setQuantity(prev => (parseFloat(prev || '0') + 1).toString())}
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <footer className="p-6 border-t border-slate-100 bg-white">
        <div className="mb-4 flex justify-between items-center px-1">
          <span className="text-sm text-slate-400 font-medium">Total estimado</span>
          <span className="text-xl font-black text-blue-500">
            R$ {getItemTotal({ 
              price: price ? parseFloat(price.replace(',', '.')) : 0, 
              quantity: parseFloat(quantity) || 1, 
              unit 
            }).toFixed(2)}
          </span>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Plus size={20} /> {initialData ? 'Salvar Alterações' : 'Adicionar à Lista'}
            </>
          )}
        </button>
      </footer>
    </motion.div>
  );
}

const CreateListView: React.FC<{ 
  onBack: () => void, 
  onSave: (list: Partial<ShoppingList>) => Promise<boolean>,
  initialData?: ShoppingList
}> = ({ onBack, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    console.log("CreateListView: handleSave clicked, name:", name);
    if (!name) {
      setError('Por favor, dê um nome para sua lista.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    console.log("CreateListView: calling onSave...");
    try {
      await onSave({
        name,
        description,
      });
      console.log("CreateListView: onSave completed successfully");
      setLoading(false);
    } catch (err: any) {
      console.error("CreateListView: Error during onSave:", err);
      let message = 'Ocorreu um erro ao salvar a lista.';
      if (err.code === 'permission-denied') {
        message = 'Permissão negada. Verifique as regras de segurança.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col h-full"
    >
      <header className="p-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold flex-1 text-center">{initialData ? 'Editar Lista' : 'Criar Nova Lista'}</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        <div className="flex flex-col items-center gap-4">
          <ListThumbnail image={getSmartGroceryImage(name)} name={name} className="w-24 h-24" />
          <p className="text-xs text-slate-400 font-medium">Prévia da imagem da lista</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nome da Lista</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Compras Semanais" 
              className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Descrição (Opcional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes sobre sua lista..." 
              className="w-full min-h-[144px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Sugestões de categoria</p>
            <div className="flex flex-wrap gap-2">
              {['Mercado', 'Tarefas', 'Viagem', 'Trabalho'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setName(tag)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="p-6 border-t border-slate-100 bg-white">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle size={20} /> {initialData ? 'Salvar Alterações' : 'Criar Lista'}
            </>
          )}
        </button>
      </footer>
    </motion.div>
  );
}

const AnalysisView: React.FC<{ lists: ShoppingList[] }> = ({ lists }) => {
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedItemName, setSelectedItemName] = useState<string>('');

  const selectedLists = useMemo(() => 
    lists.filter(l => selectedListIds.includes(l.id))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateA.getTime() - dateB.getTime();
      }),
    [lists, selectedListIds]
  );

  const allItemNames = useMemo(() => {
    const names = new Set<string>();
    lists.forEach(l => l.items.forEach(i => names.add(i.name)));
    return Array.from(names).sort();
  }, [lists]);

  const totalValueData = useMemo(() => {
    return selectedLists.map(l => ({
      name: l.name,
      total: l.items.reduce((sum, item) => sum + getItemTotal(item), 0),
      date: l.date
    }));
  }, [selectedLists]);

  const priceHistoryData = useMemo(() => {
    if (!selectedItemName) return [];
    return selectedLists.map(l => {
      const item = l.items.find(i => i.name === selectedItemName);
      return {
        listName: l.name,
        date: l.date,
        price: item ? item.price : null,
        quantity: item ? item.quantity : 0
      };
    }).filter(d => d.price !== null);
  }, [selectedLists, selectedItemName]);

  const toggleList = (id: string) => {
    setSelectedListIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col h-full pb-20"
    >
      <header className="p-6 bg-white border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-slate-900">Análises</h1>
        <p className="text-slate-500 text-sm">Compare suas listas e acompanhe preços</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* List Selection */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ListTodo size={16} /> Selecionar Listas para Comparar
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => toggleList(list.id)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedListIds.includes(list.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-100 bg-white text-slate-600'
                }`}
              >
                <ListThumbnail image={list.image} name={list.name} className="w-10 h-10" />
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-sm">{list.name}</p>
                    {list.status === 'archived' && <Archive size={10} className="text-slate-400" />}
                  </div>
                  <p className="text-[10px] opacity-70">{list.date}</p>
                </div>
              </button>
            )) }
          </div>
        </section>

        {selectedListIds.length > 0 ? (
          <>
            {/* Total Value Comparison */}
            <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Comparativo de Valor Total</h2>
                <BarChart2 className="text-blue-500" size={20} />
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={totalValueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {totalValueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Price Variation */}
            <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">Variação de Preço por Item</h2>
                  <TrendingUp className="text-emerald-500" size={20} />
                </div>
                <select 
                  value={selectedItemName}
                  onChange={(e) => setSelectedItemName(e.target.value)}
                  className="w-full mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Selecione um item para analisar...</option>
                  {allItemNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {selectedItemName && priceHistoryData.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple Bar Chart for Quick Overview */}
                  <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={priceHistoryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[0, 'dataMax + 5']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Preço']}
                        />
                        <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                          {priceHistoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === priceHistoryData.length - 1 ? '#10b981' : '#cbd5e1'} />
                          ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Comparison List */}
                  <div className="space-y-3">
                    {priceHistoryData.map((data, index) => {
                      const prevPrice = index > 0 ? priceHistoryData[index - 1].price : null;
                      const diff = prevPrice !== null ? (data.price || 0) - (prevPrice || 0) : 0;
                      const diffPercent = prevPrice ? (diff / prevPrice) * 100 : 0;
                      const maxPrice = Math.max(...priceHistoryData.map(d => d.price || 0));
                      const barWidth = ((data.price || 0) / maxPrice) * 100;

                      return (
                        <div key={index} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{data.listName}</p>
                              <p className="text-[10px] text-slate-500">{data.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900">R$ {data.price?.toFixed(2)}</p>
                              {prevPrice !== null && (
                                <p className={`text-[10px] font-bold flex items-center justify-end gap-1 ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {diff > 0 ? '↑' : diff < 0 ? '↓' : ''} 
                                  {diff === 0 ? 'Sem alteração' : `R$ ${Math.abs(diff).toFixed(2)} (${Math.abs(diffPercent).toFixed(1)}%)`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              className={`h-full rounded-full ${diff > 0 ? 'bg-red-400' : diff < 0 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedItemName ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-slate-400 text-sm">Este item não foi encontrado nas listas selecionadas.</p>
                </div>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <p className="text-slate-400 text-sm">Selecione um item acima para ver o histórico de preços.</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <BarChart2 size={40} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-600">Nenhuma lista selecionada</p>
              <p className="text-slate-400 text-sm max-w-[200px]">Selecione duas ou mais listas acima para começar a comparar.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ProfileView: React.FC<{ 
  user: FirebaseUser | null, 
  onLogout: () => void,
  onBack: () => void
}> = ({ user, onLogout, onBack }) => {
  const [activeTab, setActiveTab] = useState<'MENU' | 'PERSONAL' | 'SECURITY' | 'NOTIFICATIONS' | 'HELP'>('MENU');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Personal Data States
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [username, setUsername] = useState('');

  // Security States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Notifications States
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUsername(data.username || '');
          if (data.firstName) setFirstName(data.firstName);
          if (data.lastName) setLastName(data.lastName);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await updateProfile(user, { displayName: fullName });
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        firstName,
        lastName,
        username,
        displayName: fullName,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => setActiveTab('MENU'), 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar dados.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setActiveTab('MENU'), 1500);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.code === 'auth/wrong-password' ? 'Senha atual incorreta.' : 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !user.email || !newEmail) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail);
      setMessage({ type: 'success', text: 'E-mail de verificação enviado para o novo endereço!' });
      setNewEmail('');
      setEmailPassword('');
      setTimeout(() => setActiveTab('MENU'), 2000);
    } catch (error: any) {
      console.error('Error updating email:', error);
      let errorMsg = 'Erro ao atualizar e-mail.';
      if (error.code === 'auth/wrong-password') errorMsg = 'Senha incorreta.';
      if (error.code === 'auth/invalid-email') errorMsg = 'E-mail inválido.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Este e-mail já está em uso.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 500000) { // 500KB limit for base64 updateProfile
      setMessage({ type: 'error', text: 'A imagem deve ter menos de 500KB.' });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        await updateProfile(user, { photoURL: base64String });
        
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: base64String });
        
        setMessage({ type: 'success', text: 'Foto atualizada!' });
      } catch (error) {
        console.error('Error uploading photo:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar foto.' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'PERSONAL':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">E-mail Cadastrado</label>
                <div className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center text-slate-500 text-sm">
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nome de Usuário</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  placeholder="@usuario"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nome</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Sobrenome</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full h-12 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all disabled:bg-blue-300"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        );
      case 'SECURITY':
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Alterar Senha</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Senha Atual</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nova Senha</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
                <button 
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full h-12 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all disabled:bg-blue-300"
                >
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Alterar E-mail</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Novo E-mail</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    placeholder="novo@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Senha para Confirmar</label>
                  <input 
                    type="password" 
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
                <button 
                  onClick={handleUpdateEmail}
                  disabled={loading}
                  className="w-full h-12 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all disabled:bg-slate-300"
                >
                  {loading ? 'Processando...' : 'Alterar E-mail'}
                </button>
              </div>
            </div>
          </div>
        );
      case 'NOTIFICATIONS':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <h4 className="font-bold text-slate-900">Notificações Push</h4>
                <p className="text-xs text-slate-500">Alertas de listas compartilhadas</p>
              </div>
              <button 
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pushEnabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <h4 className="font-bold text-slate-900">E-mails de Resumo</h4>
                <p className="text-xs text-slate-500">Relatórios semanais de gastos</p>
              </div>
              <button 
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${emailEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailEnabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        );
      case 'HELP':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-2">Central de Ajuda</h4>
              <p className="text-sm text-blue-700">Precisa de ajuda com suas listas? Entre em contato com nosso suporte.</p>
              <button className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg">Falar com Suporte</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button className="p-4 text-left bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700">Termos de Uso</button>
              <button className="p-4 text-left bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700">Política de Privacidade</button>
              <button className="p-4 text-left bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-700">Versão do App: 1.0.4</button>
            </div>
          </div>
        );
      default:
        return (
          <>
            <div className="space-y-2 mb-10">
              <ProfileMenuItem 
                icon={<User size={20} />} 
                label="Dados Pessoais" 
                onClick={() => setActiveTab('PERSONAL')} 
              />
              <ProfileMenuItem 
                icon={<Bell size={20} />} 
                label="Notificações" 
                onClick={() => setActiveTab('NOTIFICATIONS')} 
              />
              <ProfileMenuItem 
                icon={<Shield size={20} />} 
                label="Segurança" 
                onClick={() => setActiveTab('SECURITY')} 
              />
              <ProfileMenuItem 
                icon={<HelpCircle size={20} />} 
                label="Ajuda e Suporte" 
                onClick={() => setActiveTab('HELP')} 
              />
            </div>

            <button 
              onClick={onLogout}
              className="w-full h-14 border-2 border-red-100 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-[0.98]"
            >
              Sair da Conta <LogOut size={20} />
            </button>
          </>
        );
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full p-6 pb-24"
    >
      <header className="flex items-center justify-between mb-8">
        <button 
          onClick={activeTab === 'MENU' ? onBack : () => setActiveTab('MENU')} 
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold">
          {activeTab === 'MENU' ? 'Meu Perfil' : 
           activeTab === 'PERSONAL' ? 'Dados Pessoais' :
           activeTab === 'SECURITY' ? 'Segurança' :
           activeTab === 'NOTIFICATIONS' ? 'Notificações' : 'Ajuda'}
        </h2>
        <div className="w-10"></div>
      </header>

      {activeTab === 'MENU' && (
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full bg-blue-500 overflow-hidden flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-blue-500/20 border-4 border-white">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                displayName.substring(0, 2).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-1 right-1 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-500 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <h3 className="text-xl font-black text-slate-900">{displayName}</h3>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          {user && user.providerData.some(p => p.providerId === 'password') && (
            <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.emailVerified ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {user.emailVerified ? 'E-mail Verificado' : 'E-mail não verificado'}
            </div>
          )}
        </div>
      )}

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {message.text}
        </div>
      )}

      {renderContent()}
    </motion.div>
  );
}

function ProfileMenuItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
          {icon}
        </div>
        <span className="font-bold text-slate-700">{label}</span>
      </div>
      <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-all" />
    </button>
  );
}
