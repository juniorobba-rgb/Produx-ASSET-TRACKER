import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, ShieldAlert, UserPlus } from 'lucide-react';

export function Settings() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState('');

  // Add user state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubTypes = onSnapshot(query(collection(db, 'assetTypes')), (snapshot) => {
      setAssetTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'assetTypes'));

    return () => {
      unsubUsers();
      unsubTypes();
    };
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500/50" />
        <h2 className="text-xl font-bold text-white mb-2">Accès Refusé</h2>
        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      </div>
    );
  }

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypePrice) return;

    const typeId = newTypeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await setDoc(doc(db, 'assetTypes', typeId), {
        name: newTypeName.trim(),
        defaultPrice: Number(newTypePrice),
        createdAt: new Date().toISOString()
      });
      setNewTypeName('');
      setNewTypePrice('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `assetTypes/${typeId}`);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!window.confirm('Supprimer ce type d\'asset ?')) return;
    try {
      await deleteDoc(doc(db, 'assetTypes', typeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assetTypes/${typeId}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!newUserEmail.trim()) {
      setUserError('L\'email est requis.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      setUserError('Format d\'email invalide.');
      return;
    }

    const emailId = newUserEmail.trim().toLowerCase();
    
    try {
      const userRef = doc(db, 'users', emailId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        setUserError('Un utilisateur avec cet email existe déjà.');
        return;
      }

      await setDoc(userRef, {
        uid: '', // Will be populated when they log in
        email: emailId,
        displayName: newUserName.trim() || 'Anonymous',
        role: newUserRole,
        createdAt: new Date().toISOString()
      });

      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('user');
      setUserSuccess('Utilisateur ajouté avec succès. Il peut se connecter avec son email et le mot de passe "1234".');
      
      setTimeout(() => setUserSuccess(''), 8000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${emailId}`);
      setUserError('Erreur lors de la création de l\'utilisateur.');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'junior.obba@gmail.com') {
      alert('Impossible de supprimer l\'administrateur principal.');
      return;
    }
    if (!window.confirm(`Supprimer l'utilisateur ${userEmail} ?`)) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Paramètres Admin</h1>
        <p className="text-slate-400 mt-2">Gérez les types d'assets et les permissions utilisateurs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Asset Types Management */}
        <Card>
          <CardHeader>
            <CardTitle>Types d'Assets & Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCreateType} className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-400">Nom du type</label>
                <Input 
                  placeholder="Ex: Vidéo 30s" 
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
              </div>
              <div className="w-32 space-y-2">
                <label className="text-xs font-medium text-slate-400">Tarif (€)</label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00" 
                  value={newTypePrice}
                  onChange={(e) => setNewTypePrice(e.target.value)}
                />
              </div>
              <Button type="submit" className="mb-[1px]">
                <Plus className="w-5 h-5" />
              </Button>
            </form>

            <div className="space-y-2">
              {assetTypes.map(type => (
                <div key={type.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium text-white">{type.name}</p>
                    <p className="text-sm font-mono text-slate-400">{formatCurrency(type.defaultPrice)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteType(type.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {assetTypes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Aucun type d'asset défini.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Management */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Ajouter un utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                {userError && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    {userError}
                  </div>
                )}
                {userSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">
                    {userSuccess}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Email Google</label>
                  <Input 
                    type="email"
                    placeholder="utilisateur@gmail.com" 
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Nom (Optionnel)</label>
                    <Input 
                      placeholder="Jean Dupont" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Rôle</label>
                    <Select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Pré-autoriser l'utilisateur
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs existants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-medium text-white">
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{user.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select 
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="w-24 h-8 py-1 text-xs"
                        disabled={user.email === 'junior.obba@gmail.com'}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteUser(user.id, user.email)} 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 h-8"
                        disabled={user.email === 'junior.obba@gmail.com'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
