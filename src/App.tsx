/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  ShoppingCart, 
  Trash2,
  Pencil,
  CheckCircle,
  LogIn,
  Mail,
  Lock,
  Eye,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Category = 'Alimentos' | 'Higiene' | 'Limpeza' | 'Outros';

interface Item {
  id: string;
  name: string;
  category: Category;
  price: number;
  quantity: number;
}

interface ShoppingList {
  id: string;
  name: string;
  date: string;
  items: Item[];
  image: string;
  description?: string;
}

type View = 'LOGIN' | 'LIST_OVERVIEW' | 'LIST_DETAILS' | 'ADD_ITEM' | 'EDIT_ITEM' | 'CREATE_LIST' | 'EDIT_LIST';

// --- Mock Data ---

const INITIAL_LISTS: ShoppingList[] = [
  {
    id: '1',
    name: 'Churrasco de Domingo',
    date: 'Oct 24, 2023',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDQ61w2sEhX6OPWKdCKNZ7LuPbYPVDWjZuXPSqUZt34bXnG1CdEWj9jrF_F311FCr5YxOS71VSPnfvNwdCk9xjCjXvhw32AdMWY7aD-usNpnlPoYgMuTatWzA2xYEP0fWaM0OyDnaB5nlnFDWAWjWBUl74gAuth95Df1bQpxwKZ6BwB9Lwkcpv6y0nie8eNPd7rLnwpN6Z4YUbWvZzo5rxDaY6aQuRipAm7aCeF4IsSMcHEMPug_W2KZUNwn3E2y64Xz--h0ayGwgW',
    items: [
      { id: 'i1', name: 'Picanha 1kg', category: 'Alimentos', price: 89.90, quantity: 2 },
      { id: 'i2', name: 'Carvão 5kg', category: 'Outros', price: 25.00, quantity: 1 },
    ]
  },
  {
    id: '2',
    name: 'Compras do Mês',
    date: 'Oct 20, 2023',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAln8T0xH2XeW7smw9tbi1laj5UVAAhA3lWT1atp9XHD7valGvwZYKHh45PTnqjOHN6utTMfV8ZZqLFbkT-O4rMYTyH4CkOkMEKwvKhUoy0tGfuB9hJbrOk34KSxbDCHaPPOa7PHxovW0KICide6HKq2zknQ0M6P2IHQpLmeCN1zlAZ-fz_TWPKpOiTOSqzdYwe241V80lJdKCB-MVvTBbsC35ItRRwcju1TiaG9p0GLDdthVM79ibtq351Jn25od-edtyl6K_3uhR4',
    items: [
      { id: 'i3', name: 'Arroz Integral 5kg', category: 'Alimentos', price: 25.90, quantity: 1 },
      { id: 'i4', name: 'Detergente de Coco', category: 'Limpeza', price: 2.50, quantity: 3 },
    ]
  },
  {
    id: '3',
    name: 'Produtos de Limpeza',
    date: 'Oct 18, 2023',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCji3Wm6TfXB5rv_QsGmjIStw8mzdH5cn1mi1MZiX-WidkOAzlQGmu3YPYVarBhzBi2YWlvJ__6ZYr7mr2bMWPZfmU7IgiSNQbOMJlfwYWa5TwcdkRir2lIoK1N5jHirymJtD6xbcj_mP0bMAYkLPJqek7kyOdalBVodq2HEXZo49lGWc4ZFk2pvYVx_kLCC5SQUMu8mQSMv8KQOYkY4en5jwPcgQ_j3ILBZx1E-VQ3X32XIoTN-iHzJfvf0qbZY0vPxEWzDpsp-gRW',
    items: [
      { id: 'i5', name: 'Sabonete Líquido Refil', category: 'Higiene', price: 12.40, quantity: 1 },
    ]
  }
];

// --- Components ---

export default function App() {
  const [currentView, setCurrentView] = useState<View>('LOGIN');
  const [lists, setLists] = useState<ShoppingList[]>(INITIAL_LISTS);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  const handleSaveList = (listData: Partial<ShoppingList>) => {
    if (currentView === 'EDIT_LIST' && selectedListId) {
      setLists(lists.map(l => l.id === selectedListId ? { ...l, ...listData } : l));
    } else {
      const newList: ShoppingList = {
        id: Math.random().toString(36).substr(2, 9),
        name: listData.name || '',
        description: listData.description || '',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        image: listData.image || 'https://picsum.photos/seed/' + Math.random() + '/400/400',
        items: []
      };
      setLists([newList, ...lists]);
    }
    setCurrentView('LIST_OVERVIEW');
  };

  const handleDeleteList = (id: string) => {
    setLists(lists.filter(l => l.id !== id));
    if (selectedListId === id) setSelectedListId(null);
  };

  const handleSaveItem = (itemData: Partial<Item>) => {
    if (!selectedListId) return;
    
    setLists(lists.map(l => {
      if (l.id !== selectedListId) return l;
      
      let newItems;
      if (currentView === 'EDIT_ITEM' && selectedItemId) {
        newItems = l.items.map(i => i.id === selectedItemId ? { ...i, ...itemData } : i);
      } else {
        const newItem: Item = {
          id: Math.random().toString(36).substr(2, 9),
          name: itemData.name || '',
          category: itemData.category || 'Outros',
          price: itemData.price || 0,
          quantity: itemData.quantity || 1
        };
        newItems = [...l.items, newItem];
      }
      return { ...l, items: newItems };
    }));
    setCurrentView('LIST_DETAILS');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedListId) return;
    setLists(lists.map(l => 
      l.id === selectedListId 
        ? { ...l, items: l.items.filter(i => i.id !== itemId) } 
        : l
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
        <AnimatePresence mode="wait">
          {currentView === 'LOGIN' && (
            <LoginView key="login" onLogin={() => navigateTo('LIST_OVERVIEW')} />
          )}
          {currentView === 'LIST_OVERVIEW' && (
            <ListView 
              key="overview" 
              lists={lists} 
              onSelectList={(id) => navigateTo('LIST_DETAILS', id)}
              onCreateList={() => navigateTo('CREATE_LIST')}
              onEditList={(id) => navigateTo('EDIT_LIST', id)}
              onDeleteList={handleDeleteList}
            />
          )}
          {currentView === 'LIST_DETAILS' && selectedList && (
            <DetailsView 
              key="details" 
              list={selectedList} 
              onBack={() => navigateTo('LIST_OVERVIEW')}
              onAddItem={() => navigateTo('ADD_ITEM')}
              onEditItem={(itemId) => navigateTo('EDIT_ITEM', selectedListId, itemId)}
              onDeleteItem={handleDeleteItem}
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
        {(currentView === 'LIST_OVERVIEW' || currentView === 'LIST_DETAILS') && (
          <nav className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center h-20 px-4 z-50">
            <NavItem icon={<Home size={24} />} label="Início" active={currentView === 'LIST_OVERVIEW'} onClick={() => navigateTo('LIST_OVERVIEW')} />
            <NavItem icon={<ListTodo size={24} />} label="Listas" active={currentView === 'LIST_DETAILS'} onClick={() => {}} />
            <NavItem icon={<Tag size={24} />} label="Ofertas" onClick={() => {}} />
            <NavItem icon={<User size={24} />} label="Perfil" onClick={() => {}} />
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

function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-6"
    >
      <div className="flex items-center justify-between mb-8">
        <button className="p-2 -ml-2 rounded-full hover:bg-slate-100"><ArrowLeft size={24} /></button>
        <h2 className="text-lg font-bold">Entrar</h2>
        <div className="w-10"></div>
      </div>

      <div className="relative aspect-[3/2] rounded-2xl bg-blue-50 overflow-hidden mb-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent"></div>
        <div className="z-10 flex flex-col items-center">
          <ShoppingBasket size={80} className="text-blue-500 mb-2" />
          <div className="h-1.5 w-24 bg-blue-500/20 rounded-full"></div>
        </div>
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCd0V5S3v4YVXmtAf6bl7V58F3o9owqL59suZx6yrXeDrWislC9itGAdQzNiKs406AKPdhNXhsGXukLIgHx_Ab32MHV_Xr_CLK1Q3mhUNXtNQDlwmArRQCJHuGSQ_zKvp9ji_ENaf2yRnIvxEAv770Noo_cxmwo8mQw5-3De2YZ0W3AmyxSwkDw62SQJ5PUjs85wxMt5NzfaaTQTpAqtMIHuKyaCQ6siomlw8U9gyxu0Ia81iZyKI2j28HJmukfn3Bej6Uhazsk7nAf" 
          alt="Grocery basket"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
      </div>

      <p className="text-slate-500 text-center mb-8">Faça login para sincronizar suas listas de compras em todos os seus dispositivos</p>

      <div className="space-y-4 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" 
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
              placeholder="Digite sua senha" 
              className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
            <Eye className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" size={20} />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="text-blue-500 text-sm font-semibold hover:underline">Esqueceu a senha?</button>
        </div>
      </div>

      <button 
        onClick={onLogin}
        className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mb-8 active:scale-[0.98]"
      >
        Entrar <LogIn size={20} />
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-slate-200"></div>
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ou continue com</span>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      <div className="flex gap-4 mb-8">
        <button className="flex-1 h-14 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span className="font-semibold text-sm">Google</span>
        </button>
        <button className="flex-1 h-14 border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <Smartphone size={20} />
          <span className="font-semibold text-sm">Apple</span>
        </button>
      </div>

      <p className="text-center text-slate-500 text-sm mt-auto">
        Não tem uma conta? <button className="text-blue-500 font-bold hover:underline">Criar conta</button>
      </p>
    </motion.div>
  );
}

function ListView({ lists, onSelectList, onCreateList, onEditList, onDeleteList }: { 
  lists: ShoppingList[], 
  onSelectList: (id: string) => void, 
  onCreateList: () => void,
  onEditList: (id: string) => void,
  onDeleteList: (id: string) => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full pb-24"
    >
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100">
        <div className="p-2 rounded-full bg-blue-50 text-blue-500"><Menu size={24} /></div>
        <h1 className="text-lg font-bold flex-1 ml-4">Minhas Listas</h1>
        <button className="p-2 rounded-full bg-slate-100 text-slate-600"><Search size={24} /></button>
      </header>

      <div className="px-4 pt-4 mb-4">
        <div className="flex border-b border-slate-100 gap-8">
          <button className="pb-3 border-b-2 border-blue-500 text-blue-500 font-bold text-sm">Ativas</button>
          <button className="pb-3 border-b-2 border-transparent text-slate-400 font-medium text-sm">Arquivadas</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {lists.map(list => (
          <div 
            key={list.id}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
            onClick={() => onSelectList(list.id)}
          >
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 mb-1">{list.name}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditList(list.id); }}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">{list.date} • R$ {list.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</p>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors">Abrir</button>
                <span className="text-[10px] text-slate-400 font-medium uppercase">{list.items.length} itens</span>
              </div>
            </div>
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
              <img src={list.image} alt={list.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onCreateList}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 z-50"
      >
        <Plus size={32} />
      </button>
    </motion.div>
  );
}

function DetailsView({ list, onBack, onAddItem, onEditItem, onDeleteItem }: { 
  list: ShoppingList, 
  onBack: () => void, 
  onAddItem: () => void,
  onEditItem: (id: string) => void,
  onDeleteItem: (id: string) => void
}) {
  const total = list.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalItems = list.items.reduce((acc, i) => acc + i.quantity, 0);

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
        <button className="p-2 rounded-full hover:bg-slate-100 text-blue-500"><MoreVertical size={24} /></button>
      </header>

      <div className="p-4">
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
                  <span className="text-xs text-slate-400">{item.quantity} un</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button 
            onClick={onAddItem}
            className="flex items-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-50 transition-colors"
          >
            <Plus size={20} /> Adicionar mais
          </button>
        </div>
      </div>

      <footer className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
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
    </motion.div>
  );
}

function AddItemView({ onBack, onSave, initialData }: { 
  onBack: () => void, 
  onSave: (item: Partial<Item>) => void,
  initialData?: Item
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Alimentos');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);

  const handleSave = () => {
    if (!name || !price) return;
    onSave({
      name,
      category,
      price: parseFloat(price),
      quantity
    });
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

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Minus size={20} />
            </button>
            <span className="font-bold text-lg min-w-[20px] text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
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
          <span className="text-xl font-black text-blue-500">R$ {(parseFloat(price || '0') * quantity).toFixed(2)}</span>
        </div>
        <button 
          onClick={handleSave}
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus size={20} /> Adicionar à Lista
        </button>
      </footer>
    </motion.div>
  );
}

function CreateListView({ onBack, onSave, initialData }: { 
  onBack: () => void, 
  onSave: (list: Partial<ShoppingList>) => void,
  initialData?: ShoppingList
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSave = () => {
    if (!name) return;
    onSave({
      name,
      description,
    });
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
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Plus size={48} />
          </div>
        </div>

        <div className="space-y-6">
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
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <CheckCircle size={20} /> {initialData ? 'Salvar Alterações' : 'Criar Lista'}
        </button>
      </footer>
    </motion.div>
  );
}
